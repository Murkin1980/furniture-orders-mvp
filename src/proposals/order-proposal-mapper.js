const FURNITURE_LABELS = Object.freeze({
  kitchen: "Кухня",
  cabinet: "Шкаф",
  bathroom: "Мебель для ванной",
  wardrobe: "Гардеробная",
  child: "Детская мебель",
  office: "Офисная мебель",
  hallway: "Прихожая",
  tvzone: "ТВ-зона",
  commercial: "Коммерческая мебель",
  other: "Мебель на заказ"
});

function text(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function parseRawPayload(value) {
  if (!value) return {};
  if (value && typeof value === "object" && !Array.isArray(value)) return structuredClone(value);
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function first(order, raw, ...keys) {
  for (const key of keys) {
    const value = order?.[key] ?? raw?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" }).format(date);
}

function furnitureLabel(value) {
  const normalized = text(value, "other").toLowerCase();
  return FURNITURE_LABELS[normalized] || text(value, FURNITURE_LABELS.other);
}

function calculatorReference(raw) {
  const meta = raw.calculatorMeta && typeof raw.calculatorMeta === "object" ? raw.calculatorMeta : null;
  if (!meta) return null;
  const estimate = Number(meta.estimate);
  return {
    calculatorId: meta.calculatorId ?? null,
    category: text(meta.category),
    estimate: Number.isFinite(estimate) && estimate >= 0 ? estimate : null,
    formulaVersion: meta.formulaVersion ?? null,
    schemaVersion: meta.schemaVersion ?? null
  };
}

export function buildProposalDraftFromOrder(order = {}, options = {}) {
  const source = order && typeof order === "object" ? order : {};
  const raw = parseRawPayload(source.rawPayload ?? source.raw_payload);
  const orderId = Number(source.id);
  const type = first(source, raw, "aiFurnitureType", "ai_furniture_type", "furnitureType", "furniture_type");
  const description = text(first(source, raw, "description", "projectType", "project_type"));
  const city = text(first(source, raw, "city"));
  const district = text(first(source, raw, "district"));
  const address = text(first(source, raw, "address"));
  const phone = text(first(source, raw, "phone"));
  const referenceBudget = Number(first(source, raw, "budget", "budgetRange", "budget_range"));
  const now = options.now ?? new Date();

  return {
    proposalNumber: Number.isInteger(orderId) && orderId > 0 ? `КП-${String(orderId).padStart(4, "0")}` : "",
    date: text(options.date, formatDate(now)),
    company: options.company && typeof options.company === "object" ? structuredClone(options.company) : {},
    customer: {
      name: text(first(source, raw, "clientName", "client_name", "name"), "Не указан"),
      contact: phone ? `Телефон: ${phone}` : "",
      project: [city, district, address].filter(Boolean).join(", ")
    },
    items: [{
      name: furnitureLabel(type),
      specification: description || "Техническая спецификация требует заполнения менеджером",
      unit: "компл.",
      quantity: 1,
      unitPrice: 0
    }],
    totalLabel: text(options.totalLabel, "Итого в тенге:"),
    terms: options.terms && typeof options.terms === "object" ? structuredClone(options.terms) : {},
    directorName: text(options.directorName),
    meta: {
      orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
      source: text(source.source),
      referenceBudget: Number.isFinite(referenceBudget) && referenceBudget >= 0 ? referenceBudget : null,
      calculator: calculatorReference(raw),
      mapperVersion: 1,
      requiresManagerPricing: true
    }
  };
}

