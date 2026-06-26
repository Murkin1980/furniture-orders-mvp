# frozen_string_literal: true

module FurniturePlatform
  module KitchenComponentRegistry
    COMPONENT_MAP = {
      "sink-base"    => { source: :block_geometry, width_mm: 800, height_mm: 720, depth_mm: 560, color: "#C8B8A0" },
      "drawers"      => { source: :block_geometry, width_mm: 600, height_mm: 720, depth_mm: 560, color: "#D4C8B8" },
      "base-cabinet" => { source: :block_geometry, width_mm: 600, height_mm: 720, depth_mm: 560, color: "#D0C0AA" },
      "corner-base"  => { source: :block_geometry, width_mm: 900, height_mm: 720, depth_mm: 560, color: "#C0B09A" },
      "oven-base"    => { source: :block_geometry, width_mm: 600, height_mm: 720, depth_mm: 560, color: "#888888" },
      "fridge-box"   => { source: :block_geometry, width_mm: 600, height_mm: 2000, depth_mm: 650, color: "#AAAAAA" },
      "wall-cabinet" => { source: :block_geometry, width_mm: 600, height_mm: 720, depth_mm: 320, color: "#E0D5C5" },
      "hood-cabinet" => { source: :block_geometry, width_mm: 600, height_mm: 350, depth_mm: 320, color: "#999999" },
      "sink"         => { source: :block_geometry, width_mm: 800, height_mm: 720, depth_mm: 560, color: "#665544" },
      "hob"          => { source: :block_geometry, width_mm: 600, height_mm: 60,  depth_mm: 520, color: "#222222" },
      "oven"         => { source: :block_geometry, width_mm: 600, height_mm: 600, depth_mm: 560, color: "#444444" },
      "fridge"       => { source: :block_geometry, width_mm: 600, height_mm: 2000, depth_mm: 650, color: "#EEEEEE" },
      "dishwasher"   => { source: :block_geometry, width_mm: 600, height_mm: 820, depth_mm: 570, color: "#CCCCCC" },
      "hood"         => { source: :block_geometry, width_mm: 600, height_mm: 150, depth_mm: 500, color: "#666666" }
    }.freeze

    ALLOWED_MODULE_KINDS = %w[sink-base drawers base-cabinet corner-base oven-base fridge-box wall-cabinet hood-cabinet].freeze
    ALLOWED_APPLIANCE_KINDS = %w[sink hob oven fridge dishwasher hood].freeze
    ALLOWED_COMMANDS = %w[set_units_mm create_room_envelope place_block_module place_block_appliance].freeze
    ALLOWED_WALLS = %w[a b c].freeze
    SUPPORTED_LAYOUTS = %w[straight l].freeze
    BRIDGE_VERSION = "furniture-sketchup-file-queue/v1"
    KITCHEN_PLAN_VERSION = "kitchen-command-plan/v1"

    module_function

    def lookup(kind)
      COMPONENT_MAP[kind]
    end

    def supported_kind?(kind)
      COMPONENT_MAP.key?(kind)
    end

    def supported_command?(type)
      ALLOWED_COMMANDS.include?(type)
    end

    def supported_wall?(wall)
      ALLOWED_WALLS.include?(wall.to_s.downcase)
    end

    def supported_layout?(layout)
      SUPPORTED_LAYOUTS.include?(layout.to_s.downcase)
    end
  end
end
