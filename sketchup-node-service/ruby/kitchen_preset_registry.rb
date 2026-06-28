# frozen_string_literal: true

module FurniturePlatform
  class PresetUnavailableForModule < StandardError; end

  module KitchenPresetRegistry
    EK_PRESET_MAP = {
      "sink-base"    => { ek_preset_id: "ek_base_sink_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "drawers"      => { ek_preset_id: "ek_base_drawers_400", version: "5.3.2", library: "EasyKitchen PRO" },
      "base-cabinet" => { ek_preset_id: "ek_base_cabinet_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "corner-base"  => { ek_preset_id: "ek_corner_900", version: "5.3.2", library: "EasyKitchen PRO" },
      "oven-base"    => { ek_preset_id: "ek_oven_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "fridge-box"   => { ek_preset_id: "ek_fridge_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "wall-cabinet" => { ek_preset_id: "ek_wall_cabinet_320", version: "5.3.2", library: "EasyKitchen PRO" },
      "hood-cabinet" => { ek_preset_id: "ek_hood_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "sink"         => { ek_preset_id: "appl_sink_800", version: "5.3.2", library: "EasyKitchen PRO" },
      "hob"          => { ek_preset_id: "appl_hob_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "oven"         => { ek_preset_id: "appl_oven_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "fridge"       => { ek_preset_id: "appl_fridge_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "dishwasher"   => { ek_preset_id: "appl_dishwasher_600", version: "5.3.2", library: "EasyKitchen PRO" },
      "hood"         => { ek_preset_id: "appl_hood_600", version: "5.3.2", library: "EasyKitchen PRO" }
    }.freeze

    DEMO_PRESET_IDS = %w[ek_base_cabinet_600 ek_wall_cabinet_320 ek_base_drawers_400].freeze

    module_function

    def resolve_ek_preset!(component_key, strict: true)
      entry = EK_PRESET_MAP[component_key]
      if entry.nil? && strict
        raise PresetUnavailableForModule,
              "No EasyKitchen preset for '#{component_key}' in strict mode. " \
              "Available: #{EK_PRESET_MAP.keys.join(', ')}."
      end
      entry
    end

    def demo_preset?(preset_id)
      DEMO_PRESET_IDS.include?(preset_id)
    end

    def count
      EK_PRESET_MAP.size
    end

    def supported_kinds
      EK_PRESET_MAP.keys
    end
  end
end
