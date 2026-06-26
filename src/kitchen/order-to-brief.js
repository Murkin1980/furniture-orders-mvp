import { normalizeKitchenBrief } from "./brief.js";

export function mapOrderToKitchenBrief(order = {}) {
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    return { ok: false, error: "invalid_order", brief: null };
  }

  const furnitureType = clean(order.furnitureType || order.furniture_type || "");
  if (furnitureType !== "kitchen" && furnitureType !== "Кухня".toLowerCase()) {
    return { ok: false, error: "not_a_kitchen_order", brief: null };
  }

  const rawPayload = parseRawPayload(order.raw_payload || order.rawPayload);
  const calculatorMeta = rawPayload?.calculatorMeta || null;

  const description = clean(order.description) || "";
  const layout = guessLayout(description, calculatorMeta);
  const wallAmm = extractWallLength(description) || null;
  const ceilingHeightMm = 2700;

  return normalizeKitchenBrief({
    sourceType: "order",
    sourceRef: { orderId: normalizeInt(order.id || order.orderId) },
    customer: {
      name: clean(order.name || order.clientName),
      phone: clean(order.phone),
      city: clean(order.city)
    },
    kitchen: {
      layout,
      room: {
        wallAmm,
        wallBmm: null,
        ceilingHeightMm
      },
      modules: buildDefaultModules(layout, wallAmm)
    },
    commercial: {
      budgetKzt: normalizeInt(order.budget),
      estimateKzt: calculatorMeta?.estimate ? normalizeInt(calculatorMeta.estimate) : null,
      calculatorMeta
    },
    notes: description ? [description.slice(0, 500)] : []
  });
}

function guessLayout(description, calculatorMeta) {
  const lower = description.toLowerCase();
  if (lower.includes("углов") || lower.includes("l-образ") || lower.includes("г-образ")) return "l";
  if (lower.includes("п-образ") || lower.includes("u-образ")) return "u";
  if (lower.includes("остров")) return "island";
  if (lower.includes("галере") || lower.includes("две стен")) return "galley";
  return "straight";
}

function extractWallLength(description) {
  const match = description.match(/(\d+(?:[.,]\d+)?)\s*метр/);
  if (match) return Math.round(Number(match[1].replace(",", ".")) * 1000);
  return null;
}

function buildDefaultModules(layout, wallAmm) {
  if (!wallAmm) return [];
  const units = Math.floor(wallAmm / 600);
  const modules = [];
  for (let i = 0; i < units && i < 6; i++) {
    modules.push({
      zone: "base", wall: "A", type: i === 0 ? "sink-base" : "base-cabinet", widthMm: 600
    });
  }
  for (let i = 0; i < units && i < 4; i++) {
    modules.push({
      zone: "wall", wall: "A", type: "wall-cabinet", widthMm: 600
    });
  }
  return modules;
}

function parseRawPayload(value) {
  if (!value || typeof value !== "string") return null;
  try { return JSON.parse(value); }
  catch { return null; }
}

function normalizeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}
