import { getDefaultRecognitionResult, parseRecognitionResult } from "./recognition-result.js";

export const OCR_RECOGNITION_STATUSES = Object.freeze(["draft", "approved", "rejected", "failed"]);

export function buildRecognitionRecordCreate(result, meta = {}) {
  const safeMeta = isPlainObject(meta) ? meta : {};
  const error = cleanText(safeMeta.error);
  return {
    order_id: normalizePositiveInteger(safeMeta.orderId),
    media_id: cleanText(safeMeta.mediaId),
    image_source: normalizeStoredImageSource(safeMeta.imageSource),
    status: error ? "failed" : "draft",
    result_json: serializeRecognitionResult(result),
    provider: cleanText(safeMeta.provider),
    model: cleanText(safeMeta.model),
    processing_time_ms: normalizeDuration(safeMeta.processingTimeMs),
    error,
    created_by: cleanText(safeMeta.createdBy) || "manager"
  };
}

export function buildRecognitionReviewUpdate(result, review = {}) {
  const safeReview = isPlainObject(review) ? review : {};
  const status = normalizeRecognitionStatus(safeReview.status);
  const reviewed = status === "approved" || status === "rejected";
  return {
    status,
    result_json: serializeRecognitionResult(result),
    reviewed_by: reviewed ? cleanText(safeReview.reviewedBy) || "manager" : null,
    reviewed_at: reviewed ? cleanText(safeReview.reviewedAt) : null
  };
}

export function serializeRecognitionResult(result) {
  return JSON.stringify(normalizeRecognitionResult(result));
}

export function parseStoredRecognitionResult(value) {
  if (isPlainObject(value)) return normalizeRecognitionResult(value);
  return parseRecognitionResult(typeof value === "string" ? value : "");
}

export function normalizeRecognitionStatus(status) {
  const normalized = cleanText(status)?.toLowerCase();
  return OCR_RECOGNITION_STATUSES.includes(normalized) ? normalized : "draft";
}

function normalizeRecognitionResult(result) {
  if (!isPlainObject(result)) return getDefaultRecognitionResult();
  const { meta, ...withoutMeta } = result;
  return parseRecognitionResult(JSON.stringify({ ...getDefaultRecognitionResult(), ...withoutMeta }));
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeDuration(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeStoredImageSource(value) {
  const source = cleanText(value);
  return source?.startsWith("data:image/") ? null : source;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
