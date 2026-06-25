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

  if (safeOrder.calculatorMeta && typeof safeOrder.calculatorMeta === "object") {
    safeOrder.calculatorMeta = sanitizeCalculatorMeta(safeOrder.calculatorMeta);
  }

  return {
    eventType: "order.created",
    schemaVersion: 1,
    order: safeOrder
  };
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
