# frozen_string_literal: true

module FurniturePlatform
  module KitchenPresetRegistry
    EK_PRESET_MAP = {
      "sink-base"    => %w[EK_BASE_SINK_800 EK_BASE_SINK_600].freeze,
      "drawers"      => %w[EK_DRAWERS_600 EK_DRAWERS_450].freeze,
      "base-cabinet" => %w[EK_BASE_600 EK_BASE_500 EK_BASE_400].freeze,
      "corner-base"  => %w[EK_CORNER_900].freeze,
      "oven-base"    => %w[EK_OVEN_600].freeze,
      "fridge-box"   => %w[EK_FRIDGE_600].freeze,
      "wall-cabinet" => %w[EK_WALL_600 EK_WALL_800].freeze,
      "hood-cabinet" => %w[EK_HOOD_600].freeze,
      "sink"         => %w[APPL_SINK_800 APPL_SINK_600].freeze,
      "hob"          => %w[APPL_HOB_600].freeze,
      "oven"         => %w[APPL_OVEN_600].freeze,
      "fridge"       => %w[APPL_FRIDGE_600].freeze,
      "dishwasher"   => %w[APPL_DISHWASHER_600].freeze,
      "hood"         => %w[APPL_HOOD_600].freeze
    }.freeze

    DEMO_PRESETS = %w[EK_BASE_600 EK_WALL_600 EK_DRAWERS_600].freeze

    module_function

    def presets_for(kind, mode: :strict)
      presets = EK_PRESET_MAP[kind]
      case mode
      when :strict
        raise "No EasyKitchen preset for #{kind}" unless presets
        presets
      when :demo
        presets&.select { |p| DEMO_PRESETS.include?(p) } || []
      else
        presets || []
      end
    end

    def available_preset?(preset_id)
      EK_PRESET_MAP.values.flatten.include?(preset_id)
    end

    def supported_kinds
      EK_PRESET_MAP.keys
    end

    def count
      EK_PRESET_MAP.size
    end
  end
end
