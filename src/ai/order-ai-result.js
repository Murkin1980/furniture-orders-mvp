import { getDefaultAiResult } from "./parse-ai-response.js";

const AI_STATUSES = new Set(["pending", "success", "failed"]);

export function buildOrderAiUpdate(aiResult, meta = {}) {
  const result = {
    ...getDefaultAiResult(),
    ...(isPlainObject(aiResult) ? aiResult : {})
  };
  const metadata = {
    ...(isPlainObject(result.meta) ? result.meta : {}),
    ...(isPlainObject(meta) ? meta : {})
  };
  const error = cleanText(metadata.error);

  return {
    ai_status: error ? "failed" : normalizeAiStatus(metadata.status || "success"),
    ai_score: normalizeScore(result.leadScore),
    ai_temperature: cleanText(result.leadTemperature) || "neutral",
    ai_furniture_type: cleanText(result.furnitureType) || "other",
    ai_qualified: result.isQualified === true ? 1 : 0,
    ai_summary: cleanText(result.ownerSummary),
    ai_next_question: cleanText(result.nextQuestion),
    ai_missing_info_json: serializeMissingInfo(result.missingInfo),
    ai_urgency: cleanText(result.urgency) || "low",
    ai_potential_value: cleanText(result.potentialValue) || "low",
    ai_recommended_status: cleanText(result.recommendedStatus) || "new",
    ai_provider: cleanText(metadata.provider),
    ai_model: cleanText(metadata.model),
    ai_processing_time_ms: normalizeProcessingTime(metadata.processingTimeMs),
    ai_error: error,
    ai_analyzed_at: cleanText(metadata.analyzedAt)
  };
}

export function serializeMissingInfo(missingInfo) {
  const items = Array.isArray(missingInfo)
    ? missingInfo
    : typeof missingInfo === "string"
      ? [missingInfo]
      : [];

  return JSON.stringify(
    items
      .map((item) => cleanText(item))
      .filter(Boolean)
  );
}

export function normalizeAiStatus(status) {
  const normalized = cleanText(status)?.toLowerCase();
  return AI_STATUSES.has(normalized) ? normalized : "pending";
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(100, Math.max(1, Math.round(score))) : 1;
}

function normalizeProcessingTime(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
