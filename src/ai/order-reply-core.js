import { suggestReply } from "./suggest-reply.js";

export async function suggestOrderReplyCore({ db }, orderId, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");

  const id = Number(orderId);
  if (!Number.isInteger(id) || id < 1) {
    return result(400, { success: false, error: "invalid_order_id", message: "orderId must be a positive integer." });
  }

  const order = await db.prepare(
    `SELECT id, city, furniture_type AS furnitureType, budget, description,
            ai_furniture_type AS aiFurnitureType, ai_summary AS aiSummary,
            ai_next_question AS aiNextQuestion, ai_missing_info_json AS aiMissingInfoJson
     FROM orders WHERE id = ?`
  ).bind(id).first();

  if (!order) {
    return result(404, { success: false, error: "order_not_found", message: "Order was not found." });
  }

  const suggestion = await suggestReply(order, options);
  return result(suggestion.meta?.error ? 502 : 200, {
    success: !suggestion.meta?.error,
    orderId: id,
    suggestion
  });
}
function result(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}
