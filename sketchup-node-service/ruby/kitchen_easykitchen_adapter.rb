# frozen_string_literal: true

module FurniturePlatform
  module KitchenEasyKitchenAdapter
    EASY_KITCHEN_AVAILABLE = defined?(EasyKitchen)

    module_function

    def available?
      EASY_KITCHEN_AVAILABLE
    end

    def build_easykitchen_command(component_key, cmd, strict: true)
      preset = KitchenPresetRegistry.resolve_ek_preset!(component_key, strict: strict)

      # preset is nil only when strict:false and key not found → demo/placeholder path
      if preset.nil?
        return build_demo_placeholder(component_key, cmd)
      end

      preset_id = preset[:ek_preset_id]
      version = preset[:version]
      library = preset[:library]

      unless available?
        raise "EasyKitchen is not available. Cannot place preset '#{preset_id}' (#{library} #{version})."
      end

      place_ek_preset(preset_id, cmd)
    end

    def build_demo_placeholder(component_key, cmd)
      $stderr.puts "[EK Demo] No preset for '#{component_key}' — using block geometry (demo only, not for production)."
      KitchenGeometry.place_base_module(cmd)
    end

    def place_ek_preset(preset_id, cmd)
      return :block_fallback unless EasyKitchen.respond_to?(:place_preset)

      wall = cmd["wall"].to_s.downcase
      x = cmd["xMm"].to_f
      z_offset = cmd["zone"] == "wall" ? (cmd["mountBottomMm"] || 1400) : 0

      origin = case wall
               when "a" then Geom::Point3d.new(x, 0, z_offset)
               when "b" then Geom::Point3d.new(0, x, z_offset)
               else Geom::Point3d.new(x, 0, z_offset)
               end

      rotation = Geom::Transformation.rotation(ORIGIN, Z_AXIS, 0)
      translation = Geom::Transformation.translation(origin)
      transform = translation * rotation

      EasyKitchen.place_preset(preset_id, transform)
      :easykitchen
    rescue StandardError => e
      $stderr.puts "EasyKitchen placement failed for #{preset_id}: #{e.message}"
      raise
    end

    ORIGIN = Geom::Point3d.new(0, 0, 0) if defined?(Geom::Point3d)
    Z_AXIS = Geom::Vector3d.new(0, 0, 1) if defined?(Geom::Vector3d)
  end
end
