#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

SAFE_ID = /\A[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}\z/
ALLOWED_COMMANDS = %w[set_units create_envelope attach_metadata].freeze
KITCHEN_COMMANDS = %w[set_units_mm create_room_envelope place_block_module place_block_appliance].freeze
MODEL_FILENAMES = %w[model.skp].freeze
PREVIEW_FILENAMES = %w[preview.webp preview.png preview.jpg preview.jpeg].freeze
RENDER_FILENAMES = %w[render-main.webp render-main.png render-main.jpg render-main.jpeg render.webp render.png render.jpg render.jpeg].freeze

def fail_with(message)
  warn(message)
  exit(1)
end

def clean(value)
  value.nil? ? "" : value.to_s.strip
end

def safe_job_id!(value)
  job_id = clean(value)
  fail_with("A safe jobId is required.") unless SAFE_ID.match?(job_id)
  job_id
end

def read_json!(path, label)
  JSON.parse(File.read(path, encoding: "UTF-8"))
rescue Errno::ENOENT
  fail_with("#{label} file is missing: #{path}")
rescue JSON::ParserError
  fail_with("#{label} file must contain valid JSON: #{path}")
end

def validate_request!(request, job_id)
  fail_with("Request must be a JSON object.") unless request.is_a?(Hash)
  fail_with("Unsupported bridgeVersion.") unless request["bridgeVersion"] == "furniture-sketchup-file-queue/v1"
  fail_with("Request jobId mismatch.") unless clean(request["jobId"]) == job_id
  fail_with("Manager identity is required.") if clean(request["requestedBy"]).empty?

  plan = request["commandPlan"]
  fail_with("Command plan must be a JSON object.") unless plan.is_a?(Hash)
  plan_version = plan["planVersion"]
  unless plan_version == "sketchup-command-plan/v1" || plan_version == "kitchen-command-plan/v1"
    fail_with("Unsupported command plan version: #{plan_version}")
  end
  commands = plan["commands"]
  fail_with("Command plan commands must be an array.") unless commands.is_a?(Array)

  allowed = plan_version == "kitchen-command-plan/v1" ? KITCHEN_COMMANDS : ALLOWED_COMMANDS
  commands.each do |command|
    fail_with("Command must be a JSON object.") unless command.is_a?(Hash)
    type = clean(command["type"])
    fail_with("Unsupported command type: #{type}") unless allowed.include?(type)
  end

  request
end

def validate_approval!(approval, job_id, requested_by)
  fail_with("Approval must be a JSON object.") unless approval.is_a?(Hash)
  fail_with("Manager approval is required.") unless approval["approved"] == true
  fail_with("Approval jobId mismatch.") unless clean(approval["jobId"]) == job_id
  fail_with("Approval manager mismatch.") unless clean(approval["requestedBy"]) == requested_by
  fail_with("Approval timestamp is required.") if clean(approval["approvedAt"]).empty?
  Time.iso8601(clean(approval["approvedAt"]))
rescue ArgumentError
  fail_with("Approval timestamp must be ISO-8601.")
end

def safe_existing_artifact(queue_dir, job_id, filename, type)
  artifact_dir = File.expand_path(File.join(queue_dir, "artifacts", job_id))
  path = File.expand_path(File.join(artifact_dir, filename))
  return nil unless path.start_with?(artifact_dir + File::SEPARATOR)
  return nil unless File.file?(path)

  { "type" => type, "reference" => "artifacts/#{job_id}/#{filename}" }
end

def collect_artifacts!(queue_dir, job_id)
  model = MODEL_FILENAMES.filter_map { |filename| safe_existing_artifact(queue_dir, job_id, filename, "skp") }.first
  fail_with("A generated model.skp artifact is required before writing outbox.") unless model

  previews = PREVIEW_FILENAMES.filter_map { |filename| safe_existing_artifact(queue_dir, job_id, filename, "preview") }
  renders = RENDER_FILENAMES.filter_map { |filename| safe_existing_artifact(queue_dir, job_id, filename, "render") }
  fail_with("At least one generated preview or render artifact is required before writing outbox.") if previews.empty? && renders.empty?

  [model] + previews + renders
end

def write_outbox!(queue_dir, job_id, artifacts)
  outbox_dir = File.join(queue_dir, "outbox")
  FileUtils.mkdir_p(outbox_dir)
  output = {
    "jobId" => job_id,
    "status" => "executed",
    "executed" => true,
    "artifacts" => artifacts,
    "message" => "SketchUp queue consumer published validated model/render artifacts."
  }
  target = File.join(outbox_dir, "#{job_id}.json")
  temporary = "#{target}.#{$PROCESS_ID}.tmp"
  File.write(temporary, JSON.generate(output) + "\n", mode: "wx", encoding: "UTF-8")
  File.rename(temporary, target)
  output
end

queue_dir = File.expand_path(ARGV[0] || "")
job_id = safe_job_id!(ARGV[1])
fail_with("An absolute queue directory is required.") unless !queue_dir.empty? && File.absolute_path(queue_dir) == queue_dir

request = validate_request!(read_json!(File.join(queue_dir, "inbox", "#{job_id}.json"), "Request"), job_id)
approval = read_json!(File.join(queue_dir, "approvals", "#{job_id}.json"), "Approval")
validate_approval!(approval, job_id, clean(request["requestedBy"]))

plan_version = request.dig("commandPlan", "planVersion")
case plan_version
when "kitchen-command-plan/v1"
  fail_with("Kitchen plans are not supported by this queue consumer. Use kitchen_executor.rb instead.")
when "sketchup-command-plan/v1"
  artifacts = collect_artifacts!(queue_dir, job_id)
  puts JSON.pretty_generate(write_outbox!(queue_dir, job_id, artifacts))
else
  fail_with("Unknown plan version: #{plan_version}")
end
