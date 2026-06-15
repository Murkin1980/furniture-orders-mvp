import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultRecognitionResult } from "../src/ocr/recognition-result.js";
import {
  buildRecognitionRecordCreate, buildRecognitionReviewUpdate,
  normalizeRecognitionStatus, parseStoredRecognitionResult, serializeRecognitionResult
} from "../src/ocr/recognition-record.js";

const result = {
  documentType: "furniture_sketch", furnitureType: "kitchen", rawText: "3200",
  dimensions: [{ label: "width", value: 3200, unit: "mm", confidence: 0.9, sourceText: "3200" }],
  components: ["base cabinets"], materials: [], notes: [], warnings: [],
  missingInfo: ["height"], confidence: 0.8
};

test("builds a draft create payload with recognition metadata", () => {
  const payload = buildRecognitionRecordCreate(result, {
    orderId: "7", mediaId: 12, provider: "vision-provider", model: "vision-1",
    processingTimeMs: 42.6, createdBy: "manager-1", consentStatus: "confirmed",
    consentPolicyVersion: "ocr-consent-v1", consentConfirmedBy: "manager-1",
    consentConfirmedAt: "2026-06-14T12:00:00Z", retentionUntil: "2026-07-14T12:00:00Z"
  });
  assert.equal(payload.order_id, 7);
  assert.equal(payload.media_id, "12");
  assert.equal(payload.image_source, null);
  assert.equal(payload.status, "draft");
  assert.equal(payload.processing_time_ms, 43);
  assert.equal(payload.created_by, "manager-1");
  assert.equal(payload.consent_status, "confirmed");
  assert.equal(payload.consent_policy_version, "ocr-consent-v1");
  assert.deepEqual(JSON.parse(payload.result_json).dimensions, result.dimensions);
});

test("failed recognition creates a failed record with a safe result", () => {
  const payload = buildRecognitionRecordCreate(undefined, { orderId: 1, error: "Provider unavailable" });
  assert.equal(payload.status, "failed");
  assert.equal(payload.error, "Provider unavailable");
  assert.deepEqual(JSON.parse(payload.result_json), getDefaultRecognitionResult());
});

test("serializes normalized recognition fields without meta", () => {
  const parsed = JSON.parse(serializeRecognitionResult({ ...result, meta: { error: "not stored" } }));
  assert.equal(Object.hasOwn(parsed, "meta"), false);
  assert.equal(parsed.furnitureType, "kitchen");
});

test("parses stored JSON and safely handles invalid JSON", () => {
  assert.equal(parseStoredRecognitionResult(JSON.stringify(result)).rawText, "3200");
  assert.deepEqual(parseStoredRecognitionResult("{bad"), getDefaultRecognitionResult());
});

test("review update distinguishes approved and rejected records", () => {
  const approved = buildRecognitionReviewUpdate(result, {
    status: "approved", reviewedBy: "manager-1", reviewedAt: "2026-06-14T12:00:00Z"
  });
  const rejected = buildRecognitionReviewUpdate(result, { status: "rejected" });
  assert.equal(approved.status, "approved");
  assert.equal(approved.reviewed_by, "manager-1");
  assert.equal(approved.reviewed_at, "2026-06-14T12:00:00Z");
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.reviewed_by, "manager");
});

test("draft review clears reviewer metadata", () => {
  const update = buildRecognitionReviewUpdate(result, { status: "draft", reviewedBy: "manager", reviewedAt: "now" });
  assert.equal(update.status, "draft");
  assert.equal(update.reviewed_by, null);
  assert.equal(update.reviewed_at, null);
});

test("normalizes unknown recognition status to draft", () => {
  assert.equal(normalizeRecognitionStatus(" APPROVED "), "approved");
  assert.equal(normalizeRecognitionStatus("unknown"), "draft");
  assert.equal(normalizeRecognitionStatus(null), "draft");
});

test("does not mutate result or metadata", () => {
  const input = structuredClone(result);
  const meta = { orderId: 1, provider: "test" };
  const inputSnapshot = structuredClone(input);
  const metaSnapshot = structuredClone(meta);
  buildRecognitionRecordCreate(input, meta);
  buildRecognitionReviewUpdate(input, { status: "approved" });
  assert.deepEqual(input, inputSnapshot);
  assert.deepEqual(meta, metaSnapshot);
});

test("handles empty input safely and never returns undefined", () => {
  const payload = buildRecognitionRecordCreate();
  assert.equal(payload.order_id, null);
  assert.deepEqual(JSON.parse(payload.result_json), getDefaultRecognitionResult());
  assert.equal(JSON.stringify(payload).includes("undefined"), false);
});

test("does not persist large image data URLs in D1 record payload", () => {
  const payload = buildRecognitionRecordCreate(result, {
    orderId: 1,
    mediaId: "synthetic-image",
    imageSource: "data:image/png;base64,AAAA"
  });
  assert.equal(payload.image_source, null);
  assert.equal(payload.media_id, "synthetic-image");
});
