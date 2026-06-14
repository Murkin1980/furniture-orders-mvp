import { getAiProviderConfig } from "../ai/providers.js";
import { sendOpenAiCompatibleRequest } from "../ai/send-ai-request.js";

export function buildOpenAiVisionRequest(request, options = {}) {
  validateNeutralRequest(request);
  const env = options.env || {};
  const provider = getAiProviderConfig(options.providerName || env.OCR_PROVIDER || "openai", env);
  const imageSource = request.image.source.trim();
  if (!isProviderImageSource(imageSource)) {
    throw new TypeError("OCR provider image source must be an HTTPS URL or data URL.");
  }
  const headers = { "Content-Type": "application/json" };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;

  return {
    url: `${provider.baseURL.replace(/\/+$/, "")}/chat/completions`,
    headers,
    body: {
      model: clean(options.model || env.OCR_MODEL) || provider.defaultModel,
      messages: [
        { role: "system", content: request.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: request.prompt },
            { type: "image_url", image_url: { url: imageSource, detail: "high" } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1600,
      response_format: request.responseFormat
    }
  };
}

export async function sendOpenAiVisionRequest(request, options = {}) {
  const providerRequest = buildOpenAiVisionRequest(request, options);
  return sendOpenAiCompatibleRequest(providerRequest, { fetchFn: options.fetchFn });
}

function validateNeutralRequest(request) {
  if (!request || typeof request !== "object") throw new TypeError("OCR request object is required.");
  if (!clean(request.systemPrompt) || !clean(request.prompt)) throw new TypeError("OCR request prompts are required.");
  if (!clean(request.image?.source)) throw new TypeError("OCR image source is required.");
}
function isProviderImageSource(value) {
  return /^https:\/\//i.test(value) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
