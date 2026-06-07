const REQUIRED_FIELDS = [
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

const FURNITURE_TYPES = new Set([
  "kitchen",
  "cabinet",
  "bathroom",
  "wardrobe",
  "child",
  "office",
  "hallway",
  "tvzone",
  "commercial",
  "other"
]);
const LEAD_TEMPERATURES = new Set(["hot", "warm", "neutral", "cold"]);
const PRIORITY_LEVELS = new Set(["high", "medium", "low"]);
const RECOMMENDED_STATUSES = new Set(["new", "contacted", "qualified", "estimate", "negotiation", "closed"]);

export function getDefaultAiResult() {
  return {
    furnitureType: "other",
    isQualified: false,
    leadScore: 1,
    leadTemperature: "neutral",
    missingInfo: [],
    nextQuestion: "",
    urgency: "low",
    potentialValue: "low",
    recommendedStatus: "new",
    ownerSummary: ""
  };
}

export function parseAiResponse(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    return getDefaultAiResult();
  }

  try {
    const parsed = JSON.parse(stripCodeFence(rawContent));
    if (!isValidResponseShape(parsed)) {
      return getDefaultAiResult();
    }

    return {
      furnitureType: normalizeEnum(parsed.furnitureType, FURNITURE_TYPES, "other"),
      isQualified: parsed.isQualified,
      leadScore: clampScore(parsed.leadScore),
      leadTemperature: normalizeEnum(parsed.leadTemperature, LEAD_TEMPERATURES, "neutral"),
      missingInfo: normalizeMissingInfo(parsed.missingInfo),
      nextQuestion: String(parsed.nextQuestion ?? ""),
      urgency: normalizeEnum(parsed.urgency, PRIORITY_LEVELS, "low"),
      potentialValue: normalizeEnum(parsed.potentialValue, PRIORITY_LEVELS, "low"),
      recommendedStatus: normalizeEnum(parsed.recommendedStatus, RECOMMENDED_STATUSES, "new"),
      ownerSummary: String(parsed.ownerSummary ?? "")
    };
  } catch {
    return getDefaultAiResult();
  }
}

function stripCodeFence(value) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isValidResponseShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  if (!REQUIRED_FIELDS.every((field) => Object.hasOwn(value, field))) {
    return false;
  }

  const missingInfoIsValid = typeof value.missingInfo === "string" || Array.isArray(value.missingInfo);

  return typeof value.isQualified === "boolean"
    && Number.isFinite(Number(value.leadScore))
    && missingInfoIsValid
    && typeof value.nextQuestion === "string"
    && typeof value.ownerSummary === "string";
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function clampScore(value) {
  return Math.min(100, Math.max(1, Math.round(Number(value))));
}

function normalizeMissingInfo(value) {
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}
