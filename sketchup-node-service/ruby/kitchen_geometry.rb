# frozen_string_literal: true

module FurniturePlatform
  module KitchenGeometry
    module_function

    def set_units_mm(model)
      return unless model.respond_to?(:options)
      options = model.options
      return unless options.respond_to?(:[])
      options["UnitsOptions"] ||= {}
      options["UnitsOptions"]["LengthUnit"] = 1  # 1 = Millimeters
      options["UnitsOptions"]["Precision"] = 0
    end

    def create_room_envelope(model, cmd)
      layout = cmd["layout"].to_s.downcase
      wall_a = cmd["wallAmm"].to_f
      wall_b = cmd["wallBmm"].to_f
      ceiling = cmd["ceilingHeightMm"].to_f

      entities = model.active_entities
      return unless entities.respond_to?(:add_face)

      # Create floor rectangle
      if layout == "l"
        # L-shape: A along X, B along Y
        pts = [
          Geom::Point3d.new(0, 0, 0),
          Geom::Point3d.new(wall_a, 0, 0),
          Geom::Point3d.new(wall_a, wall_b, 0),
          Geom::Point3d.new(0, wall_b, 0)
        ]
      else
        # Straight: single wall along X
        pts = [
          Geom::Point3d.new(0, 0, 0),
          Geom::Point3d.new(wall_a, 0, 0),
          Geom::Point3d.new(wall_a, -1200, 0),
          Geom::Point3d.new(0, -1200, 0)
        ]
      end

      floor = entities.add_face(pts)
      return unless floor

      floor.reverse! if floor.normal.z < 0

      # Push/pull to ceiling height
      floor.pushpull(ceiling) if ceiling > 0
    end

    def place_block_module(model, cmd)
      x = cmd["xMm"].to_f
      width = cmd["widthMm"].to_f
      height = cmd["heightMm"].to_f
      depth = cmd["depthMm"].to_f
      wall = cmd["wall"].to_s.downcase
      zone = cmd["zone"].to_s
      kind = cmd["kind"].to_s
      mount_bottom = cmd["mountBottomMm"]

      entities = model.active_entities

      # Determine position: base on floor, wall on mount line
      z_offset = zone == "wall" ? (mount_bottom || 1400) : 0

      # Default wall A = X axis
      case wall
      when "a"
        pt = Geom::Point3d.new(x, 0, z_offset)
      when "b"
        pt = Geom::Point3d.new(0, x, z_offset)
      else
        pt = Geom::Point3d.new(x, 0, z_offset)
      end

      group = entities.add_group
      group_entities = group.entities

      # Create block
      pts = [
        Geom::Point3d.new(0, 0, 0),
        Geom::Point3d.new(width, 0, 0),
        Geom::Point3d.new(width, depth, 0),
        Geom::Point3d.new(0, depth, 0)
      ]
      face = group_entities.add_face(pts)
      face.reverse! if face.normal.z < 0
      face.pushpull(height)

      group.material = color_for_kind(kind) if group.respond_to?(:material=)
      group.name = "#{zone}_#{kind}_#{x.to_i}"

      # Move group to position
      tr = Geom::Transformation.translation(pt)
      group.transform!(tr)

      # Write metadata
      set_entity_metadata(group, cmd)
    end

    def place_block_appliance(model, cmd)
      # Appliances use same placement as base modules
      cmd["zone"] = "appliance"
      place_block_module(model, cmd)
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

    def color_for_kind(kind)
      entry = KitchenComponentRegistry.lookup(kind)
      return nil unless entry
      color_hex = entry[:color]
      return nil unless color_hex
      r = color_hex[1..2].to_i(16) / 255.0
      g = color_hex[3..4].to_i(16) / 255.0
      b = color_hex[5..6].to_i(16) / 255.0
      Geom::Color.new(r, g, b) rescue nil
    end

    def absolute_queue_dir!(value)
      raise "Queue directory is required." if value.nil? || value.to_s.strip.empty?
      dir = File.expand_path(value.to_s.strip)
      raise "Queue directory does not exist: #{dir}" unless File.directory?(dir)
      dir
    end
  end
end
