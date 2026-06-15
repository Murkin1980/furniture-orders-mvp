import { FURNITURE_MODEL_VERSION } from "./furniture-model.js";

export const SKETCHUP_COMMAND_PLAN_VERSION = "sketchup-command-plan/v1";
export const SKETCHUP_COMMAND_TYPES = Object.freeze([
  "set_units",
  "create_envelope",
  "attach_metadata"
]);

export function getDefaultSketchUpCommandPlan() {
  return {
    planVersion: SKETCHUP_COMMAND_PLAN_VERSION,
    sourceModelVersion: "",
    source: {
      orderId: null,
      recognitionId: null
    },
    commands: [],
    warnings: [],
    readyForExecution: false
  };
}

export function buildSketchUpCommandPlan(model = {}) {
  const plan = getDefaultSketchUpCommandPlan();
  if (!isPlainObject(model) || model.modelVersion !== FURNITURE_MODEL_VERSION) {
    return failure("unsupported_model_version", "Command plans require furniture-model/v1.", plan);
  }
  if (!model.readyForSketchUp) {
    return failure("model_not_ready", "Furniture model is not ready for SketchUp.", plan);
  }

  const dimensions = normalizeDimensions(model.overall);
  if (!dimensions) {
    return failure("invalid_overall_dimensions", "Width, height, and depth must be positive millimeter values.", plan);
  }

  const orderId = positiveInteger(model.source?.orderId);
  const recognitionId = positiveInteger(model.source?.recognitionId);
  if (!orderId || !recognitionId) {
    return failure("source_audit_required", "Command plan requires traceable order and recognition IDs.", plan);
  }

  plan.sourceModelVersion = model.modelVersion;
  plan.source = { orderId, recognitionId };
  plan.commands = [
    {
      type: "set_units",
      unit: "mm"
    },
    {
      type: "create_envelope",
      dimensions
    },
    {
      type: "attach_metadata",
      furnitureType: clean(model.furnitureType) || "other",
      components: normalizeComponentLabels(model.components),
      materials: normalizeList(model.materials),
      notes: normalizeList(model.notes)
    }
  ];
  plan.warnings = normalizeList(model.warnings);
  if (normalizeComponentLabels(model.components).length) {
    plan.warnings.push("Components are metadata only; no component geometry or placement is included.");
  }
  plan.readyForExecution = validateSketchUpCommandPlan(plan).ok;

  return { ok: plan.readyForExecution, plan };
}

export function validateSketchUpCommandPlan(plan = {}) {
  if (!isPlainObject(plan) || plan.planVersion !== SKETCHUP_COMMAND_PLAN_VERSION) {
    return invalid("unsupported_plan_version");
  }
  if (!hasOnlyKeys(plan, [
    "planVersion",
    "sourceModelVersion",
    "source",
    "commands",
    "warnings",
    "readyForExecution"
  ]) || !hasOnlyKeys(plan.source, ["orderId", "recognitionId"])) {
    return invalid("invalid_plan_shape");
  }
  if (!positiveInteger(plan.source?.orderId) || !positiveInteger(plan.source?.recognitionId)) {
    return invalid("source_audit_required");
  }
  if (!Array.isArray(plan.commands) || plan.commands.length !== 3) {
    return invalid("invalid_command_sequence");
  }
  if (plan.commands.some((command) => !isAllowedCommand(command))) {
    return invalid("command_not_allowed");
  }

  const [units, envelope, metadata] = plan.commands;
  if (units.type !== "set_units" || units.unit !== "mm" || !hasOnlyKeys(units, ["type", "unit"])) {
    return invalid("invalid_units_command");
  }
  if (envelope.type !== "create_envelope"
    || !hasOnlyKeys(envelope, ["type", "dimensions"])
    || !hasOnlyKeys(envelope.dimensions, ["widthMm", "heightMm", "depthMm"])
    || !normalizeDimensions(envelope.dimensions)) {
    return invalid("invalid_envelope_command");
  }
  if (metadata.type !== "attach_metadata" || !isSafeMetadataCommand(metadata)) {
    return invalid("invalid_metadata_command");
  }

  return { ok: true, error: "" };
}

function isAllowedCommand(command) {
  return isPlainObject(command) && SKETCHUP_COMMAND_TYPES.includes(command.type);
}

function isSafeMetadataCommand(command) {
  return hasOnlyKeys(command, ["type", "furnitureType", "components", "materials", "notes"])
    && typeof command.furnitureType === "string"
    && isStringArray(command.components)
    && isStringArray(command.materials)
    && isStringArray(command.notes);
}

function hasOnlyKeys(value, allowedKeys) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeDimensions(overall) {
  if (!isPlainObject(overall)) return null;
  const dimensions = {
    widthMm: positiveNumber(overall.width ?? overall.widthMm),
    heightMm: positiveNumber(overall.height ?? overall.heightMm),
    depthMm: positiveNumber(overall.depth ?? overall.depthMm)
  };
  return Object.values(dimensions).every(Boolean) ? dimensions : null;
}

function normalizeComponentLabels(components) {
  return (Array.isArray(components) ? components : [])
    .map((component) => clean(isPlainObject(component) ? component.label : component))
    .filter(Boolean);
}

function normalizeList(value) {
  return (Array.isArray(value) ? value : []).map(clean).filter(Boolean);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function failure(error, message, plan) {
  return { ok: false, error, message, plan };
}

function invalid(error) {
  return { ok: false, error };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
