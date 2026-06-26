# frozen_string_literal: true

module FurniturePlatform
  module KitchenComponentRegistry
    ALLOWED_COMMANDS = %w[set_units_mm create_room_envelope place_block_module place_block_appliance].freeze
    ALLOWED_WALLS = %w[a b c].freeze
    ALLOWED_ZONES = %w[base wall].freeze
    SUPPORTED_LAYOUTS = %w[straight l].freeze
    BRIDGE_VERSION = "furniture-sketchup-file-queue/v1"
    KITCHEN_PLAN_VERSION = "kitchen-command-plan/v1"

    # Component definition schema:
    #   source: :block_geometry | :easykitchen | :custom_component
    #   default_width_mm:  Integer (fallback when command omits width)
    #   default_height_mm: Integer
    #   default_depth_mm:  Integer
    #   color:             Hex string for block geometry
    #   zone:              "base" | "wall" | "appliance"
    #   ek_preset:         EasyKitchen preset ID (String, nil if unavailable)
    #   category:          "module" | "appliance"
    #   notes:             String (optional)
    COMPONENT_MAP = {
      # --- Base modules ---
      "sink-base" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 800, default_height_mm: 720, default_depth_mm: 560,
        color: "#C8B8A0",
        ek_preset: nil,
        notes: "Base cabinet with sink cutout placeholder"
      },
      "drawers" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 600, default_height_mm: 720, default_depth_mm: 560,
        color: "#D4C8B8",
        ek_preset: nil,
        notes: "Base drawer block"
      },
      "base-cabinet" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 600, default_height_mm: 720, default_depth_mm: 560,
        color: "#D0C0AA",
        ek_preset: nil,
        notes: "Standard base cabinet"
      },
      "corner-base" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 900, default_height_mm: 720, default_depth_mm: 560,
        color: "#C0B09A",
        ek_preset: nil,
        notes: "Corner base unit — L-shaped door placeholder"
      },
      "oven-base" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 600, default_height_mm: 720, default_depth_mm: 560,
        color: "#888888",
        ek_preset: nil,
        notes: "Base cabinet with oven cavity placeholder"
      },
      "fridge-box" => {
        source: :block_geometry, category: "module", zone: "base",
        default_width_mm: 600, default_height_mm: 2000, default_depth_mm: 650,
        color: "#AAAAAA",
        ek_preset: nil,
        notes: "Tall fridge enclosure column"
      },

      # --- Wall modules ---
      "wall-cabinet" => {
        source: :block_geometry, category: "module", zone: "wall",
        default_width_mm: 600, default_height_mm: 720, default_depth_mm: 320,
        color: "#E0D5C5",
        ek_preset: nil,
        notes: "Wall cabinet — mounting height from command payload"
      },
      "hood-cabinet" => {
        source: :block_geometry, category: "module", zone: "wall",
        default_width_mm: 600, default_height_mm: 350, default_depth_mm: 320,
        color: "#999999",
        ek_preset: nil,
        notes: "Hood enclosure wall cabinet"
      },

      # --- Appliances ---
      "sink" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 800, default_height_mm: 720, default_depth_mm: 560,
        color: "#665544", placement: :counter_top,
        ek_preset: nil,
        notes: "Sink block — sits inside sink-base counter"
      },
      "hob" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 600, default_height_mm: 60, default_depth_mm: 520,
        color: "#222222", placement: :counter_top,
        ek_preset: nil,
        notes: "Hob/cooktop — thin block on counter surface"
      },
      "oven" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 600, default_height_mm: 600, default_depth_mm: 560,
        color: "#444444", placement: :under_counter,
        ek_preset: nil,
        notes: "Built-in oven"
      },
      "fridge" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 600, default_height_mm: 2000, default_depth_mm: 650,
        color: "#EEEEEE", placement: :floor,
        ek_preset: nil,
        notes: "Stand-alone fridge block"
      },
      "dishwasher" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 600, default_height_mm: 820, default_depth_mm: 570,
        color: "#CCCCCC", placement: :under_counter,
        ek_preset: nil,
        notes: "Built-in dishwasher"
      },
      "hood" => {
        source: :block_geometry, category: "appliance", zone: "appliance",
        default_width_mm: 600, default_height_mm: 150, default_depth_mm: 500,
        color: "#666666", placement: :wall_mounted,
        ek_preset: nil,
        notes: "Overhead hood"
      }
    }.freeze

    module_function

    def lookup(kind)
      COMPONENT_MAP[kind]
    end

    def lookup!(kind)
      entry = COMPONENT_MAP[kind]
      raise "Unsupported component kind: #{kind}" unless entry
      entry
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

    def default_width(kind)
      entry = lookup(kind)
      entry ? entry[:default_width_mm] : nil
    end

    def default_height(kind)
      entry = lookup(kind)
      entry ? entry[:default_height_mm] : nil
    end

    def default_depth(kind)
      entry = lookup(kind)
      entry ? entry[:default_depth_mm] : nil
    end

    def category(kind)
      entry = lookup(kind)
      entry ? entry[:category] : nil
    end

    def zone(kind)
      entry = lookup(kind)
      entry ? entry[:zone] : nil
    end

    def color(kind)
      entry = lookup(kind)
      entry ? entry[:color] : nil
    end

    def all_module_kinds
      COMPONENT_MAP.select { |_, v| v[:category] == "module" }.keys
    end

    def all_appliance_kinds
      COMPONENT_MAP.select { |_, v| v[:category] == "appliance" }.keys
    end

    def count
      COMPONENT_MAP.size
    end
  end
end
