import { buildHermesPayload } from "./hermes-request-builder.js";
import { sendToHermes } from "./hermes-client.js";
import { normalizeHermesResult } from "./hermes-result.js";
import { createCommunicationDraft } from "../communication-drafts.js";

const HERMES_ENABLED_KEY = "HERMES_AGENT_ENABLED";
const HERMES_WEBHOOK_KEY = "HERMES_AGENT_WEBHOOK_URL";
const HERMES_TOKEN_KEY = "HERMES_AGENT_TOKEN";
const HERMES_TIMEOUT_KEY = "HERMES_AGENT_TIMEOUT_MS";

export async function analyzeOrderWithHermesCore({ db }, orderId, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");

  const id = Number(orderId);
  if (!Number.isInteger(id) || id < 1) {
    return result(400, { success: false, error: "invalid_order_id", message: "orderId must be a positive integer." });
  }

  const order = await db.prepare(
    `SELECT orders.id, orders.source, orders.city, orders.furniture_type AS furnitureType,
            orders.budget, orders.description, orders.raw_payload, orders.created_at AS createdAt
     FROM orders WHERE orders.id = ?`
  ).bind(id).first();

  if (!order) {
    return result(404, { success: false, error: "order_not_found", message: "Order was not found." });
  }

  const env = options.env || {};
  const enabled = env[HERMES_ENABLED_KEY] === "true";
  if (!enabled) {
    return result(503, { success: false, error: "hermes_agent_disabled", message: "Hermes Agent is disabled." });
  }

  const payload = buildHermesPayload({
    id: order.id,
    source: order.source,
    city: order.city,
    furnitureType: order.furnitureType,
    budget: order.budget,
    description: order.description,
    calculatorMeta: safeParseCalculatorMeta(order.raw_payload),
    createdAt: order.createdAt
  });

  if (!payload) {
    return result(400, { success: false, error: "hermes_agent_invalid_order", message: "Could not build Hermes payload from order." });
  }

  const hermesResult = await sendToHermes(payload, {
    enabled: true,
    webhookUrl: env[HERMES_WEBHOOK_KEY],
    token: env[HERMES_TOKEN_KEY],
    fetchFn: options.sendHermesRequest,
    timeoutMs: Number(env[HERMES_TIMEOUT_KEY]) || 4000
  });

  if (!hermesResult.ok) {
    return result(502, {
      success: false,
      orderId: id,
      error: hermesResult.error,
      message: hermesResult.message
    });
  }

  const normalized = normalizeHermesResult(hermesResult.data);
  let draft = null;

  if (normalized.replyDraft) {
    try {
      const draftResult = await createCommunicationDraft({
        db,
        orderId: id,
        content: normalized.replyDraft,
        source: "ai",
        provider: "hermes",
        warnings: normalized.warnings
      });
      if (draftResult.ok) {
        draft = draftResult.body.item;
      }
    } catch {
      // Draft save failure does not break the Hermes response
    }
  }

  return result(200, {
    success: true,
    orderId: id,
    hermes: normalized,
    draft
  });
}

export async function notifyHermesAgent({ db, env = {}, order, payload: orderData, fetchImpl = globalThis.fetch }) {
  if (env[HERMES_ENABLED_KEY] !== "true") {
    return { sent: false, skipped: true };
  }

  const webhookUrl = env[HERMES_WEBHOOK_KEY];
  const token = env[HERMES_TOKEN_KEY];
  if (!webhookUrl || !token) {
    return { sent: false, skipped: true };
  }

  try {
    const hermesPayload = buildHermesPayload({
      id: order.id,
      source: orderData.source,
      city: orderData.city,
      furnitureType: orderData.furnitureType,
      budget: orderData.budget,
      description: orderData.description,
      calculatorMeta: orderData.calculatorMeta,
      createdAt: new Date().toISOString()
    });

    if (!hermesPayload) {
      return { sent: false, skipped: true };
    }

    const result = await sendToHermes(hermesPayload, {
      enabled: true,
      webhookUrl,
      token,
      fetchFn: fetchImpl,
      timeoutMs: Number(env[HERMES_TIMEOUT_KEY]) || 4000
    });

    if (!result.ok || !result.data) {
      return { sent: false, skipped: false };
    }

    const normalized = normalizeHermesResult(result.data);

    if (normalized.replyDraft && db) {
      try {
        await createCommunicationDraft({
          db,
          orderId: order.id,
          content: normalized.replyDraft,
          source: "ai",
          provider: "hermes",
          warnings: normalized.warnings
        });
      } catch {
        // Draft save failure is non-critical
      }
    }

    return { sent: true, skipped: false };
  } catch {
    return { sent: false, skipped: false };
  }
}

export function getHermesEnvConfig(env = {}) {
  return {
    enabled: env[HERMES_ENABLED_KEY] === "true",
    webhookUrl: env[HERMES_WEBHOOK_KEY] || "",
    token: env[HERMES_TOKEN_KEY] || "",
    timeoutMs: Number(env[HERMES_TIMEOUT_KEY]) || 4000
  };
}

function safeParseCalculatorMeta(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "string") return null;
  try {
    const parsed = JSON.parse(rawPayload);
    return parsed?.calculatorMeta || null;
  } catch {
    return null;
  }
}

function result(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}
