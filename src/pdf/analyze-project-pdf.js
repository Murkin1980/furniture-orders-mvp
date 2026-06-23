import { buildOpenAiCompatibleRequest, getAiProviderConfig } from "../ai/providers.js";
import { buildProjectPdfManifest } from "./project-pdf-manifest.js";
import {
  buildPdfPageClassificationPrompt,
  getDefaultPdfPageClassificationResult,
  mergePageClassificationsIntoManifest,
  parsePdfPageClassificationResponse
} from "./page-classification.js";
import {
  buildPdfRoomExtractionPrompt,
  getDefaultPdfRoomExtractionResult,
  mergePdfRoomExtractionIntoManifest,
  parsePdfRoomExtractionResponse
} from "./room-extraction.js";

export const PROJECT_PDF_ANALYSIS_VERSION = "project-pdf-analysis/v1";

export async function analyzeProjectPdf(input = {}, options = {}) {
  const settings = options && typeof options === "object" ? options : {};
  const env = isPlainObject(settings.env) ? settings.env : {};
  const provider = getAiProviderConfig(settings.providerName ?? env.AI_PROVIDER, env);
  const getTime = resolveClock(settings);
  const startedAt = getTime();
  const manifest = buildProjectPdfManifest(input?.manifest ?? input, settings.manifestOptions);
  const pageInputs = Array.isArray(input?.pageInputs ?? input?.page_inputs)
    ? input.pageInputs ?? input.page_inputs
    : [];
  const requestStates = {
    classificationRequestBuilt: false,
    extractionRequestBuilt: false
  };

  try {
    if (typeof settings.sendPdfAiRequest !== "function") {
      return withMeta(manifest, getDefaultPdfPageClassificationResult(), getDefaultPdfRoomExtractionResult(), {
        provider: provider.id,
        model: resolveModel(settings.model, provider.defaultModel),
        processingTimeMs: elapsedMs(startedAt, getTime()),
        ...requestStates,
        error: "sendPdfAiRequest must be provided."
      });
    }

    const classificationPrompt = buildPdfPageClassificationPrompt(manifest, pageInputs, settings);
    const classificationRequest = buildOpenAiCompatibleRequest({
      providerName: provider.id,
      model: settings.model,
      prompt: classificationPrompt,
      env
    });
    requestStates.classificationRequestBuilt = true;

    const classificationResponse = await settings.sendPdfAiRequest(classificationRequest, {
      stage: "page_classification"
    });
    const classification = parsePdfPageClassificationResponse(extractRawContent(classificationResponse), manifest);
    if (classification.pages.length === 0) {
      return withMeta(manifest, classification, getDefaultPdfRoomExtractionResult(), {
        provider: provider.id,
        model: classificationRequest.body.model,
        processingTimeMs: elapsedMs(startedAt, getTime()),
        ...requestStates,
        error: "PDF page classification returned no usable pages."
      });
    }

    const classifiedManifest = mergePageClassificationsIntoManifest(manifest, classification);
    const extractionPrompt = buildPdfRoomExtractionPrompt(classifiedManifest, pageInputs, settings);
    const extractionRequest = buildOpenAiCompatibleRequest({
      providerName: provider.id,
      model: settings.model,
      prompt: extractionPrompt,
      env
    });
    requestStates.extractionRequestBuilt = true;

    const extractionResponse = await settings.sendPdfAiRequest(extractionRequest, {
      stage: "room_extraction",
      classification
    });
    const extraction = parsePdfRoomExtractionResponse(extractRawContent(extractionResponse), classifiedManifest);
    const finalManifest = extraction.furnitureZones.length > 0 || extraction.rooms.length > 0
      ? mergePdfRoomExtractionIntoManifest(classifiedManifest, extraction)
      : classifiedManifest;

    return withMeta(finalManifest, classification, extraction, {
      provider: provider.id,
      model: extractionRequest.body.model,
      processingTimeMs: elapsedMs(startedAt, getTime()),
      ...requestStates
    });
  } catch (error) {
    return withMeta(manifest, getDefaultPdfPageClassificationResult(), getDefaultPdfRoomExtractionResult(), {
      provider: provider.id,
      model: resolveModel(settings.model, provider.defaultModel),
      processingTimeMs: elapsedMs(startedAt, getTime()),
      ...requestStates,
      error: getErrorMessage(error)
    });
  }
}

function withMeta(manifest, classification, extraction, meta) {
  return {
    analysisVersion: PROJECT_PDF_ANALYSIS_VERSION,
    manifest,
    classification,
    extraction,
    meta
  };
}

function extractRawContent(response) {
  if (typeof response === "string") return response;
  if (response && typeof response.content === "string") return response.content;
  const choicesContent = response?.choices?.[0]?.message?.content;
  return typeof choicesContent === "string" ? choicesContent : "";
}

function resolveClock(options) {
  if (typeof options.now === "function") return options.now;
  if (typeof options.clock === "function") return options.clock;
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
  return error instanceof Error && error.message ? error.message : "PDF analysis request failed.";
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
