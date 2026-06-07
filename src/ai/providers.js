export const AI_PROVIDERS = Object.freeze({
  openai: Object.freeze({
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyEnvName: "OPENAI_API_KEY"
  }),
  groq: Object.freeze({
    id: "groq",
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    apiKeyEnvName: "GROQ_API_KEY"
  }),
  gemini: Object.freeze({
    id: "gemini",
    label: "Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    apiKeyEnvName: "GEMINI_API_KEY"
  }),
  openrouter: Object.freeze({
    id: "openrouter",
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    apiKeyEnvName: "OPENROUTER_API_KEY"
  }),
  nvidia: Object.freeze({
    id: "nvidia",
    label: "NVIDIA NIM",
    baseURL: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.1-70b-instruct",
    apiKeyEnvName: "NVIDIA_API_KEY"
  })
});

const SYSTEM_MESSAGE = "Ты возвращаешь только валидный JSON. Никакого другого текста.";

export function getAiProviderConfig(providerName, env = {}) {
  const provider = AI_PROVIDERS[normalizeProviderName(providerName)] ?? AI_PROVIDERS.openai;

  return {
    ...provider,
    apiKey: env?.[provider.apiKeyEnvName] ?? ""
  };
}

export function getDefaultAiProvider(env = {}) {
  return getAiProviderConfig(env?.AI_PROVIDER, env);
}

export function buildOpenAiCompatibleRequest({ providerName, model, prompt, env = {} } = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new TypeError("AI prompt must be a non-empty string.");
  }

  const provider = getAiProviderConfig(providerName, env);
  const headers = {
    "Content-Type": "application/json"
  };

  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }

  return {
    url: `${provider.baseURL.replace(/\/+$/, "")}/chat/completions`,
    headers,
    body: {
      model: typeof model === "string" && model.trim() ? model.trim() : provider.defaultModel,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    }
  };
}

function normalizeProviderName(providerName) {
  return typeof providerName === "string" ? providerName.trim().toLowerCase() : "";
}
