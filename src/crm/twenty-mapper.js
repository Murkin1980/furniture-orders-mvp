const MAPPER_VERSION = 1;

export function buildTwentyPersonPayload(order) {
  const input = asObject(order);
  const rawName = textValue(firstValue(input, ["name", "clientName", "client_name"]));
  const nameParts = rawName.trim().split(/\s+/);
  const phone = textValue(firstValue(input, ["phone"]));

  return compactObject({
    name: compactObject({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || nameParts[0] || ""
    }),
    phones: compactObject({
      primaryPhoneNumber: phone.replace(/[^\d]/g, "")
    }),
    emails: compactObject({
      primaryEmail: textValue(firstValue(input, ["email"]))
    }),
    city: textValue(firstValue(input, ["city"])),
    source: textValue(firstValue(input, ["source"]))
  });
}

export function buildTwentyOpportunityPayload(order) {
  const input = asObject(order);
  const rawPayload = parseRawPayload(firstValue(input, ["raw_payload", "rawPayload"]));
  const furnitureType = textValue(firstValue(input, [
    "ai_furniture_type",
    "aiFurnitureType",
    "furniture_type",
    "furnitureType"
  ])) || "other";
  const orderId = normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"]));
  const explicitTitle = textValue(firstValue(input, ["title", "opportunityName", "opportunity_name"]));
  const budget = Number(firstValue(input, ["budget"]));
  const amountMicros = Number.isFinite(budget) ? Math.round(budget * 1000000) : null;

  return compactObject({
    name: explicitTitle || buildOpportunityName(orderId, furnitureType),
    furnitureType,
    amount: amountMicros ? { amountMicros, currencyCode: "KZT" } : undefined,
    source: textValue(firstValue(input, ["source"]))
  });
}

export function buildTwentyNotePayload(order) {
  const input = asObject(order);
  const orderId = normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"]));
  const missingInfo = parseMissingInfo(firstValue(input, ["ai_missing_info_json", "aiMissingInfoJson", "missingInfo"]));
  const lines = [
    noteLine("Order", orderId ? `#${orderId}` : ""),
    noteLine("Request", textValue(firstValue(input, ["description"]))),
    noteLine("AI summary", textValue(firstValue(input, ["ai_summary", "aiSummary"]))),
    noteLine("AI score", scalarValue(firstValue(input, ["ai_score", "aiScore"]))),
    noteLine("AI temperature", textValue(firstValue(input, ["ai_temperature", "aiTemperature"]))),
    noteLine("Next question", textValue(firstValue(input, ["ai_next_question", "aiNextQuestion"]))),
    missingInfo.length ? `Missing info:\n- ${missingInfo.join("\n- ")}` : "",
    noteLine("Urgency", textValue(firstValue(input, ["ai_urgency", "aiUrgency"]))),
    noteLine("Potential value", textValue(firstValue(input, ["ai_potential_value", "aiPotentialValue"]))),
    noteLine("Recommended status", textValue(firstValue(input, ["ai_recommended_status", "aiRecommendedStatus"])))
  ].filter(Boolean);

  return {
    title: orderId ? `Furniture order #${orderId}` : "Furniture order",
    body: lines.join("\n")
  };
}

export function buildTwentySyncPayload(order) {
  const input = asObject(order);

  return {
    person: buildTwentyPersonPayload(input),
    opportunity: buildTwentyOpportunityPayload(input),
    note: buildTwentyNotePayload(input),
    meta: {
      orderId: normalizeOrderId(firstValue(input, ["id", "orderId", "order_id"])),
      source: textValue(firstValue(input, ["source"])) || "",
      hasAiResult: hasAiResult(input),
      mapperVersion: MAPPER_VERSION
    }
  };
}

function buildOpportunityName(orderId, furnitureType) {
  const typeLabel = furnitureType || "other";
  return orderId ? `Order #${orderId} - ${typeLabel}` : `Furniture order - ${typeLabel}`;
}

function getCalculatorMeta(input, rawPayload) {
  const value = firstValue(input, ["calculatorMeta", "calculator_meta"])
    ?? firstValue(rawPayload, ["calculatorMeta", "calculator_meta"]);

  return isPlainObject(value) ? removeUndefined(value) : undefined;
}

function parseRawPayload(value) {
  if (isPlainObject(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseMissingInfo(value) {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(textValue).filter(Boolean) : [textValue(value)].filter(Boolean);
  } catch {
    return [textValue(value)].filter(Boolean);
  }
}

function hasAiResult(input) {
  return [
    "ai_status",
    "aiStatus",
    "ai_score",
    "aiScore",
    "ai_summary",
    "aiSummary",
    "ai_furniture_type",
    "aiFurnitureType"
  ].some((key) => input[key] !== undefined && input[key] !== null && input[key] !== "");
}

function noteLine(label, value) {
  return value === undefined || value === null || value === "" ? "" : `${label}: ${value}`;
}

function normalizeOrderId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function scalarValue(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return typeof value === "number" || typeof value === "boolean" ? value : textValue(value);
}

function textValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function firstValue(input, keys) {
  for (const key of keys) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== "") {
      return input[key];
    }
  }

  return undefined;
}

function compactObject(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined).filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)])
    );
  }

  return value;
}

function asObject(value) {
  return isPlainObject(value) ? value : {};
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
