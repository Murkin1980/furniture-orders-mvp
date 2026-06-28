# frozen_string_literal: true

module FurniturePlatform
  module KitchenEasyKitchenAdapter
    EASY_KITCHEN_AVAILABLE = defined?(EasyKitchen)

    module_function

    def available?
      EASY_KITCHEN_AVAILABLE
    end

    def place_ek_component(model, kind, cmd, strict: false)
      unless available?
        return strict ? raise("EasyKitchen not available") : KitchenGeometry.place_base_module(model, cmd)
      end

      entry = KitchenComponentRegistry.lookup!(kind)
      preset = entry[:ek_preset]
      unless preset
        return strict ? raise("No EasyKitchen preset for #{kind}") : KitchenGeometry.place_base_module(model, cmd)
      end

      place_ek_preset(model, preset, cmd)
    end

    def place_ek_preset(model, preset, cmd)
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

      EasyKitchen.place_preset(preset, transform, model)
      :easykitchen
    rescue StandardError => e
      $stderr.puts "EasyKitchen placement failed for #{preset}: #{e.message}"
      KitchenGeometry.place_base_module(model, cmd)
      :block_fallback
    end

    ORIGIN = Geom::Point3d.new(0, 0, 0) if defined?(Geom::Point3d)
    Z_AXIS = Geom::Vector3d.new(0, 0, 1) if defined?(Geom::Vector3d)
  end
end
