import { OCR_FURNITURE_TYPES } from "../ocr/recognition-result.js";

export const FURNITURE_MODEL_VERSION = "furniture-model/v1";

const DIMENSION_LABELS = Object.freeze({
  width: new Set(["width", "overall_width", "total_width"]),
  height: new Set(["height", "overall_height", "total_height"]),
  depth: new Set(["depth", "overall_depth", "total_depth"])
});

const UNIT_TO_MM = Object.freeze({
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4
});

export function getDefaultFurnitureModel() {
  return {
    modelVersion: FURNITURE_MODEL_VERSION,
    source: {
      orderId: null,
      recognitionId: null,
      approvedBy: "",
      approvedAt: ""
    },
    furnitureType: "other",
    units: "mm",
    overall: {
      width: null,
      height: null,
      depth: null
    },
    measurements: [],
    components: [],
    materials: [],
    notes: [],
    warnings: [],
    missingInfo: [],
    readyForSketchUp: false
  };
}

export function buildFurnitureModelFromRecognition(record = {}) {
  const model = getDefaultFurnitureModel();
  if (!isPlainObject(record) || clean(record.status).toLowerCase() !== "approved") {
    return failure("recognition_not_approved", "Only a manager-approved recognition can become a furniture model.", model);
  }
  if (!clean(record.reviewedBy ?? record.reviewed_by) || !clean(record.reviewedAt ?? record.reviewed_at)) {
    return failure("approval_audit_required", "Approved recognition must include reviewer and approval timestamp.", model);
  }
  const orderId = normalizePositiveInteger(record.orderId ?? record.order_id);
  const recognitionId = normalizePositiveInteger(record.id ?? record.recognitionId);
  if (!orderId || !recognitionId) {
    return failure("source_audit_required", "Approved recognition must include order and recognition IDs.", model);
  }

  const result = isPlainObject(record.result) ? record.result : {};
  const warnings = normalizeList(result.warnings);
  const measurements = normalizeMeasurements(result.dimensions, warnings);
  const dimensions = selectOverallDimensions(measurements, warnings);
  model.source = {
    orderId,
    recognitionId,
    approvedBy: clean(record.reviewedBy ?? record.reviewed_by),
    approvedAt: clean(record.reviewedAt ?? record.reviewed_at)
  };
  model.furnitureType = normalizeFurnitureType(result.furnitureType, warnings);
  model.overall = dimensions;
  model.measurements = measurements;
  model.components = normalizeList(result.components).map((label, index) => ({
    id: `component-${index + 1}`,
    label
  }));
  model.materials = normalizeList(result.materials);
  model.notes = normalizeList(result.notes);
  model.warnings = warnings;
  model.missingInfo = normalizeList(result.missingInfo);
  model.readyForSketchUp = ["width", "height", "depth"].every((key) => dimensions[key] !== null);

  return { ok: true, model };
}

function normalizeMeasurements(input, warnings) {
  return (Array.isArray(input) ? input : []).flatMap((dimension) => {
    if (!isPlainObject(dimension) || !clean(dimension.label)) return [];
    const converted = convertToMm(dimension.value, dimension.unit);
    if (converted === null) {
      warnings.push(`Dimension "${clean(dimension.label)}" was not mapped because its unit is unknown or value is invalid.`);
      return [];
    }
    return [{
      label: clean(dimension.label),
      valueMm: converted,
      confidence: normalizeConfidence(dimension.confidence),
      sourceText: clean(dimension.sourceText)
    }];
  });
}

function selectOverallDimensions(measurements, warnings) {
  const selected = { width: null, height: null, depth: null };
  const confidence = { width: -1, height: -1, depth: -1 };

  for (const dimension of measurements) {
    const axis = findAxis(dimension.label);
    if (!axis) continue;
    const candidateConfidence = normalizeConfidence(dimension.confidence);
    if (selected[axis] !== null && candidateConfidence <= confidence[axis]) {
      warnings.push(`Duplicate ${axis} dimension was ignored in favor of the higher-confidence value.`);
      continue;
    }
    if (selected[axis] !== null) {
      warnings.push(`Duplicate ${axis} dimension was replaced by the higher-confidence value.`);
    }
    selected[axis] = dimension.valueMm;
    confidence[axis] = candidateConfidence;
  }

  return selected;
}

function findAxis(label) {
  const normalized = clean(label).toLowerCase();
  return Object.keys(DIMENSION_LABELS).find((axis) => DIMENSION_LABELS[axis].has(normalized)) || null;
}

function convertToMm(value, unit) {
  const number = Number(value);
  const factor = UNIT_TO_MM[clean(unit).toLowerCase()];
  if (!Number.isFinite(number) || number <= 0 || !factor) return null;
  return Math.round(number * factor * 100) / 100;
}

function normalizeConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
}

function normalizeFurnitureType(value, warnings) {
  const type = clean(value).toLowerCase();
  if (OCR_FURNITURE_TYPES.includes(type)) return type;
  if (type) warnings.push(`Unsupported furniture type "${type}" was normalized to other.`);
  return "other";
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function failure(error, message, model) {
  return { ok: false, error, message, model };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
