import { analyzeLead } from "./analyze-lead.js";
import { buildOrderAiUpdate } from "./order-ai-result.js";

export async function analyzeOrderWithAiCore({ db }, orderId, options = {}) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  const normalizedOrderId = Number(orderId);
  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId < 1) {
    return result(400, {
      success: false,
      error: "invalid_order_id",
      message: "orderId must be a positive integer."
    });
  }

  const order = await db
    .prepare(
      `SELECT
        orders.id,
        orders.source,
        orders.city,
        orders.furniture_type AS furnitureType,
        orders.budget,
        orders.description,
        clients.name,
        clients.phone
       FROM orders
       JOIN clients ON clients.id = orders.client_id
       WHERE orders.id = ?`
    )
    .bind(normalizedOrderId)
    .first();

  if (!order) {
    return result(404, {
      success: false,
      error: "order_not_found",
      message: "Order was not found."
    });
  }

  const aiResult = await analyzeLead(order, options);
  const update = buildOrderAiUpdate(aiResult, {
    ...aiResult.meta,
    analyzedAt: options.analyzedAt || new Date().toISOString()
  });

  await db
    .prepare(
      `UPDATE orders
       SET ai_status = ?,
           ai_score = ?,
           ai_temperature = ?,
           ai_furniture_type = ?,
           ai_qualified = ?,
           ai_summary = ?,
           ai_next_question = ?,
           ai_missing_info_json = ?,
           ai_urgency = ?,
           ai_potential_value = ?,
           ai_recommended_status = ?,
           ai_provider = ?,
           ai_model = ?,
           ai_processing_time_ms = ?,
           ai_error = ?,
           ai_analyzed_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(...Object.values(update), normalizedOrderId)
    .run();

  return result(200, {
    success: true,
    orderId: normalizedOrderId,
    ai: aiResult,
    update
  });
}

function result(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}
