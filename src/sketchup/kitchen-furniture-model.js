import { FURNITURE_MODEL_VERSION, getDefaultFurnitureModel } from "./furniture-model.js";

export function buildKitchenFurnitureModel(kitchenModel = {}, options = {}) {
  if (!kitchenModel || typeof kitchenModel !== "object" || Array.isArray(kitchenModel)) {
    return failure("invalid_kitchen_model", "Kitchen model is required.");
  }

  const model = getDefaultFurnitureModel();
  model.modelVersion = FURNITURE_MODEL_VERSION;
  model.furnitureType = "kitchen";
  model.units = "mm";

  const sourceOrderId = normalizeInt(options.orderId || kitchenModel.orderId);
  model.source = {
    orderId: sourceOrderId,
    recognitionId: null,
    approvedBy: options.approvedBy || null,
    approvedAt: options.approvedBy ? (options.approvedAt || new Date().toISOString()) : null
  };

  const envelope = kitchenModel.roomEnvelope || {};

  // overall in furniture-model/v1: width = primary wall, height = ceiling
  // depth is NOT wallBmm — wallB is a secondary run for L/U layouts
  model.overall = {
    width: envelope.wallAmm || null,
    height: envelope.ceilingHeightMm || null,
    depth: null
  };

  model.components = buildComponents(kitchenModel);
  model.materials = [];

  // Stricter readyForSketchUp: needs dimensions AND layout AND at least one module
  const hasDimensions = envelope.wallAmm !== null && envelope.ceilingHeightMm !== null;
  const hasLayout = kitchenModel.readiness === "execution_ready" || kitchenModel.readiness === "partial";
  const hasContent = (kitchenModel.baseModules?.length || 0) + (kitchenModel.wallModules?.length || 0) > 0;
  model.readyForSketchUp = hasDimensions && hasLayout && hasContent;

  // Kitchen-specific extension fields
  model.kitchenLayout = kitchenModel.layout || "";
  model.kitchenWalls = (kitchenModel.walls || []).map((w) => ({ id: w.id, lengthMm: w.lengthMm }));
  model.kitchenBaseModules = (kitchenModel.baseModules || []).map(mapModule);
  model.kitchenWallModules = (kitchenModel.wallModules || []).map(mapModule);
  model.kitchenAppliances = (kitchenModel.applianceBlocks || []).map(mapBlock);
  model.kitchenWarnings = kitchenModel.warnings || [];
  model.kitchenReadiness = kitchenModel.readiness || "draft";

  // Kitchen envelope for downstream (avoids semantic mismatch with overall.depth)
  model.kitchenEnvelope = {
    primaryRunMm: envelope.wallAmm || null,
    secondaryRunMm: envelope.wallBmm || null,
    ceilingHeightMm: envelope.ceilingHeightMm || null,
    layout: kitchenModel.layout || ""
  };

  if (!envelope.wallAmm) model.missingInfo.push("wall length");
  if (!envelope.ceilingHeightMm) model.missingInfo.push("ceiling height");

  return { ok: true, error: "", model };
}

function buildComponents(kitchenModel) {
  const components = [];
  let index = 0;
  for (const mod of kitchenModel.baseModules || []) {
    components.push({ id: `base-${++index}`, label: `${mod.kind} (${mod.widthMm || "?"}mm)` });
  }
  for (const mod of kitchenModel.wallModules || []) {
    components.push({ id: `wall-${++index}`, label: `${mod.kind} (${mod.widthMm || "?"}mm)` });
  }
  for (const app of kitchenModel.applianceBlocks || []) {
    components.push({ id: `app-${++index}`, label: app.kind });
  }
  return components;
}

function mapModule(mod) {
  return {
    id: mod.id, wall: mod.wall, kind: mod.kind, xMm: mod.xMm,
    widthMm: mod.widthMm, heightMm: mod.heightMm, depthMm: mod.depthMm,
    mountBottomMm: mod.mountBottomMm || null,
    _provisional: mod._provisional || {}
  };
}

function mapBlock(block) {
  return {
    id: block.id, wall: block.wall, kind: block.kind, xMm: block.xMm,
    widthMm: block.widthMm, heightMm: block.heightMm, depthMm: block.depthMm,
    _provisional: block._provisional || {}
  };
}

function failure(error, message) {
  return { ok: false, error, message, model: getDefaultFurnitureModel() };
}

function normalizeInt(value) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
