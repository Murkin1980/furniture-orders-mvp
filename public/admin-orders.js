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

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}
