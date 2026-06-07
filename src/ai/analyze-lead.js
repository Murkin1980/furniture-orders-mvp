import { getDefaultAiResult, parseAiResponse } from "./parse-ai-response.js";
import { buildQualificationPrompt } from "./qualification-prompt.js";
import { buildOpenAiCompatibleRequest, getAiProviderConfig } from "./providers.js";

export async function analyzeLead(orderData, options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const env = settings.env && typeof settings.env === "object" ? settings.env : {};
  const provider = getAiProviderConfig(settings.providerName ?? env.AI_PROVIDER, env);
  const getTime = resolveClock(settings);
  const startedAt = getTime();
  let requestBuilt = false;

  try {
    const prompt = buildQualificationPrompt(orderData);
    const request = buildOpenAiCompatibleRequest({
      providerName: provider.id,
      model: settings.model,
      prompt,
      env
    });
    requestBuilt = true;

    if (typeof settings.sendAiRequest !== "function") {
      return withMeta(getDefaultAiResult(), {
        provider: provider.id,
        model: request.body.model,
        processingTimeMs: elapsedMs(startedAt, getTime()),
        requestBuilt,
        error: "sendAiRequest must be provided."
      });
    }

    const response = await settings.sendAiRequest(request);
    const result = parseAiResponse(extractRawContent(response));

    return withMeta(result, {
      provider: provider.id,
      model: request.body.model,
      processingTimeMs: elapsedMs(startedAt, getTime()),
      requestBuilt
    });
  } catch (error) {
    return withMeta(getDefaultAiResult(), {
      provider: provider.id,
      model: resolveModel(settings.model, provider.defaultModel),
      processingTimeMs: elapsedMs(startedAt, getTime()),
      requestBuilt,
      error: getErrorMessage(error)
    });
  }
}

function extractRawContent(response) {
  if (typeof response === "string") {
    return response;
  }

  if (response && typeof response.content === "string") {
    return response.content;
  }

  const choicesContent = response?.choices?.[0]?.message?.content;
  return typeof choicesContent === "string" ? choicesContent : "";
}

function withMeta(result, meta) {
  return {
    ...result,
    meta
  };
}

function resolveClock(options) {
  if (typeof options.now === "function") {
    return options.now;
  }
  if (typeof options.clock === "function") {
    return options.clock;
  }
  if (options.clock && typeof options.clock.now === "function") {
    return () => options.clock.now();
  }
  return () => Date.now();
}

function elapsedMs(startedAt, finishedAt) {
  const elapsed = Number(finishedAt) - Number(startedAt);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function resolveModel(model, fallback) {
  return typeof model === "string" && model.trim() ? model.trim() : fallback;
}

function getErrorMessage(error) {
  return error instanceof Error && error.message ? error.message : "AI request failed.";
}
