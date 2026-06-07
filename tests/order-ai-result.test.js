import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultAiResult } from "../src/ai/parse-ai-response.js";
import {
  buildOrderAiUpdate,
  normalizeAiStatus,
  serializeMissingInfo
} from "../src/ai/order-ai-result.js";

const aiResult = {
  furnitureType: "kitchen",
  isQualified: true,
  leadScore: 88,
  leadTemperature: "hot",
  missingInfo: ["dimensions", "materials"],
  nextQuestion: "Какие размеры помещения?",
  urgency: "high",
  potentialValue: "high",
  recommendedStatus: "qualified",
  ownerSummary: "Клиент готов к замеру."
};

test("maps normalized AI result to order update fields", () => {
  const update = buildOrderAiUpdate(aiResult);

  assert.deepEqual(update, {
    ai_status: "success",
    ai_score: 88,
    ai_temperature: "hot",
    ai_furniture_type: "kitchen",
    ai_qualified: 1,
    ai_summary: "Клиент готов к замеру.",
    ai_next_question: "Какие размеры помещения?",
    ai_missing_info_json: '["dimensions","materials"]',
    ai_urgency: "high",
    ai_potential_value: "high",
    ai_recommended_status: "qualified",
    ai_provider: null,
    ai_model: null,
    ai_processing_time_ms: null,
    ai_error: null,
    ai_analyzed_at: null
  });
});

test("serializes missingInfo array as JSON", () => {
  assert.equal(serializeMissingInfo(["budget", " dimensions ", null]), '["budget","dimensions"]');
});

test("serializes missingInfo string as a JSON array", () => {
  assert.equal(serializeMissingInfo("budget"), '["budget"]');
});

test("maps provider metadata to order update fields", () => {
  const update = buildOrderAiUpdate(aiResult, {
    provider: "groq",
    model: "custom/model",
    processingTimeMs: 42.4,
    error: "Provider unavailable",
    analyzedAt: "2026-06-07T12:00:00.000Z"
  });

  assert.equal(update.ai_provider, "groq");
  assert.equal(update.ai_model, "custom/model");
  assert.equal(update.ai_processing_time_ms, 42);
  assert.equal(update.ai_error, "Provider unavailable");
  assert.equal(update.ai_analyzed_at, "2026-06-07T12:00:00.000Z");
});

test("uses success status for a normal result", () => {
  assert.equal(buildOrderAiUpdate(aiResult).ai_status, "success");
});

test("uses failed status when metadata contains an error", () => {
  assert.equal(buildOrderAiUpdate(aiResult, { error: "timeout" }).ai_status, "failed");
});

test("normalizes supported and unknown AI statuses", () => {
  assert.equal(normalizeAiStatus(" SUCCESS "), "success");
  assert.equal(normalizeAiStatus("unknown"), "pending");
  assert.equal(normalizeAiStatus(null), "pending");
});

test("does not mutate AI result or metadata", () => {
  const result = structuredClone(aiResult);
  const meta = { provider: "openai", processingTimeMs: 10 };
  const resultSnapshot = structuredClone(result);
  const metaSnapshot = structuredClone(meta);

  buildOrderAiUpdate(result, meta);

  assert.deepEqual(result, resultSnapshot);
  assert.deepEqual(meta, metaSnapshot);
});

test("handles empty and default results safely", () => {
  const emptyUpdate = buildOrderAiUpdate();
  const defaultUpdate = buildOrderAiUpdate(getDefaultAiResult());

  assert.deepEqual(emptyUpdate, defaultUpdate);
  assert.equal(emptyUpdate.ai_status, "success");
  assert.equal(emptyUpdate.ai_score, 1);
  assert.equal(emptyUpdate.ai_missing_info_json, "[]");
  assert.equal(emptyUpdate.ai_qualified, 0);
});
