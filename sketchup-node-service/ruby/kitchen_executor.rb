#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

module FurniturePlatform
  module KitchenExecutor
    module_function

    def run(queue_dir:, job_id:)
      ensure_sketchup_api!
      queue_dir = KitchenGeometry.absolute_queue_dir!(queue_dir)
      job_id = KitchenPlanValidator.safe_job_id!(job_id)

      request_path = File.join(queue_dir, "inbox", "#{job_id}.json")
      approval_path = File.join(queue_dir, "approvals", "#{job_id}.json")

      request = read_json!(request_path, "Request")
      KitchenPlanValidator.validate_request!(request, job_id)

      approval = read_json!(approval_path, "Approval")
      KitchenPlanValidator.validate_approval!(approval, job_id, clean(request["requestedBy"]))

      plan = request["commandPlan"]
      validate_layout_support!(plan)

      artifact_dir = File.join(queue_dir, "artifacts", job_id)
      FileUtils.mkdir_p(artifact_dir)
      model_path = File.join(artifact_dir, KitchenArtifactPublisher::SKP_FILENAME)
      preview_path = File.join(artifact_dir, KitchenArtifactPublisher::PREVIEW_FILENAME)

      model = create_or_open_model(job_id)
      execute_plan!(model, plan, job_id)
      KitchenArtifactPublisher.ensure_scene(model)
      KitchenArtifactPublisher.save_model(model, model_path)
      KitchenArtifactPublisher.export_preview(model, preview_path)

      artifacts = KitchenArtifactPublisher.build_artifact_list(job_id, has_preview: true)
      KitchenArtifactPublisher.verify_artifacts(artifact_dir, job_id, artifacts)
      KitchenArtifactPublisher.publish_outbox(queue_dir, job_id, artifacts)
    end

    def execute_plan!(model, plan, job_id)
      commands = plan["commands"] || []
      commands.each do |cmd|
        cmd["jobId"] = job_id
        case cmd["type"]
        when "set_units_mm"
          KitchenGeometry.set_units_mm(model)
        when "create_room_envelope"
          KitchenGeometry.create_room_envelope(model, cmd)
        when "place_block_module"
          if cmd["zone"] == "wall"
            KitchenGeometry.place_wall_module(model, cmd)
          else
            KitchenGeometry.place_base_module(model, cmd)
          end
        when "place_block_appliance"
          KitchenGeometry.place_appliance(model, cmd)
        end
      end
    end

    def validate_layout_support!(plan)
      commands = plan["commands"] || []
      envelope = commands.find { |c| c["type"] == "create_room_envelope" }
      return unless envelope
      layout = envelope["layout"].to_s.downcase
      return if layout.empty? || KitchenComponentRegistry.supported_layout?(layout)
      raise "Unsupported layout '#{layout}'. Supported: #{KitchenComponentRegistry::SUPPORTED_LAYOUTS.join(', ')}."
    end

    def create_or_open_model(job_id)
      if defined?(Sketchup) && Sketchup.respond_to?(:active_model)
        model = Sketchup.active_model
        return model if model
      end
      if defined?(Sketchup) && Sketchup.respond_to?(:open_file)
        model = Sketchup.model
        return model if model
      end
      # Fallback: create in-memory (works with SketchUp API)
      if defined?(Sketchup) && Sketchup.respond_to?(:new_model)
        return Sketchup.new_model
      end
      raise "SketchUp API is not available."
    end

    def ensure_sketchup_api!
      raise "SketchUp Ruby API is required." unless defined?(Sketchup)
    end

    def read_json!(path, label)
      raise "#{label} file not found: #{path}" unless File.exist?(path)
      data = File.read(path)
      raise "#{label} is empty: #{path}" if data.to_s.strip.empty?
      JSON.parse(data)
    rescue JSON::ParserError => e
      raise "#{label} is not valid JSON: #{e.message}"
    end

    def clean(value)
      value.to_s.strip
    end
  end
end

# Allow standalone use when loaded inside SketchUp 2026
if __FILE__ == $PROGRAM_NAME
  puts "Kitchen Executor for SketchUp 2026"
  puts "Usage: load this file inside SketchUp Ruby Console and call:"
  puts '  FurniturePlatform::KitchenExecutor.run(queue_dir: "C:/path/to/queue", job_id: "job-xxx")'
end
