const DEFAULT_SITE_BRIEF = Object.freeze({
  businessName: "",
  ownerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  furnitureTypes: [],
  primaryOffer: "",
  audience: "",
  advantages: [],
  sections: ["services", "advantages", "calculator", "contacts"],
  accentColor: "#116466",
  stylePreference: "modern",
  ctaLabel: "Получить расчет",
  portfolioRequired: true,
  calculatorRequired: false,
  calculatorId: null,
  notes: ""
});

const TEXT_FIELDS = [
  "businessName",
  "ownerName",
  "phone",
  "whatsapp",
  "email",
  "city",
  "primaryOffer",
  "audience",
  "stylePreference",
  "ctaLabel",
  "notes"
];

const ARRAY_FIELDS = ["furnitureTypes", "advantages", "sections"];
const ALLOWED_SECTIONS = new Set(["services", "advantages", "portfolio", "calculator", "contacts"]);

export function getDefaultSiteBrief() {
  return structuredClone(DEFAULT_SITE_BRIEF);
}

export function normalizeSiteBrief(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const result = getDefaultSiteBrief();

  for (const field of TEXT_FIELDS) {
    if (field in source) {
      result[field] = cleanText(source[field]);
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (field in source) {
      result[field] = cleanList(source[field]);
    }
  }

  result.sections = result.sections.filter((section) => ALLOWED_SECTIONS.has(section));
  result.accentColor = normalizeColor(source.accentColor ?? source.colorPreference ?? result.accentColor);
  result.portfolioRequired = normalizeBoolean(source.portfolioRequired, result.portfolioRequired);
  result.calculatorRequired = normalizeBoolean(source.calculatorRequired, result.calculatorRequired);
  result.calculatorId = normalizePositiveInteger(source.calculatorId);

  if (!result.calculatorRequired) {
    result.calculatorId = null;
    result.sections = result.sections.filter((section) => section !== "calculator");
  } else if (!result.sections.includes("calculator")) {
    result.sections.push("calculator");
  }

  if (!result.portfolioRequired) {
    result.sections = result.sections.filter((section) => section !== "portfolio");
  } else if (!result.sections.includes("portfolio")) {
    result.sections.push("portfolio");
  }

  return result;
}

export function validateSiteBrief(input) {
  const brief = normalizeSiteBrief(input);
  const errors = [];

  if (!brief.businessName) errors.push({ field: "brief.businessName", message: "Business name is required." });
  if (!brief.city) errors.push({ field: "brief.city", message: "City is required." });
  if (!brief.primaryOffer) errors.push({ field: "brief.primaryOffer", message: "Primary offer is required." });
  if (!brief.phone && !brief.whatsapp) errors.push({ field: "brief.phone", message: "Phone or WhatsApp is required." });
  if (brief.calculatorRequired && !brief.calculatorId) {
    errors.push({ field: "brief.calculatorId", message: "Calculator is required when calculator section is enabled." });
  }

  return errors;
}

export function serializeSiteBrief(input) {
  return JSON.stringify(normalizeSiteBrief(input));
}

export function parseSiteBrief(value) {
  if (!value) return getDefaultSiteBrief();
  if (typeof value === "object") return normalizeSiteBrief(value);

  try {
    return normalizeSiteBrief(JSON.parse(value));
  } catch {
    return getDefaultSiteBrief();
  }
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text === "undefined" || text === "null" ? "" : text;
}

function cleanList(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function normalizeBoolean(value, fallback) {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeColor(value) {
  const color = cleanText(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULT_SITE_BRIEF.accentColor;
}
