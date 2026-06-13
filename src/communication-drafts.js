export const COMMUNICATION_DRAFT_STATUSES = ["draft", "approved", "rejected"];
export const COMMUNICATION_CHANNELS = ["messenger", "telegram", "whatsapp"];

export async function listCommunicationDrafts({ db, orderId }) {
  const id = normalizeId(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");
  if (!(await orderExists(db, id))) return errorResult(404, "order_not_found", "Order was not found.");

  const rows = await db.prepare(
    `SELECT id, order_id AS orderId, channel, content, status, source, provider,
            model, warnings_json AS warningsJson, created_by AS createdBy,
            approved_by AS approvedBy, approved_at AS approvedAt,
            created_at AS createdAt, updated_at AS updatedAt
     FROM communication_drafts
     WHERE order_id = ?
     ORDER BY created_at DESC, id DESC`
  ).bind(id).all();

  return okResult({ items: (rows?.results || []).map(normalizeRow) });
}

export async function createCommunicationDraft({
  db, orderId, channel = "messenger", content, source = "ai", provider = "",
  model = "", warnings = [], createdBy = "ai"
}) {
  const id = normalizeId(orderId);
  const text = clean(content);
  const normalizedChannel = COMMUNICATION_CHANNELS.includes(channel) ? channel : "messenger";
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");
  if (!text) return errorResult(400, "content_required", "Draft content is required.");
  if (!(await orderExists(db, id))) return errorResult(404, "order_not_found", "Order was not found.");

  const insert = await db.prepare(
    `INSERT INTO communication_drafts
      (order_id, channel, content, status, source, provider, model, warnings_json, created_by)
     VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
  ).bind(id, normalizedChannel, text.slice(0, 4000), clean(source) || "ai", clean(provider) || null,
    clean(model) || null, JSON.stringify(normalizeWarnings(warnings)), clean(createdBy) || "ai").run();

  return okResult({ item: await getDraft(db, insert?.meta?.last_row_id) }, 201);
}

export async function reviewCommunicationDraft({ db, draftId, content, status, approvedBy = "manager" }) {
  const id = normalizeId(draftId);
  const text = clean(content);
  if (!id) return errorResult(400, "invalid_draft_id", "draftId must be a positive integer.");
  if (!["approved", "rejected"].includes(status)) return errorResult(400, "invalid_status", "Review status must be approved or rejected.");
  if (!text) return errorResult(400, "content_required", "Draft content is required.");
  if (!(await getDraft(db, id))) return errorResult(404, "draft_not_found", "Communication draft was not found.");

  await db.prepare(
    `UPDATE communication_drafts
     SET content = ?, status = ?, approved_by = ?,
         approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(text.slice(0, 4000), status, clean(approvedBy) || "manager", status, id).run();

  return okResult({ item: await getDraft(db, id) });
}

async function orderExists(db, orderId) {
  return Boolean(await db.prepare("SELECT id FROM orders WHERE id = ?").bind(orderId).first());
}

async function getDraft(db, draftId) {
  const row = await db.prepare(
    `SELECT id, order_id AS orderId, channel, content, status, source, provider,
            model, warnings_json AS warningsJson, created_by AS createdBy,
            approved_by AS approvedBy, approved_at AS approvedAt,
            created_at AS createdAt, updated_at AS updatedAt
     FROM communication_drafts WHERE id = ?`
  ).bind(draftId).first();
  return row ? normalizeRow(row) : null;
}

function normalizeRow(row) {
  return { ...row, warnings: normalizeWarnings(row.warningsJson) };
}

function normalizeWarnings(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 10);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function normalizeId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function okResult(body, status = 200) { return { ok: true, status, body: { success: true, ...body } }; }
function errorResult(status, error, message) { return { ok: false, status, body: { success: false, error, message } }; }
