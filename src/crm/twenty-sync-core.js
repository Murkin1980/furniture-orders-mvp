import { buildTwentySyncRequests } from "./twenty-request-builder.js";

export async function syncOrderToTwentyCore({ db, env = {} }, orderId, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");

  const normalizedOrderId = Number(orderId);
  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId < 1) {
    return result(400, {
      success: false,
      error: "invalid_order_id",
      message: "orderId must be a positive integer."
    });
  }

  const order = await selectOrder(db, normalizedOrderId);
  if (!order) {
    return result(404, {
      success: false,
      error: "order_not_found",
      message: "Order was not found."
    });
  }

  const attemptedAt = options.attemptedAt || new Date().toISOString();
  if (env.TWENTY_SYNC_ENABLED !== "true") {
    return saveFailure(db, normalizedOrderId, attemptedAt, "Twenty sync is disabled.");
  }
  if (typeof options.sendRequest !== "function") {
    return saveFailure(db, normalizedOrderId, attemptedAt, "Twenty sender is not configured.");
  }

  let sync;
  try {
    sync = buildTwentySyncRequests(order, env);
  } catch (error) {
    return saveFailure(db, normalizedOrderId, attemptedAt, errorMessage(error));
  }

  const createdIds = {};
  const responses = [];
  try {
    for (const request of sync.requests) {
      const response = await options.sendRequest(request);
      responses.push(response);
      createdIds[request.resource] = extractCreatedId(response, request.resource);
    }
  } catch (error) {
    return saveFailure(db, normalizedOrderId, attemptedAt, errorMessage(error), createdIds);
  }

  await saveSyncState(db, normalizedOrderId, {
    status: "success",
    personId: createdIds.person,
    opportunityId: createdIds.opportunity,
    noteId: createdIds.note,
    error: null,
    attemptedAt,
    syncedAt: options.syncedAt || attemptedAt
  });

  return result(200, {
    success: true,
    orderId: normalizedOrderId,
    sync: {
      status: "success",
      createdIds,
      requestCount: responses.length,
      attemptedAt,
      syncedAt: options.syncedAt || attemptedAt
    }
  });
}

async function selectOrder(db, orderId) {
  return db.prepare(
    `SELECT
      orders.id,
      orders.source,
      orders.city,
      orders.furniture_type AS furnitureType,
      orders.budget,
      orders.description,
      orders.notes,
      orders.status,
      orders.raw_payload AS rawPayload,
      orders.ai_status AS aiStatus,
      orders.ai_score AS aiScore,
      orders.ai_temperature AS aiTemperature,
      orders.ai_furniture_type AS aiFurnitureType,
      orders.ai_summary AS aiSummary,
      orders.ai_next_question AS aiNextQuestion,
      orders.ai_missing_info_json AS aiMissingInfoJson,
      orders.ai_urgency AS aiUrgency,
      orders.ai_potential_value AS aiPotentialValue,
      orders.ai_recommended_status AS aiRecommendedStatus,
      clients.name,
      clients.phone
     FROM orders
     JOIN clients ON clients.id = orders.client_id
     WHERE orders.id = ?`
  ).bind(orderId).first();
}

async function saveFailure(db, orderId, attemptedAt, error, createdIds = {}) {
  await saveSyncState(db, orderId, {
    status: "failed",
    personId: createdIds.person,
    opportunityId: createdIds.opportunity,
    noteId: createdIds.note,
    error,
    attemptedAt,
    syncedAt: null
  });

  return result(200, {
    success: true,
    orderId,
    sync: {
      status: "failed",
      createdIds,
      error,
      attemptedAt,
      syncedAt: null
    }
  });
}

async function saveSyncState(db, orderId, state) {
  await db.prepare(
    `UPDATE orders
     SET crm_sync_status = ?,
         crm_person_id = ?,
         crm_opportunity_id = ?,
         crm_note_id = ?,
         crm_error = ?,
         crm_last_attempt_at = ?,
         crm_synced_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    state.status,
    state.personId || null,
    state.opportunityId || null,
    state.noteId || null,
    state.error || null,
    state.attemptedAt,
    state.syncedAt,
    orderId
  ).run();
}

function extractCreatedId(response, resource) {
  const data = response?.data;
  if (!data || typeof data !== "object") return null;

  // Twenty REST returns { data: { createPerson: { id: ... }, createOpportunity: ..., createNote: ... } }
  const mutationKey = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  const nested = data[mutationKey];
  if (nested && typeof nested === "object" && nested.id) return nested.id;

  // Fallback for direct responses
  return data?.data?.id ?? data?.id ?? null;
}

function errorMessage(error) {
  return error instanceof Error && error.message ? error.message : "Twenty sync failed.";
}

function result(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}
