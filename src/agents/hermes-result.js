const FURNITURE_TYPES = new Set([
  "kitchen", "wardrobe", "bedroom", "hallway", "children",
  "office", "cabinet", "bathroom", "tvzone", "commercial", "other"
]);

const LEAD_TEMPERATURES = new Set(["hot", "warm", "neutral", "cold"]);

export function getDefaultHermesResult() {
  return {
    schemaVersion: 1,
    requiresHumanApproval: true,
    summary: "",
    furnitureType: "other",
    leadTemperature: "neutral",
    missingInfo: [],
    nextQuestion: "",
    replyDraft: "",
    warnings: []
  };
}

export function normalizeHermesResult(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return getDefaultHermesResult();
  }

  if (raw.schemaVersion !== 1) {
    return getDefaultHermesResult();
  }

  return {
    schemaVersion: 1,
    requiresHumanApproval: true,
    summary: String(raw.summary ?? ""),
    furnitureType: normalizeEnum(raw.furnitureType, FURNITURE_TYPES, "other"),
    leadTemperature: normalizeEnum(raw.leadTemperature, LEAD_TEMPERATURES, "neutral"),
    missingInfo: normalizeStringArray(raw.missingInfo),
    nextQuestion: String(raw.nextQuestion ?? ""),
    replyDraft: String(raw.replyDraft ?? ""),
    warnings: normalizeStringArray(raw.warnings)
  };
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}
