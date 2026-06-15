import { recognizeImage } from "./recognize-image.js";
import {
  buildRecognitionRecordCreate,
  buildRecognitionReviewUpdate,
  parseStoredRecognitionResult
} from "./recognition-record.js";
import { buildRecognitionDeletionAudit } from "./recognition-consent.js";
import { getDefaultRecognitionResult } from "./recognition-result.js";

export async function recognizeOrderImageCore({ db }, orderId, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");

  const id = normalizeId(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");
  if (!clean(input?.image?.source)) {
    return errorResult(400, "image_source_required", "A stored image source is required.");
  }

  const order = await db.prepare(
    `SELECT id, source, city, furniture_type AS furnitureType, budget, description
     FROM orders WHERE id = ?`
  ).bind(id).first();
  if (!order) return errorResult(404, "order_not_found", "Order was not found.");

  const recognition = await recognizeImage({
    context: { ...order, ...(isPlainObject(input.context) ? input.context : {}) },
    image: input.image,
    options: input.options
  }, options);
  const payload = buildRecognitionRecordCreate(recognition, {
    orderId: id,
    mediaId: input.image.mediaId ?? input.image.media_id,
    imageSource: input.image.source,
    provider: options.provider,
    model: options.model,
    processingTimeMs: recognition.meta?.processingTimeMs,
    error: recognition.meta?.error || (recognition.meta?.parseFailed ? "Recognition response could not be parsed." : ""),
    createdBy: options.createdBy,
    consentStatus: options.consentAudit?.status,
    consentPolicyVersion: options.consentAudit?.policyVersion,
    consentConfirmedBy: options.consentAudit?.confirmedBy,
    consentConfirmedAt: options.consentAudit?.confirmedAt,
    retentionUntil: options.consentAudit?.retentionUntil
  });

  const insert = await db.prepare(
    `INSERT INTO ocr_recognitions
      (order_id, media_id, image_source, status, result_json, provider, model,
       processing_time_ms, error, created_by, consent_status,
       consent_policy_version, consent_confirmed_by, consent_confirmed_at,
       retention_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...Object.values(payload)).run();

  return okResult({
    item: {
      id: insert?.meta?.last_row_id ?? null,
      orderId: id,
      mediaId: payload.media_id,
      imageSource: payload.image_source,
      status: payload.status,
      result: parseStoredRecognitionResult(payload.result_json),
      provider: payload.provider,
      model: payload.model,
      processingTimeMs: payload.processing_time_ms,
      error: payload.error,
      consentStatus: payload.consent_status,
      consentPolicyVersion: payload.consent_policy_version,
      consentConfirmedBy: payload.consent_confirmed_by,
      consentConfirmedAt: payload.consent_confirmed_at,
      retentionUntil: payload.retention_until
    }
  }, 201);
}

export async function listOrderRecognitionsCore({ db }, orderId) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = normalizeId(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");
  if (!(await db.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first())) {
    return errorResult(404, "order_not_found", "Order was not found.");
  }
  const rows = await db.prepare(
    `SELECT id, order_id AS orderId, media_id AS mediaId, image_source AS imageSource,
            status, result_json AS resultJson, provider, model,
            processing_time_ms AS processingTimeMs, error, created_by AS createdBy,
            reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
            consent_status AS consentStatus, consent_policy_version AS consentPolicyVersion,
            consent_confirmed_by AS consentConfirmedBy, consent_confirmed_at AS consentConfirmedAt,
            retention_until AS retentionUntil, deleted_by AS deletedBy,
            deleted_at AS deletedAt, deletion_reason AS deletionReason,
            created_at AS createdAt, updated_at AS updatedAt
     FROM ocr_recognitions WHERE order_id = ? ORDER BY created_at DESC, id DESC`
  ).bind(id).all();
  return okResult({ items: (rows?.results || []).map(normalizeRecord) });
}

export async function reviewOrderRecognitionCore({ db }, orderId, input = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = normalizeId(orderId);
  const recognitionId = normalizeId(input.recognitionId);
  if (!id || !recognitionId) return errorResult(400, "invalid_review_request", "Order and recognition IDs must be positive integers.");
  if (!isPlainObject(input.result)) return errorResult(400, "recognition_result_required", "A reviewed recognition result is required.");
  const existing = await db.prepare(
    "SELECT id, order_id AS orderId, status, deleted_at AS deletedAt FROM ocr_recognitions WHERE id = ? AND order_id = ?"
  ).bind(recognitionId, id).first();
  if (!existing) return errorResult(404, "recognition_not_found", "Recognition record was not found.");
  if (existing.deletedAt || existing.status === "deleted") {
    return errorResult(409, "recognition_deleted", "Deleted recognition data cannot be reviewed.");
  }

  const update = buildRecognitionReviewUpdate(input.result, {
    status: input.status, reviewedBy: input.reviewedBy, reviewedAt: input.reviewedAt
  });
  if (!["approved", "rejected"].includes(update.status)) {
    return errorResult(400, "invalid_review_status", "Review status must be approved or rejected.");
  }
  await db.prepare(
    `UPDATE ocr_recognitions SET status = ?, result_json = ?, reviewed_by = ?,
       reviewed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND order_id = ?`
  ).bind(update.status, update.result_json, update.reviewed_by, update.reviewed_at, recognitionId, id).run();
  const row = await db.prepare(
    `SELECT id, order_id AS orderId, media_id AS mediaId, image_source AS imageSource,
            status, result_json AS resultJson, provider, model,
            processing_time_ms AS processingTimeMs, error, created_by AS createdBy,
            reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
            consent_status AS consentStatus, consent_policy_version AS consentPolicyVersion,
            consent_confirmed_by AS consentConfirmedBy, consent_confirmed_at AS consentConfirmedAt,
            retention_until AS retentionUntil, deleted_by AS deletedBy,
            deleted_at AS deletedAt, deletion_reason AS deletionReason,
            created_at AS createdAt, updated_at AS updatedAt
     FROM ocr_recognitions WHERE id = ?`
  ).bind(recognitionId).first();
  return okResult({ item: normalizeRecord(row) });
}

export async function deleteOrderRecognitionCore({ db, deleteStoredImage }, orderId, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = normalizeId(orderId);
  const recognitionId = normalizeId(input.recognitionId);
  if (!id || !recognitionId) return errorResult(400, "invalid_deletion_request", "Order and recognition IDs must be positive integers.");

  const audit = buildRecognitionDeletionAudit(input, options);
  if (!audit.ok) return errorResult(400, audit.error, audit.message);

  const existing = await db.prepare(
    `SELECT id, order_id AS orderId, media_id AS mediaId, image_source AS imageSource,
            status, deleted_at AS deletedAt
     FROM ocr_recognitions WHERE id = ? AND order_id = ?`
  ).bind(recognitionId, id).first();
  if (!existing) return errorResult(404, "recognition_not_found", "Recognition record was not found.");
  if (existing.deletedAt || existing.status === "deleted") {
    return errorResult(409, "recognition_already_deleted", "Recognition data was already deleted.");
  }
  if (existing.imageSource && !clean(existing.mediaId)) {
    return errorResult(409, "ocr_storage_key_missing", "Stored image deletion requires a media ID.");
  }
  if (existing.imageSource && typeof deleteStoredImage !== "function") {
    return errorResult(503, "ocr_storage_deletion_unavailable", "Stored image deletion is not configured.");
  }
  if (existing.imageSource) {
    await deleteStoredImage({ mediaId: existing.mediaId, imageSource: existing.imageSource });
  }

  await db.prepare(
    `UPDATE ocr_recognitions SET status = 'deleted', result_json = ?, image_source = NULL,
       deleted_by = ?, deleted_at = ?, deletion_reason = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND order_id = ?`
  ).bind(
    JSON.stringify(getDefaultRecognitionResult()),
    audit.deletedBy,
    audit.deletedAt,
    audit.reason,
    recognitionId,
    id
  ).run();

  return okResult({
    item: {
      id: recognitionId,
      orderId: id,
      status: "deleted",
      imageSource: null,
      deletedBy: audit.deletedBy,
      deletedAt: audit.deletedAt,
      deletionReason: audit.reason
    }
  });
}

function normalizeRecord(row) {
  return row ? { ...row, result: parseStoredRecognitionResult(row.resultJson) } : null;
}

function normalizeId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function okResult(body, status = 200) { return { ok: true, status, body: { success: true, ...body } }; }
function errorResult(status, error, message) { return { ok: false, status, body: { success: false, error, message } }; }
