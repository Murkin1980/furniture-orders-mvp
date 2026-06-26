# frozen_string_literal: true

module FurniturePlatform
  module KitchenUpdateInPlace
    module_function

    def find_existing(model, cmd)
      return [] unless model.respond_to?(:entities)
      entities = model.active_entities
      return [] unless entities.respond_to?(:each)

      kind = cmd["kind"].to_s
      wall = cmd["wall"].to_s
      x_mm = cmd["xMm"].to_f

      matches = []
      entities.each do |entity|
        next unless entity.respond_to?(:get_attribute)
        next unless entity.get_attribute("furniture", "kind") == kind
        next unless entity.get_attribute("furniture", "wall") == wall
        next unless entity.get_attribute("furniture", "xMm").to_f == x_mm
        matches << entity
      end
      matches
    end

    def update_existing(entity, cmd)
      return false unless entity.respond_to?(:set_attribute)
      entity.set_attribute("furniture", "widthMm", cmd["widthMm"].to_s) if cmd["widthMm"]
      entity.set_attribute("furniture", "heightMm", cmd["heightMm"].to_s) if cmd["heightMm"]
      entity.set_attribute("furniture", "depthMm", cmd["depthMm"].to_s) if cmd["depthMm"]

      # Rebuild geometry if dimensions changed
      if entity.respond_to?(:definition) && entity.definition.respond_to?(:entities)
        rebuild_block(entity.definition.entities, cmd)
      end
      true
    end

    def rebuild_block(ents, cmd)
      ents.clear!
      width = cmd["widthMm"].to_f
      height = cmd["heightMm"].to_f
      depth = cmd["depthMm"].to_f
      return if width <= 0 || height <= 0 || depth <= 0

      pts = [Geom::Point3d.new(0, 0, 0), Geom::Point3d.new(width, 0, 0),
             Geom::Point3d.new(width, -depth, 0), Geom::Point3d.new(0, -depth, 0)]
      face = ents.add_face(pts)
      return unless face
      face.reverse! if face.normal.z < 0
      face.pushpull(height)
    end

    def update_or_place(model, cmd)
      existing = find_existing(model, cmd)
      if existing.any?
        existing.each { |e| update_existing(e, cmd) }
        return :updated
      end

      zone = cmd["zone"].to_s
      if cmd["type"] == "place_block_appliance"
        KitchenGeometry.place_appliance(model, cmd)
      elsif zone == "wall"
        KitchenGeometry.place_wall_module(model, cmd)
      else
        KitchenGeometry.place_base_module(model, cmd)
      end
      :placed
    end

    def find_by_job(model, job_id)
      return [] unless model.respond_to?(:entities)
      entities = model.active_entities
      return [] unless entities.respond_to?(:each)

      matches = []
      entities.each do |entity|
        next unless entity.respond_to?(:get_attribute)
        next unless entity.get_attribute("furniture", "jobId") == job_id
        matches << entity
      end
      matches
    end
  end
end
