const EXCLUDED_KEYS = new Set([
  "phone", "email", "address", "raw_payload",
  "clientId", "clientName", "clientPhone",
  "notes", "status"
]);

const ALLOWED_ORDER_KEYS = new Set([
  "id", "source", "city", "furnitureType", "budget",
  "description", "calculatorMeta", "createdAt"
]);

export function buildHermesPayload(order = {}) {
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    return null;
  }

  const orderId = Number(order.id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return null;
  }

  const safeOrder = {};
  for (const key of ALLOWED_ORDER_KEYS) {
    if (key === "id") {
      safeOrder.id = orderId;
    } else if (Object.hasOwn(order, key) && !EXCLUDED_KEYS.has(key)) {
      safeOrder[key] = order[key];
    }
  }

  if (safeOrder.description) {
    safeOrder.description = sanitizeHermesFreeText(safeOrder.description);
  }
  if (safeOrder.calculatorMeta && typeof safeOrder.calculatorMeta === "object") {
    safeOrder.calculatorMeta = sanitizeCalculatorMeta(safeOrder.calculatorMeta);
  }

  return {
    eventType: "order.created",
    schemaVersion: 1,
    order: safeOrder
  };
}

const PHONE_PATTERN = /(\+?7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_DESCRIPTION_LENGTH = 2000;

export function sanitizeHermesFreeText(text) {
  if (typeof text !== "string" || !text.trim()) return text;

  let result = text
    .replace(PHONE_PATTERN, "[phone]")
    .replace(EMAIL_PATTERN, "[email]");

  if (result.length > MAX_DESCRIPTION_LENGTH) {
    result = result.slice(0, MAX_DESCRIPTION_LENGTH) + "...";
  }

  return result;
}

function sanitizeCalculatorMeta(meta) {
  if (Array.isArray(meta)) return null;
  const allowed = {
    calculatorId: normalizeInt(meta.calculatorId),
    categoryCode: normalizeString(meta.categoryCode),
    estimate: normalizeInt(meta.estimate),
    formulaVersion: normalizeInt(meta.formulaVersion),
    schemaVersion: normalizeInt(meta.schemaVersion)
  };

  const hasAny = Object.values(allowed).some((v) => v !== undefined);
  return hasAny ? allowed : null;
}

function normalizeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function normalizeString(value) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}
