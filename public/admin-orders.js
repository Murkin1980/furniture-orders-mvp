export function getOrderAiViewModel(order = {}) {
  return {
    hasAnalysis: Boolean(order.aiStatus),
    buttonLabel: order.aiStatus ? "Повторить AI-анализ" : "AI-анализ",
    status: clean(order.aiStatus),
    score: order.aiScore ?? null,
    temperature: clean(order.aiTemperature),
    furnitureType: clean(order.aiFurnitureType),
    qualified: order.aiQualified === 1 || order.aiQualified === true,
    summary: clean(order.aiSummary),
    nextQuestion: clean(order.aiNextQuestion),
    missingInfo: parseOrderAiMissingInfo(order.aiMissingInfoJson),
    urgency: clean(order.aiUrgency),
    potentialValue: clean(order.aiPotentialValue),
    recommendedStatus: clean(order.aiRecommendedStatus),
    error: clean(order.aiError)
  };
}

export function parseOrderAiMissingInfo(value) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [clean(value)].filter(Boolean);
  } catch {
    return [clean(value)].filter(Boolean);
  }
}

export function getOrderCrmViewModel(order = {}) {
  return {
    hasSync: Boolean(order.crmSyncStatus),
    buttonLabel: order.crmSyncStatus ? "Повторить отправку в CRM" : "Отправить в CRM",
    status: clean(order.crmSyncStatus),
    personId: clean(order.crmPersonId),
    opportunityId: clean(order.crmOpportunityId),
    noteId: clean(order.crmNoteId),
    error: clean(order.crmError),
    lastAttemptAt: clean(order.crmLastAttemptAt),
    syncedAt: clean(order.crmSyncedAt)
  };
}

export function getOcrRecognitionViewModel(record = {}) {
  const result = record.result && typeof record.result === "object" ? record.result : {};
  const imageSource = clean(record.imageSource);
  return {
    id: record.id ?? null,
    status: clean(record.status) || "draft",
    canDelete: clean(record.status) !== "deleted",
    imageSource,
    canPreviewImage: /^https?:\/\//i.test(imageSource) || imageSource.startsWith("/"),
    furnitureType: clean(result.furnitureType) || "other",
    documentType: clean(result.documentType) || "other",
    rawText: clean(result.rawText),
    confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : 0,
    warnings: normalizeList(result.warnings),
    missingInfo: normalizeList(result.missingInfo),
    error: clean(record.error),
    editableJson: JSON.stringify(result, null, 2)
  };
}

export function parseOcrReviewJson(value) {
  try {
    const parsed = JSON.parse(clean(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new TypeError("OCR result must be a valid JSON object.");
  }
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}
