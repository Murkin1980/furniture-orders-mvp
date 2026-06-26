import { FURNITURE_MODEL_VERSION, getDefaultFurnitureModel } from "./furniture-model.js";

export function buildKitchenFurnitureModel(kitchenModel = {}, options = {}) {
  if (!kitchenModel || typeof kitchenModel !== "object" || Array.isArray(kitchenModel)) {
    return failure("invalid_kitchen_model", "Kitchen model is required.");
  }

  const model = getDefaultFurnitureModel();
  model.modelVersion = FURNITURE_MODEL_VERSION;
  model.furnitureType = "kitchen";
  model.units = "mm";

  model.source = {
    orderId: normalizeInt(options.orderId || kitchenModel.orderId),
    recognitionId: null,
    approvedBy: clean(options.approvedBy || "manager"),
    approvedAt: options.approvedAt || new Date().toISOString()
  };

  const envelope = kitchenModel.roomEnvelope || {};
  const overallWidth = envelope.wallAmm || null;
  const overallHeight = envelope.ceilingHeightMm || null;
  const overallDepth = envelope.wallBmm || null;

  model.overall = {
    width: overallWidth,
    height: overallHeight,
    depth: overallDepth
  };

  model.components = buildComponents(kitchenModel);
  model.materials = [];
  model.readyForSketchUp = overallWidth !== null && overallHeight !== null;

  // Kitchen-specific extension fields (preserved through the pipeline)
  model.kitchenLayout = kitchenModel.layout || "";
  model.kitchenWalls = (kitchenModel.walls || []).map((w) => ({ id: w.id, lengthMm: w.lengthMm }));
  model.kitchenBaseModules = (kitchenModel.baseModules || []).map(mapModule);
  model.kitchenWallModules = (kitchenModel.wallModules || []).map(mapModule);
  model.kitchenAppliances = (kitchenModel.applianceBlocks || []).map(mapBlock);
  model.kitchenWarnings = kitchenModel.warnings || [];

  if (!overallWidth) model.missingInfo.push("wall length");
  if (!overallHeight) model.missingInfo.push("ceiling height");

  return { ok: true, error: "", model };
}

function buildComponents(kitchenModel) {
  const components = [];
  let index = 0;

  for (const mod of kitchenModel.baseModules || []) {
    components.push({ id: `base-${++index}`, label: `${mod.kind} (${mod.widthMm}mm)` });
  }
  for (const mod of kitchenModel.wallModules || []) {
    components.push({ id: `wall-${++index}`, label: `${mod.kind} (${mod.widthMm}mm)` });
  }
  for (const app of kitchenModel.applianceBlocks || []) {
    components.push({ id: `app-${++index}`, label: app.kind });
  }

  return components;
}

function mapModule(mod) {
  return {
    id: mod.id,
    wall: mod.wall,
    kind: mod.kind,
    xMm: mod.xMm,
    widthMm: mod.widthMm,
    heightMm: mod.heightMm,
    depthMm: mod.depthMm,
    mountBottomMm: mod.mountBottomMm || null
  };
}

function mapBlock(block) {
  return {
    id: block.id,
    wall: block.wall,
    kind: block.kind,
    xMm: block.xMm,
    widthMm: block.widthMm,
    heightMm: block.heightMm,
    depthMm: block.depthMm
  };
}

function failure(error, message) {
  return { ok: false, error, message, model: getDefaultFurnitureModel() };
}

function normalizeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
