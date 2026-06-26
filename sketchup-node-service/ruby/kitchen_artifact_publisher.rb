# frozen_string_literal: true

require "json"
require "fileutils"

module FurniturePlatform
  module KitchenArtifactPublisher
    SKP_FILENAME = "model.skp"
    PREVIEW_FILENAME = "preview.png"

    module_function

    def save_model(model, model_path)
      raise "Model is required." unless model.respond_to?(:save)
      FileUtils.mkdir_p(File.dirname(model_path))
      model.save(model_path)
      raise "Model file was not created: #{model_path}" unless File.exist?(model_path)
      true
    end

    def export_preview(model, preview_path, width: 1280, height: 720)
      raise "Model is required." unless model.respond_to?(:save)
      return false unless model.respond_to?(:active_view)

      view = model.active_view
      return false unless view

      FileUtils.mkdir_p(File.dirname(preview_path))
      view.write_image(preview_path, width, height, false, 0)
      raise "Preview was not created: #{preview_path}" unless File.exist?(preview_path)
      true
    end

    def verify_artifacts(artifact_dir, job_id, files)
      errors = []
      files.each do |entry|
        path = File.join(artifact_dir, entry["reference"].to_s)
        unless File.exist?(path)
          errors << "Missing artifact: #{entry["reference"]}"
        end
      end
      raise errors.join("; ") unless errors.empty?
      true
    end

    def publish_outbox(queue_dir, job_id, artifacts)
      outbox = {
        "jobId" => job_id,
        "status" => "executed",
        "executed" => true,
        "artifacts" => artifacts
      }

      outbox_path = File.join(queue_dir, "outbox", "#{job_id}.json")
      FileUtils.mkdir_p(File.dirname(outbox_path))

      # Atomic write via temp file
      tmp_path = "#{outbox_path}.tmp"
      File.write(tmp_path, JSON.generate(outbox))
      File.rename(tmp_path, outbox_path)

      outbox
    end

    def build_artifact_list(job_id, has_preview: true, render_count: 0)
      artifacts = [{ "type" => "skp", "reference" => "artifacts/#{job_id}/#{SKP_FILENAME}" }]
      artifacts << { "type" => "preview", "reference" => "artifacts/#{job_id}/#{PREVIEW_FILENAME}" } if has_preview
      render_count.times do |i|
        artifacts << { "type" => "render", "reference" => "artifacts/#{job_id}/render-#{i + 1}.png" }
      end
      artifacts
    end
  end
end
