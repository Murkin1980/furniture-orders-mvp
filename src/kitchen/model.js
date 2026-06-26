export const KITCHEN_MODEL_VERSION = "kitchen-model/v1";

export function getDefaultKitchenModel() {
  return {
    modelVersion: KITCHEN_MODEL_VERSION,
    layout: "",
    roomEnvelope: { wallAmm: null, wallBmm: null, ceilingHeightMm: null },
    walls: [],
    baseModules: [],
    wallModules: [],
    applianceBlocks: [],
    warnings: []
  };
}

export function getAvailableModuleKinds() {
  return ["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"];
}

export function getAvailableApplianceKinds() {
  return ["sink", "hob", "oven", "fridge", "dishwasher", "hood"];
}
