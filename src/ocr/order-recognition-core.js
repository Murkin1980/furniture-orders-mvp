import { recognizeImage } from "./recognize-image.js";
import { buildRecognitionRecordCreate, parseStoredRecognitionResult } from "./recognition-record.js";

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
    provider: options.provider,
    model: options.model,
    processingTimeMs: recognition.meta?.processingTimeMs,
    error: recognition.meta?.error || (recognition.meta?.parseFailed ? "Recognition response could not be parsed." : ""),
    createdBy: options.createdBy
  });

  const insert = await db.prepare(
    `INSERT INTO ocr_recognitions
      (order_id, media_id, status, result_json, provider, model,
       processing_time_ms, error, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...Object.values(payload)).run();

  return okResult({
    item: {
      id: insert?.meta?.last_row_id ?? null,
      orderId: id,
      mediaId: payload.media_id,
      status: payload.status,
      result: parseStoredRecognitionResult(payload.result_json),
      provider: payload.provider,
      model: payload.model,
      processingTimeMs: payload.processing_time_ms,
      error: payload.error
    }
  }, 201);
}

function normalizeId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function isPlainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function okResult(body, status = 200) { return { ok: true, status, body: { success: true, ...body } }; }
function errorResult(status, error, message) { return { ok: false, status, body: { success: false, error, message } }; }
