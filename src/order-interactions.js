export const INTERACTION_TYPES = ["call", "message", "meeting", "measurement", "note"];

export async function listOrderInteractions({ db, orderId }) {
  const id = normalizeOrderId(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");

  const order = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (!order) return errorResult(404, "order_not_found", "Order was not found.");

  const result = await db.prepare(
    `SELECT id, order_id AS orderId, type, summary, created_by AS createdBy, created_at AS createdAt
     FROM order_interactions WHERE order_id = ? ORDER BY created_at DESC, id DESC`
  ).bind(id).all();

  return okResult({ items: result?.results || [] });
}

export async function createOrderInteraction({ db, orderId, type, summary, createdBy = "manager" }) {
  const id = normalizeOrderId(orderId);
  const normalizedType = clean(type);
  const normalizedSummary = clean(summary);
  const normalizedCreatedBy = clean(createdBy) || "manager";

  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");
  if (!INTERACTION_TYPES.includes(normalizedType)) {
    return errorResult(400, "invalid_interaction_type", "Interaction type is not supported.");
  }
  if (!normalizedSummary) return errorResult(400, "summary_required", "Interaction summary is required.");

  const order = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (!order) return errorResult(404, "order_not_found", "Order was not found.");

  const insert = await db.prepare(
    `INSERT INTO order_interactions (order_id, type, summary, created_by)
     VALUES (?, ?, ?, ?)`
  ).bind(id, normalizedType, normalizedSummary, normalizedCreatedBy).run();
  const interactionId = insert?.meta?.last_row_id;

  const item = await db.prepare(
    `SELECT id, order_id AS orderId, type, summary, created_by AS createdBy, created_at AS createdAt
     FROM order_interactions WHERE id = ?`
  ).bind(interactionId).first();

  return okResult({ item }, 201);
}

function normalizeOrderId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function okResult(body, status = 200) {
  return { ok: true, status, body: { success: true, ...body } };
}

function errorResult(status, error, message) {
  return { ok: false, status, body: { success: false, error, message } };
}
