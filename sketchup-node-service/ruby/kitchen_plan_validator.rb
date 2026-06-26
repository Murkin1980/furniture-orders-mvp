# frozen_string_literal: true

require "json"

module FurniturePlatform
  module KitchenPlanValidator
    SAFE_ID = /\A[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}\z/

    module_function

    def validate_plan!(plan)
      raise "Kitchen command plan is required." unless plan.is_a?(Hash)
      raise "Unsupported plan version: #{plan["planVersion"]}" unless plan["planVersion"] == KitchenComponentRegistry::KITCHEN_PLAN_VERSION

      commands = plan["commands"]
      raise "Commands array is required." unless commands.is_a?(Array) && !commands.empty?

      commands.each_with_index do |cmd, i|
        raise "Command #{i}: type is required." unless cmd.is_a?(Hash) && cmd["type"].is_a?(String)
        raise "Command #{i}: unsupported type '#{cmd["type"]}'." unless KitchenComponentRegistry.supported_command?(cmd["type"])

        case cmd["type"]
        when "set_units_mm"
          # no payload to validate
        when "create_room_envelope"
          validate_envelope_payload!(cmd, i)
        when "place_block_module"
          validate_module_payload!(cmd, i)
        when "place_block_appliance"
          validate_appliance_payload!(cmd, i)
        end
      end

      true
    end

    def validate_request!(request, job_id)
      raise "Request is required." unless request.is_a?(Hash)
      raise "Bridge version mismatch." unless request["bridgeVersion"] == KitchenComponentRegistry::BRIDGE_VERSION
      raise "Job ID mismatch." unless clean(request["jobId"]) == job_id
      raise "Requested by is required." if clean(request["requestedBy"]).empty?
      validate_plan!(request["commandPlan"])
      request
    end

    def validate_approval!(approval, job_id, requested_by)
      raise "Approval is required." unless approval.is_a?(Hash)
      raise "Approval job ID mismatch." unless clean(approval["jobId"]) == job_id
      raise "Approval not granted." unless approval["approved"] == true
      raise "Manager identity is required." if clean(approval["requestedBy"]).empty?
      raise "Approved by is required." if clean(approval["approvedBy"]).empty?
      true
    end

    def safe_job_id!(value)
      raise "Job ID is required." if value.nil? || value.to_s.strip.empty?
      id = value.to_s.strip
      raise "Job ID is invalid." unless SAFE_ID.match?(id)
      id
    end

    def clean(value)
      value.to_s.strip
    end

    def validate_envelope_payload!(cmd, i)
      has_any = cmd.keys.any? { |k| k.match?(/\Awall[ABC]mm\z/) }
      raise "Command #{i}: at least one wall length is required." unless has_any
    end

    def validate_module_payload!(cmd, i)
      raise "Command #{i}: wall is required." unless KitchenComponentRegistry.supported_wall?(cmd["wall"])
      raise "Command #{i}: zone is required." unless %w[base wall].include?(cmd["zone"])
      raise "Command #{i}: kind is required." unless KitchenComponentRegistry.supported_kind?(cmd["kind"])
      raise "Command #{i}: invalid xMm." unless cmd["xMm"].is_a?(Numeric) && cmd["xMm"] >= 0
      raise "Command #{i}: invalid widthMm." unless cmd["widthMm"].is_a?(Numeric) && cmd["widthMm"] > 0
      raise "Command #{i}: invalid heightMm." unless cmd["heightMm"].is_a?(Numeric) && cmd["heightMm"] > 0
      raise "Command #{i}: invalid depthMm." unless cmd["depthMm"].is_a?(Numeric) && cmd["depthMm"] > 0
    end

    def validate_appliance_payload!(cmd, i)
      raise "Command #{i}: wall is required." unless KitchenComponentRegistry.supported_wall?(cmd["wall"])
      raise "Command #{i}: kind is required." unless KitchenComponentRegistry.supported_kind?(cmd["kind"])
      raise "Command #{i}: invalid xMm." unless cmd["xMm"].is_a?(Numeric) && cmd["xMm"] >= 0
      raise "Command #{i}: invalid widthMm." unless cmd["widthMm"].is_a?(Numeric) && cmd["widthMm"] > 0
      raise "Command #{i}: invalid heightMm." unless cmd["heightMm"].is_a?(Numeric) && cmd["heightMm"] > 0
      raise "Command #{i}: invalid depthMm." unless cmd["depthMm"].is_a?(Numeric) && cmd["depthMm"] > 0
    end
  end
end
