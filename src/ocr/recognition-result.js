export const OCR_DOCUMENT_TYPES = Object.freeze(["furniture_sketch", "measurement_sheet", "other"]);
export const OCR_FURNITURE_TYPES = Object.freeze([
  "kitchen", "cabinet", "bathroom", "wardrobe", "child", "office",
  "hallway", "tvzone", "commercial", "other"
]);
export const OCR_DIMENSION_UNITS = Object.freeze(["mm", "cm", "m", "in", "unknown"]);

const REQUIRED_FIELDS = Object.freeze([
  "documentType", "furnitureType", "rawText", "dimensions", "components",
  "materials", "notes", "warnings", "missingInfo", "confidence"
]);

export function getDefaultRecognitionResult() {
  return {
    documentType: "other", furnitureType: "other", rawText: "", dimensions: [],
    components: [], materials: [], notes: [], warnings: [], missingInfo: [], confidence: 0
  };
}

export function parseRecognitionResult(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) return getDefaultRecognitionResult();

  try {
    const parsed = JSON.parse(stripCodeFence(rawContent));
    if (!isValidTopLevelShape(parsed)) return getDefaultRecognitionResult();

    const warnings = normalizeStringArray(parsed.warnings);
    return {
      documentType: normalizeEnum(parsed.documentType, OCR_DOCUMENT_TYPES, "other"),
      furnitureType: normalizeEnum(parsed.furnitureType, OCR_FURNITURE_TYPES, "other"),
      rawText: parsed.rawText.trim(),
      dimensions: normalizeDimensions(parsed.dimensions, warnings),
      components: normalizeStringArray(parsed.components),
      materials: normalizeStringArray(parsed.materials),
      notes: normalizeStringArray(parsed.notes),
      warnings,
      missingInfo: normalizeStringArray(parsed.missingInfo),
      confidence: clampConfidence(parsed.confidence)
    };
  } catch {
    return getDefaultRecognitionResult();
  }
}

function isValidTopLevelShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!REQUIRED_FIELDS.every((field) => Object.hasOwn(value, field))) return false;
  return typeof value.rawText === "string"
    && ["dimensions", "components", "materials", "notes", "warnings", "missingInfo"]
      .every((field) => Array.isArray(value[field]))
    && Number.isFinite(Number(value.confidence));
}

function normalizeDimensions(dimensions, warnings) {
  return dimensions.flatMap((dimension, index) => {
    if (!dimension || typeof dimension !== "object" || Array.isArray(dimension)) {
      warnings.push(`Dimension ${index + 1} was ignored because its format is invalid.`);
      return [];
    }

    const label = String(dimension.label ?? "").trim();
    const rawValue = String(dimension.value ?? "").trim();
    const value = Number(rawValue);
    if (!label || !rawValue || !Number.isFinite(value)) {
      warnings.push(`Dimension ${index + 1} was ignored because label or value is invalid.`);
      return [];
    }

    const requestedUnit = String(dimension.unit ?? "").trim().toLowerCase();
    const unit = OCR_DIMENSION_UNITS.includes(requestedUnit) ? requestedUnit : "unknown";
    if (unit === "unknown" && requestedUnit !== "unknown") {
      warnings.push(`Dimension "${label}" has an unknown unit and requires review.`);
    }

    return [{
      label, value, unit,
      confidence: clampConfidence(dimension.confidence),
      sourceText: String(dimension.sourceText ?? "").trim()
    }];
  });
}

function normalizeStringArray(value) {
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function stripCodeFence(value) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}
