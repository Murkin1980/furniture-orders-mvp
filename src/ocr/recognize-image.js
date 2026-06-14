import { buildRecognitionRequest } from "./recognition-prompt.js";
import { getDefaultRecognitionResult, parseRecognitionResult } from "./recognition-result.js";

export async function recognizeImage(input = {}, options = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const settings = isPlainObject(options) ? options : {};
  const getTime = resolveClock(settings);
  const startedAt = getTime();
  let requestBuilt = false;

  try {
    const request = buildRecognitionRequest({
      context: safeInput.context,
      image: safeInput.image,
      options: safeInput.options
    });
    requestBuilt = true;

    if (typeof settings.sendRecognitionRequest !== "function") {
      return withMeta(getDefaultRecognitionResult(), {
        processingTimeMs: elapsedMs(startedAt, getTime()),
        requestBuilt,
        parseFailed: false,
        error: "sendRecognitionRequest must be provided."
      });
    }

    const response = await settings.sendRecognitionRequest(request);
    const rawContent = extractRawContent(response);
    const parseFailed = !hasValidRecognitionShape(rawContent);
    const result = parseRecognitionResult(rawContent);

    return withMeta(result, {
      processingTimeMs: elapsedMs(startedAt, getTime()),
      requestBuilt,
      parseFailed
    });
  } catch (error) {
    return withMeta(getDefaultRecognitionResult(), {
      processingTimeMs: elapsedMs(startedAt, getTime()),
      requestBuilt,
      parseFailed: false,
      error: getErrorMessage(error)
    });
  }
}

function extractRawContent(response) {
  if (typeof response === "string") return response;
  if (response && typeof response.content === "string") return response.content;
  const choicesContent = response?.choices?.[0]?.message?.content;
  return typeof choicesContent === "string" ? choicesContent : "";
}

function hasValidRecognitionShape(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) return false;
  const result = parseRecognitionResult(rawContent);
  return JSON.stringify(result) !== JSON.stringify(getDefaultRecognitionResult())
    || isExplicitDefault(rawContent);
}

function isExplicitDefault(rawContent) {
  try {
    const parsed = JSON.parse(stripCodeFence(rawContent));
    return parsed
      && parsed.documentType === "other"
      && parsed.furnitureType === "other"
      && parsed.rawText === ""
      && Array.isArray(parsed.dimensions)
      && Array.isArray(parsed.components)
      && Array.isArray(parsed.materials)
      && Array.isArray(parsed.notes)
      && Array.isArray(parsed.warnings)
      && Array.isArray(parsed.missingInfo)
      && Number(parsed.confidence) === 0;
  } catch {
    return false;
  }
}

function stripCodeFence(value) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function withMeta(result, meta) {
  return { ...result, meta };
}

function resolveClock(options) {
  if (typeof options.now === "function") return options.now;
  if (typeof options.clock === "function") return options.clock;
  if (options.clock && typeof options.clock.now === "function") return () => options.clock.now();
  return () => Date.now();
}

function elapsedMs(startedAt, finishedAt) {
  const elapsed = Number(finishedAt) - Number(startedAt);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function getErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : "Recognition request failed.";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
