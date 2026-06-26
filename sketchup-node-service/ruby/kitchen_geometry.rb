# frozen_string_literal: true

module FurniturePlatform
  module KitchenGeometry
    COUNTER_HEIGHT_MM = 900

    module_function

    def set_units_mm(model)
      return unless model.respond_to?(:options)
      options = model.options
      return unless options.respond_to?(:[])
      options["UnitsOptions"] ||= {}
      options["UnitsOptions"]["LengthUnit"] = 1
      options["UnitsOptions"]["Precision"] = 0
    end

    def create_room_envelope(model, cmd)
      layout = cmd["layout"].to_s.downcase
      wall_a = cmd["wallAmm"].to_f
      wall_b = cmd["wallBmm"].to_f
      ceiling = cmd["ceilingHeightMm"].to_f
      entities = model.active_entities
      return unless entities.respond_to?(:add_face)

      pts = if layout == "l"
              [Geom::Point3d.new(0, 0, 0), Geom::Point3d.new(wall_a, 0, 0),
               Geom::Point3d.new(wall_a, wall_b, 0), Geom::Point3d.new(0, wall_b, 0)]
            else
              [Geom::Point3d.new(0, 0, 0), Geom::Point3d.new(wall_a, 0, 0),
               Geom::Point3d.new(wall_a, -1200, 0), Geom::Point3d.new(0, -1200, 0)]
            end

      floor = entities.add_face(pts)
      return unless floor
      floor.reverse! if floor.normal.z < 0
      floor.pushpull(ceiling) if ceiling > 0
    end

    def place_base_module(model, cmd)
      place_module_at(model, cmd, z_offset: 0, use_counter: false)
    end

    def place_wall_module(model, cmd)
      z_offset = cmd["mountBottomMm"] || 1400
      place_module_at(model, cmd, z_offset: z_offset, use_counter: false)
    end

    def place_appliance(model, cmd)
      kind = cmd["kind"].to_s
      entry = KitchenComponentRegistry.lookup(kind)
      placement = entry && entry[:placement] ? entry[:placement] : :floor

      case placement
      when :counter_top
        # Hob, sink — sit on top of counter (at counter height)
        place_module_at(model, cmd, z_offset: COUNTER_HEIGHT_MM, use_counter: true)
      when :under_counter
        # Oven, dishwasher — sit under counter, on floor
        place_module_at(model, cmd, z_offset: 0, use_counter: false)
      when :wall_mounted
        # Hood — mounted on wall above counter
        place_module_at(model, cmd, z_offset: COUNTER_HEIGHT_MM + 400, use_counter: false)
      else
        # Fridge, etc — on floor
        place_module_at(model, cmd, z_offset: 0, use_counter: false)
      end
    end

    def place_module_at(model, cmd, z_offset: 0, use_counter: false)
      x = cmd["xMm"].to_f
      width = cmd["widthMm"].to_f
      height = cmd["heightMm"].to_f
      depth = cmd["depthMm"].to_f
      wall = cmd["wall"].to_s.downcase
      kind = cmd["kind"].to_s
      zone = cmd["zone"].to_s
      entities = model.active_entities

      pt = case wall
           when "a" then Geom::Point3d.new(x, depth, z_offset)
           when "b" then Geom::Point3d.new(depth, x, z_offset)
           else Geom::Point3d.new(x, depth, z_offset)
           end

      group = entities.add_group
      ge = group.entities

      pts = [Geom::Point3d.new(0, 0, 0), Geom::Point3d.new(width, 0, 0),
             Geom::Point3d.new(width, -depth, 0), Geom::Point3d.new(0, -depth, 0)]
      face = ge.add_face(pts)
      face.reverse! if face.normal.z < 0
      face.pushpull(height)

      apply_color(group, kind)
      group.name = "#{zone}_#{kind}_#{x.to_i}"
      tr = Geom::Transformation.translation(pt)
      group.transform!(tr)
      set_entity_metadata(group, cmd)
    end

    def set_entity_metadata(entity, cmd)
      return unless entity.respond_to?(:set_attribute)
      entity.set_attribute("furniture", "jobId", cmd["jobId"].to_s) if cmd["jobId"]
      entity.set_attribute("furniture", "orderId", cmd["orderId"].to_s) if cmd["orderId"]
      entity.set_attribute("furniture", "planVersion", KitchenComponentRegistry::KITCHEN_PLAN_VERSION)
      entity.set_attribute("furniture", "commandType", cmd["type"].to_s)
      entity.set_attribute("furniture", "kind", cmd["kind"].to_s) if cmd["kind"]
      entity.set_attribute("furniture", "wall", cmd["wall"].to_s) if cmd["wall"]
      entity.set_attribute("furniture", "xMm", cmd["xMm"].to_s) if cmd["xMm"]
      entity.set_attribute("furniture", "widthMm", cmd["widthMm"].to_s) if cmd["widthMm"]
      entity.set_attribute("furniture", "heightMm", cmd["heightMm"].to_s) if cmd["heightMm"]
      entity.set_attribute("furniture", "depthMm", cmd["depthMm"].to_s) if cmd["depthMm"]
      entity.set_attribute("furniture", "zone", cmd["zone"].to_s) if cmd["zone"]
    end

    def apply_color(group, kind)
      return unless group.respond_to?(:material=)
      entry = KitchenComponentRegistry.lookup(kind)
      return unless entry && entry[:color]
      hex = entry[:color]
      r = hex[1..2].to_i(16) / 255.0
      g = hex[3..4].to_i(16) / 255.0
      b = hex[5..6].to_i(16) / 255.0
      group.material = Geom::Color.new(r, g, b) rescue nil
    end

    def absolute_queue_dir!(value)
      raise "Queue directory is required." if value.nil? || value.to_s.strip.empty?
      dir = File.expand_path(value.to_s.strip)
      raise "Queue directory does not exist: #{dir}" unless File.directory?(dir)
      dir
    end
  end
end
