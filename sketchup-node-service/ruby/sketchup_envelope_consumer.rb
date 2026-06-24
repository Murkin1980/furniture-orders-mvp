#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

module FurniturePlatform
  module SketchUpEnvelopeConsumer
    SAFE_ID = /\A[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}\z/
    ALLOWED_COMMANDS = %w[set_units create_envelope attach_metadata].freeze
    BRIDGE_VERSION = "furniture-sketchup-file-queue/v1"
    PLAN_VERSION = "sketchup-command-plan/v1"

    module_function

    def run(queue_dir:, job_id:)
      ensure_sketchup_api!
      queue_dir = absolute_queue_dir!(queue_dir)
      job_id = safe_job_id!(job_id)
      request = validate_request!(read_json!(File.join(queue_dir, "inbox", "#{job_id}.json"), "Request"), job_id)
      validate_approval!(
        read_json!(File.join(queue_dir, "approvals", "#{job_id}.json"), "Approval"),
        job_id,
        clean(request["requestedBy"])
      )

      artifact_dir = File.join(queue_dir, "artifacts", job_id)
      FileUtils.mkdir_p(artifact_dir)
      model_path = File.join(artifact_dir, "model.skp")
      preview_path = File.join(artifact_dir, "preview.png")

      build_envelope_model!(request["commandPlan"], model_path, preview_path)
      write_outbox!(queue_dir, job_id, [
        { "type" => "skp", "reference" => "artifacts/#{job_id}/model.skp" },
        { "type" => "preview", "reference" => "artifacts/#{job_id}/preview.png" }
      ])
    end

    def build_envelope_model!(plan, model_path, preview_path)
      envelope = plan["commands"].find { |command| command["type"] == "create_envelope" }
      metadata = plan["commands"].find { |command| command["type"] == "attach_metadata" } || {}
      dimensions = envelope.fetch("dimensions")
      width = dimensions.fetch("widthMm").to_f.mm
      height = dimensions.fetch("heightMm").to_f.mm
      depth = dimensions.fetch("depthMm").to_f.mm

      model = Sketchup.active_model
      model.start_operation("Furniture Platform Envelope", true)
      entities = model.active_entities
      group = entities.add_group
      face = group.entities.add_face(
        [0, 0, 0],
        [width, 0, 0],
        [width, depth, 0],
        [0, depth, 0]
      )
      face.reverse! if face.normal.z < 0
      face.pushpull(height)
      group.name = safe_label(metadata["furnitureType"], "Furniture envelope")
      group.set_attribute("FurniturePlatform", "source", "sketchup-command-plan/v1")
      group.set_attribute("FurniturePlatform", "furnitureType", clean(metadata["furnitureType"]))
      group.set_attribute("FurniturePlatform", "components", JSON.generate(string_array(metadata["components"])))
      group.set_attribute("FurniturePlatform", "materials", JSON.generate(string_array(metadata["materials"])))
      group.set_attribute("FurniturePlatform", "notes", JSON.generate(string_array(metadata["notes"])))
      model.commit_operation

      model.save_copy(model_path)
      model.active_view.zoom_extents
      model.active_view.write_image(preview_path, 1200, 900, true, 0.9)
    rescue StandardError
      model.abort_operation if defined?(model) && model
      raise
    end

    def ensure_sketchup_api!
      raise "SketchUp Ruby API is required." unless defined?(Sketchup) && defined?(Geom)
    end

    def validate_request!(request, job_id)
      raise "Request must be a JSON object." unless request.is_a?(Hash)
      raise "Unsupported bridgeVersion." unless request["bridgeVersion"] == BRIDGE_VERSION
      raise "Request jobId mismatch." unless clean(request["jobId"]) == job_id
      raise "Manager identity is required." if clean(request["requestedBy"]).empty?

      plan = request["commandPlan"]
      raise "Command plan must be a JSON object." unless plan.is_a?(Hash)
      raise "Unsupported command plan version." unless plan["planVersion"] == PLAN_VERSION
      commands = plan["commands"]
      raise "Command plan commands must be an array." unless commands.is_a?(Array)
      raise "Command plan must contain exactly three commands." unless commands.length == 3
      commands.each do |command|
        raise "Command must be a JSON object." unless command.is_a?(Hash)
        raise "Unsupported command type." unless ALLOWED_COMMANDS.include?(clean(command["type"]))
      end
      raise "Envelope command is required." unless commands.any? { |command| command["type"] == "create_envelope" }

      plan
      request
    end

    def validate_approval!(approval, job_id, requested_by)
      raise "Approval must be a JSON object." unless approval.is_a?(Hash)
      raise "Manager approval is required." unless approval["approved"] == true
      raise "Approval jobId mismatch." unless clean(approval["jobId"]) == job_id
      raise "Approval manager mismatch." unless clean(approval["requestedBy"]) == requested_by
      Time.iso8601(clean(approval["approvedAt"]))
    rescue ArgumentError
      raise "Approval timestamp must be ISO-8601."
    end

    def write_outbox!(queue_dir, job_id, artifacts)
      outbox_dir = File.join(queue_dir, "outbox")
      FileUtils.mkdir_p(outbox_dir)
      payload = {
        "jobId" => job_id,
        "status" => "executed",
        "executed" => true,
        "artifacts" => artifacts,
        "message" => "SketchUp envelope consumer generated a model and preview."
      }
      target = File.join(outbox_dir, "#{job_id}.json")
      temporary = "#{target}.#{$PROCESS_ID}.tmp"
      File.write(temporary, JSON.generate(payload) + "\n", mode: "wx", encoding: "UTF-8")
      File.rename(temporary, target)
      payload
    end

    def read_json!(path, label)
      JSON.parse(File.read(path, encoding: "UTF-8"))
    rescue Errno::ENOENT
      raise "#{label} file is missing: #{path}"
    rescue JSON::ParserError
      raise "#{label} file must contain valid JSON: #{path}"
    end

    def absolute_queue_dir!(value)
      directory = File.expand_path(clean(value))
      raise "An absolute queue directory is required." unless !directory.empty? && File.absolute_path(directory) == directory
      directory
    end

    def safe_job_id!(value)
      job_id = clean(value)
      raise "A safe jobId is required." unless SAFE_ID.match?(job_id)
      job_id
    end

    def safe_label(value, fallback)
      label = clean(value)
      label.empty? ? fallback : label[0, 80]
    end

    def string_array(value)
      value.is_a?(Array) ? value.map { |item| clean(item) }.reject(&:empty?) : []
    end

    def clean(value)
      value.nil? ? "" : value.to_s.strip
    end
  end
end
