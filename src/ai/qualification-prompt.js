const NOT_PROVIDED = "Не указано";

const REQUIRED_RESULT_FIELDS = [
  "furnitureType",
  "isQualified",
  "leadScore",
  "leadTemperature",
  "missingInfo",
  "nextQuestion",
  "urgency",
  "potentialValue",
  "recommendedStatus",
  "ownerSummary"
];

export function buildQualificationPrompt(orderData = {}, options = {}) {
  const order = isPlainObject(orderData) ? orderData : {};
  const settings = isPlainObject(options) ? options : {};
  const serviceArea = safeValue(settings.serviceArea, "Алматы и область");
  const averageTicket = safeValue(
    settings.averageTicketGuidance,
    "Учитывай ориентиры по среднему чеку: небольшие изделия обычно дешевле кухонь, гардеробных и коммерческих проектов; точную стоимость без размеров и материалов не выдумывай."
  );

  return [
    "Ты квалифицируешь входящую заявку для мебельного производства.",
    "Верни только один валидный JSON-объект без markdown, пояснений и дополнительного текста.",
    "",
    "Контекст бизнеса:",
    "- Регион работы: " + serviceArea,
    "- Категории: кухни, шкафы, гардеробные, мебель для ванной, прихожие, детские, офисная мебель, ТВ-зоны, коммерческая мебель.",
    "- " + averageTicket,
    "",
    "Данные заявки:",
    fieldLine("name", order.name),
    fieldLine("phone", order.phone),
    fieldLine("city", order.city),
    fieldLine("district", order.district),
    fieldLine("furnitureType", pick(order, "furnitureType", "furniture_type")),
    fieldLine("projectType", pick(order, "projectType", "project_type")),
    fieldLine("description", order.description),
    fieldLine("budget", order.budget),
    fieldLine("budgetRange", pick(order, "budgetRange", "budget_range")),
    fieldLine("deadline", order.deadline),
    fieldLine("address", order.address),
    fieldLine("source", order.source),
    fieldLine("preferredChannel", pick(order, "preferredChannel", "preferred_channel")),
    fieldLine("calculatorMeta", order.calculatorMeta),
    "",
    "Оцени качество лида, срочность, потенциальную ценность и недостающую информацию.",
    "Не придумывай отсутствующие данные. Следующий вопрос должен помогать продвинуть заявку к замеру или расчёту.",
    "",
    "Обязательные поля JSON:",
    REQUIRED_RESULT_FIELDS.join(", "),
    "",
    "Используй только следующие значения:",
    '- furnitureType: "kitchen" | "cabinet" | "bathroom" | "wardrobe" | "child" | "office" | "hallway" | "tvzone" | "commercial" | "other"',
    "- isQualified: boolean",
    "- leadScore: целое число от 1 до 100",
    '- leadTemperature: "hot" | "warm" | "neutral" | "cold"',
    "- missingInfo: массив строк",
    "- nextQuestion: строка",
    '- urgency: "high" | "medium" | "low"',
    '- potentialValue: "high" | "medium" | "low"',
    '- recommendedStatus: "new" | "contacted" | "qualified" | "estimate" | "negotiation" | "closed"',
    "- ownerSummary: краткая строка для владельца бизнеса"
  ].join("\n");
}

function fieldLine(label, value) {
  return `- ${label}: ${safeValue(value)}`;
}

function pick(source, camelCaseKey, snakeCaseKey) {
  return hasValue(source[camelCaseKey]) ? source[camelCaseKey] : source[snakeCaseKey];
}

function safeValue(value, fallback = NOT_PROVIDED) {
  if (!hasValue(value)) {
    return fallback;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(removeEmptyValues(value)) || fallback;
    } catch {
      return fallback;
    }
  }

  return String(value);
}

function removeEmptyValues(value) {
  if (Array.isArray(value)) {
    return value.filter(hasValue).map(removeEmptyValues);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => hasValue(item))
        .map(([key, item]) => [key, removeEmptyValues(item)])
    );
  }

  return value;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
