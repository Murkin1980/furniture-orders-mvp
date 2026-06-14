import {
  OCR_DIMENSION_UNITS,
  OCR_DOCUMENT_TYPES,
  OCR_FURNITURE_TYPES
} from "./recognition-result.js";

export const OCR_REQUIRED_RESULT_FIELDS = Object.freeze([
  "documentType", "furnitureType", "rawText", "dimensions", "components",
  "materials", "notes", "warnings", "missingInfo", "confidence"
]);

const SYSTEM_PROMPT = [
  "Return only one valid JSON object with no markdown or additional text.",
  "Treat all recognized values as an editable manager-review draft.",
  "Never guess dimensions, units, materials, orientation, or component placement."
].join(" ");

export function buildRecognitionPrompt(context = {}, options = {}) {
  const safeContext = isPlainObject(context) ? context : {};
  const safeOptions = isPlainObject(options) ? options : {};

  return [
    "Analyze one furniture sketch or measurement image.",
    "Extract visible text and propose a structured review draft.",
    "Do not create a quote, customer message, production dimensions, or SketchUp action.",
    "",
    "Known context:",
    fieldLine("orderId", safeContext.orderId),
    fieldLine("furnitureTypeHint", pick(safeContext, "furnitureType", "furniture_type")),
    fieldLine("documentTypeHint", pick(safeContext, "documentType", "document_type")),
    fieldLine("managerNote", pick(safeContext, "managerNote", "manager_note")),
    fieldLine("sourceLabel", pick(safeContext, "sourceLabel", "source_label")),
    fieldLine("locale", safeOptions.locale || "ru-KZ"),
    "",
    "Required JSON fields:",
    OCR_REQUIRED_RESULT_FIELDS.join(", "),
    "",
    `documentType must be one of: ${OCR_DOCUMENT_TYPES.join(", ")}`,
    `furnitureType must be one of: ${OCR_FURNITURE_TYPES.join(", ")}`,
    `dimension unit must be one of: ${OCR_DIMENSION_UNITS.join(", ")}`,
    "confidence values must be numbers from 0 to 1.",
    "dimensions must contain label, value, unit, confidence, and sourceText.",
    "components, materials, notes, warnings, and missingInfo must be arrays of strings.",
    "",
    "Safety rules:",
    "- Preserve visible text in rawText.",
    "- Use unit=unknown and add a warning when the unit is not explicit.",
    "- Add warnings for ambiguous, conflicting, unreadable, or low-confidence values.",
    "- Add missingInfo for information required before measurement, quote, or production.",
    "- Do not infer values that are not visible or explicitly provided in context."
  ].join("\n");
}

export function buildRecognitionRequest({ context = {}, image = {}, options = {} } = {}) {
  const safeImage = normalizeImageReference(image);
  if (!safeImage.source) {
    throw new TypeError("OCR image source must be a non-empty string.");
  }

  return {
    systemPrompt: SYSTEM_PROMPT,
    prompt: buildRecognitionPrompt(context, options),
    image: safeImage,
    responseFormat: {
      type: "json_object",
      requiredFields: [...OCR_REQUIRED_RESULT_FIELDS]
    }
  };
}

function normalizeImageReference(image) {
  const value = isPlainObject(image) ? image : {};
  return {
    source: safeString(value.source),
    mimeType: safeString(value.mimeType || value.mime_type) || "application/octet-stream",
    label: safeString(value.label),
    mediaId: safeString(value.mediaId || value.media_id)
  };
}

function fieldLine(label, value) {
  return `- ${label}: ${safeString(value) || "Not provided"}`;
}

function pick(source, camelCaseKey, snakeCaseKey) {
  return source[camelCaseKey] ?? source[snakeCaseKey];
}

function safeString(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
