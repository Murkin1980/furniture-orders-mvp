#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

SAFE_ID = /\A[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}\z/
STANDARD_COMMANDS = %w[set_units create_envelope attach_metadata].freeze
KITCHEN_COMMANDS = %w[set_units_mm create_room_envelope place_block_module place_block_appliance].freeze
SUPPORTED_STANDARD = "sketchup-command-plan/v1"
SUPPORTED_KITCHEN  = "kitchen-command-plan/v1"

class UnsupportedPlanType < StandardError; end

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

def route_plan(queue_dir, job_id)
  inbox = read_json!(File.join(queue_dir, "inbox", "#{job_id}.json"), "Inbox")
  plan = inbox["commandPlan"]
  fail_with("Command plan is required.") unless plan.is_a?(Hash)
  plan_version = plan["planVersion"].to_s

  approval = read_json!(File.join(queue_dir, "approvals", "#{job_id}.json"), "Approval")
  validate_approval!(approval, job_id, clean(inbox["requestedBy"]))

  case plan_version
  when SUPPORTED_STANDARD
    execute_standard_envelope(queue_dir, job_id, inbox)
  when SUPPORTED_KITCHEN
    execute_kitchen(queue_dir, job_id, inbox)
  else
    raise UnsupportedPlanType,
      "Unsupported plan type/version: #{plan_version}. " \
      "Expected: #{SUPPORTED_STANDARD} (envelope) or #{SUPPORTED_KITCHEN} (kitchen)."
  end
end

def validate_approval!(approval, job_id, requested_by)
  fail_with("Approval must be a JSON object.") unless approval.is_a?(Hash)
  fail_with("Manager approval is required.") unless approval["approved"] == true
  fail_with("Approval jobId mismatch.") unless clean(approval["jobId"]) == job_id
  fail_with("Approval manager mismatch.") unless clean(approval["requestedBy"]) == requested_by
  Time.iso8601(clean(approval["approvedAt"]))
rescue ArgumentError
  fail_with("Approval timestamp must be ISO-8601.")
end

def execute_standard_envelope(queue_dir, job_id, inbox)
  $stderr.puts "Queue consumer: routing standard plan to envelope scaffold."
  require File.join(File.dirname(__FILE__), "sketchup_envelope_consumer.rb")
  FurniturePlatform::SketchUpEnvelopeConsumer.run(queue_dir: queue_dir, job_id: job_id)
rescue FurniturePlatform::SketchUpEnvelopeConsumer::UnsupportedPlanForEnvelope => e
  fail_with("Envelope scaffold rejected the plan: #{e.message}")
end

def execute_kitchen(queue_dir, job_id, inbox)
  $stderr.puts "Queue consumer: routing kitchen plan to KitchenExecutor."
  load File.join(File.dirname(__FILE__), "kitchen_loader.rb")
  FurniturePlatform::KitchenExecutor.run(queue_dir: queue_dir, job_id: job_id)
end

queue_dir = File.expand_path(ARGV[0] || "")
job_id = safe_job_id!(ARGV[1])
fail_with("An absolute queue directory is required.") unless !queue_dir.empty? && File.absolute_path(queue_dir) == queue_dir

begin
  route_plan(queue_dir, job_id)
rescue UnsupportedPlanType => e
  fail_with(e.message)
end