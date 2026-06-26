export const KITCHEN_MODEL_VERSION = "kitchen-model/v1";

export const READINESS = Object.freeze({ DRAFT: "draft", PARTIAL: "partial", EXECUTION_READY: "execution_ready" });

export function getDefaultKitchenModel() {
  return {
    modelVersion: KITCHEN_MODEL_VERSION,
    layout: "",
    readiness: READINESS.DRAFT,
    roomEnvelope: { wallAmm: null, wallBmm: null, ceilingHeightMm: null },
    walls: [],
    baseModules: [],
    wallModules: [],
    applianceBlocks: [],
    warnings: [],
    metrics: { baseRunMm: 0, wallRunMm: 0 }
  };
}

export function getAvailableModuleKinds() {
  return ["sink-base", "drawers", "base-cabinet", "corner-base", "oven-base", "fridge-box", "wall-cabinet", "hood-cabinet"];
}

export function getAvailableApplianceKinds() {
  return ["sink", "hob", "oven", "fridge", "dishwasher", "hood"];
}

export function getSupportedLayouts() {
  return ["straight", "l"];
}

export function validateKitchenModel(model = {}) {
  if (!model || typeof model !== "object") {
    return { ok: false, errors: ["Kitchen model is required."], readiness: READINESS.DRAFT };
  }
  if (model.modelVersion !== KITCHEN_MODEL_VERSION) {
    return { ok: false, errors: [`Model version must be ${KITCHEN_MODEL_VERSION}.`], readiness: READINESS.DRAFT };
  }

  const errors = [];
  const warnings = [];

  if (!getSupportedLayouts().includes(model.layout)) {
    errors.push(`Layout "${model.layout}" is not supported. Supported: ${getSupportedLayouts().join(", ")}.`);
  }
  if (!Array.isArray(model.walls) || model.walls.length === 0) {
    errors.push("At least one wall is required.");
  } else {
    for (const wall of model.walls) {
      if (!wall.id || !["a", "b", "c"].includes(wall.id)) {
        errors.push(`Wall has invalid id "${wall.id}".`);
      }
      if (!Number.isInteger(wall.lengthMm) || wall.lengthMm <= 0) {
        errors.push(`Wall "${wall.id}" has invalid lengthMm.`);
      }
    }
  }

  if (model.layout === "l" && model.walls.length < 2) {
    errors.push("L-shaped layout requires at least two walls (A and B).");
  }

  const hasWidthOverlap = checkOccupancy(model.baseModules, model.walls);
  if (hasWidthOverlap > 0) warnings.push(`${hasWidthOverlap} modules exceed wall bounds.`);

  let readiness = READINESS.EXECUTION_READY;
  if (errors.length > 0) readiness = READINESS.DRAFT;
  else if (warnings.length > 0 || model.baseModules.length === 0) readiness = READINESS.PARTIAL;

  return { ok: errors.length === 0, errors, warnings, readiness };
}

function checkOccupancy(modules, walls) {
  let overflows = 0;
  for (const wall of walls) {
    const occupied = modules
      .filter((m) => m.wall === wall.id)
      .reduce((sum, m) => sum + (m.widthMm || 0), 0);
    if (occupied > wall.lengthMm) overflows++;
  }
  return overflows;
}
