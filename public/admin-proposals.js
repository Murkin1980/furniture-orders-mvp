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

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function parseRawPayload(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function first(source, raw, ...keys) {
  for (const key of keys) {
    const value = source[key] ?? raw[key];
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return "";
}

export function buildAdminProposalDraft(order = {}, options = {}) {
  const source = order && typeof order === "object" ? order : {};
  const raw = parseRawPayload(source.rawPayload ?? source.raw_payload);
  const orderId = Number(source.id);
  const furnitureType = clean(first(
    source, raw, "aiFurnitureType", "ai_furniture_type", "furnitureType", "furniture_type"
  ), "other").toLowerCase();
  const description = clean(first(source, raw, "description", "projectType", "project_type"));
  const location = [
    first(source, raw, "city"),
    first(source, raw, "district"),
    first(source, raw, "address")
  ].map((value) => clean(value)).filter(Boolean).join(", ");
  const budget = Number(first(source, raw, "budget", "budgetRange", "budget_range"));

  return {
    orderId: Number.isInteger(orderId) && orderId > 0 ? orderId : null,
    proposalNumber: Number.isInteger(orderId) && orderId > 0 ? `КП-${String(orderId).padStart(4, "0")}` : "",
    date: clean(options.date, new Intl.DateTimeFormat("ru-RU").format(options.now || new Date())),
    customerName: clean(first(source, raw, "clientName", "client_name", "name"), "Не указан"),
    customerContact: clean(first(source, raw, "phone")),
    customerProject: location,
    item: {
      name: FURNITURE_LABELS[furnitureType] || clean(furnitureType, FURNITURE_LABELS.other),
      specification: description,
      unit: "компл.",
      quantity: 1,
      unitPrice: 0
    },
    referenceBudget: Number.isFinite(budget) && budget >= 0 ? budget : null
  };
}

export function buildProposalPayload(values = {}, items = []) {
  const source = values && typeof values === "object" ? values : {};
  const normalizedItems = Array.isArray(items) ? items.map((item) => ({
    name: clean(item?.name, "Позиция без названия"),
    specification: clean(item?.specification),
    unit: clean(item?.unit, "шт"),
    quantity: safeNumber(item?.quantity, 1) || 1,
    unitPrice: safeNumber(item?.unitPrice ?? item?.unit_price)
  })) : [];

  return {
    proposalNumber: clean(source.proposalNumber),
    date: clean(source.date),
    company: {
      name: clean(source.companyName),
      address: clean(source.companyAddress),
      phone: clean(source.companyPhone),
      email: clean(source.companyEmail)
    },
    customer: {
      name: clean(source.customerName),
      contact: clean(source.customerContact),
      project: clean(source.customerProject)
    },
    items: normalizedItems,
    totalLabel: clean(source.totalLabel, "Итого в тенге:"),
    terms: {
      productionDays: clean(source.productionDays),
      installationDays: clean(source.installationDays),
      warrantyMonths: clean(source.warrantyMonths),
      note: clean(source.termsNote)
    },
    directorName: clean(source.directorName)
  };
}
