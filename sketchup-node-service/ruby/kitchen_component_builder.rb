# frozen_string_literal: true

module FurniturePlatform
  module KitchenComponentBuilder
    COMPONENT_PREFIX = "furniture_kitchen_"
    DEFINITIONS_DIR = "furniture_definitions"

    module_function

    def find_or_create_component(model, kind, cmd)
      entry = KitchenComponentRegistry.lookup!(kind)
      name = component_name(kind)
      definition = find_definition(model, name)

      unless definition
        definition = build_block_definition(model, name, entry, cmd)
      end

      instance = model.active_entities.add_instance(definition, IDENTITY)
      set_instance_metadata(instance, cmd)
      instance
    end

    def find_definition(model, name)
      return nil unless model.respond_to?(:definitions)
      model.definitions.each do |defn|
        return defn if defn.name == name
      end
      nil
    end

    def build_block_definition(model, name, entry, cmd)
      return nil unless model.respond_to?(:definitions)
      definition = model.definitions.add(name)

      width = (cmd["widthMm"] || entry[:default_width_mm]).to_f
      height = (cmd["heightMm"] || entry[:default_height_mm]).to_f
      depth = (cmd["depthMm"] || entry[:default_depth_mm]).to_f

      pts = [
        Geom::Point3d.new(0, 0, 0),
        Geom::Point3d.new(width, 0, 0),
        Geom::Point3d.new(width, depth, 0),
        Geom::Point3d.new(0, depth, 0)
      ]
      face = definition.entities.add_face(pts)
      face.reverse! if face.normal.z < 0
      face.pushpull(height)

      color_hex = entry[:color]
      if color_hex && definition.respond_to?(:set_attribute)
        begin
          r = color_hex[1..2].to_i(16) / 255.0
          g = color_hex[3..4].to_i(16) / 255.0
          b = color_hex[5..6].to_i(16) / 255.0
          definition.material = Geom::Color.new(r, g, b) if definition.respond_to?(:material=)
        rescue StandardError
          # Silently fall back to default material
        end
      end

      definition
    end

    def component_name(kind)
      "#{COMPONENT_PREFIX}#{kind.tr('-', '_')}"
    end

    def set_instance_metadata(instance, cmd)
      return unless instance.respond_to?(:set_attribute)
      instance.set_attribute("furniture", "componentKind", cmd["kind"].to_s)
      instance.set_attribute("furniture", "componentName", component_name(cmd["kind"].to_s))
      instance.set_attribute("furniture", "planVersion", KitchenComponentRegistry::KITCHEN_PLAN_VERSION)
      instance.set_attribute("furniture", "commandType", cmd["type"].to_s)
      instance.set_attribute("furniture", "wall", cmd["wall"].to_s) if cmd["wall"]
      instance.set_attribute("furniture", "xMm", cmd["xMm"].to_s) if cmd["xMm"]
      instance.set_attribute("furniture", "widthMm", cmd["widthMm"].to_s) if cmd["widthMm"]
      instance.set_attribute("furniture", "heightMm", cmd["heightMm"].to_s) if cmd["heightMm"]
      instance.set_attribute("furniture", "depthMm", cmd["depthMm"].to_s) if cmd["depthMm"]
      instance.set_attribute("furniture", "zone", cmd["zone"].to_s) if cmd["zone"]
      instance.set_attribute("furniture", "provisional", "true") if cmd["_provisional"]
    end

    def definition_count(model)
      return 0 unless model.respond_to?(:definitions)
      model.definitions.count { |d| d.name&.start_with?(COMPONENT_PREFIX) }
    end

    # Identity transformation constant
    IDENTITY = Geom::Transformation.new if defined?(Geom::Transformation)
  end
end
