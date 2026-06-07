import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_PROVIDERS,
  buildOpenAiCompatibleRequest,
  getAiProviderConfig,
  getDefaultAiProvider
} from "../src/ai/providers.js";

test("returns openai by default", () => {
  assert.equal(getDefaultAiProvider().id, "openai");
  assert.equal(getDefaultAiProvider({}).defaultModel, AI_PROVIDERS.openai.defaultModel);
});

test("falls back to openai for unknown provider", () => {
  assert.equal(getAiProviderConfig("unknown").id, "openai");
  assert.equal(getDefaultAiProvider({ AI_PROVIDER: "unknown" }).id, "openai");
});

test("returns correct groq config", () => {
  const config = getAiProviderConfig("groq");
  assert.equal(config.baseURL, "https://api.groq.com/openai/v1");
  assert.equal(config.apiKeyEnvName, "GROQ_API_KEY");
});

test("returns correct gemini config", () => {
  const config = getAiProviderConfig("gemini");
  assert.equal(config.baseURL, "https://generativelanguage.googleapis.com/v1beta/openai");
  assert.equal(config.apiKeyEnvName, "GEMINI_API_KEY");
});

test("returns correct openrouter config", () => {
  const config = getAiProviderConfig("openrouter");
  assert.equal(config.baseURL, "https://openrouter.ai/api/v1");
  assert.equal(config.apiKeyEnvName, "OPENROUTER_API_KEY");
});

test("returns correct nvidia config", () => {
  const config = getAiProviderConfig("nvidia");
  assert.equal(config.baseURL, "https://integrate.api.nvidia.com/v1");
  assert.equal(config.apiKeyEnvName, "NVIDIA_API_KEY");
});

test("reads api key from provider-specific env name", () => {
  const config = getAiProviderConfig("groq", { GROQ_API_KEY: "secret-key" });
  assert.equal(config.apiKey, "secret-key");
});

test("buildOpenAiCompatibleRequest does not call fetch", () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
  };

  try {
    buildOpenAiCompatibleRequest({ providerName: "openai", prompt: "Analyze lead" });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request contains correct messages and body settings", () => {
  const request = buildOpenAiCompatibleRequest({
    providerName: "openai",
    prompt: "Analyze this furniture lead",
    env: { OPENAI_API_KEY: "secret-key" }
  });

  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.headers.Authorization, "Bearer secret-key");
  assert.deepEqual(request.body.messages, [
    { role: "system", content: "Ты возвращаешь только валидный JSON. Никакого другого текста." },
    { role: "user", content: "Analyze this furniture lead" }
  ]);
  assert.equal(request.body.temperature, 0.1);
  assert.equal(request.body.max_tokens, 1000);
});

test("custom model overrides provider default model", () => {
  const request = buildOpenAiCompatibleRequest({
    providerName: "groq",
    model: "custom/model",
    prompt: "Analyze lead"
  });

  assert.equal(request.body.model, "custom/model");
});

test("throws a clear error for empty prompt", () => {
  assert.throws(
    () => buildOpenAiCompatibleRequest({ providerName: "openai", prompt: "   " }),
    { name: "TypeError", message: "AI prompt must be a non-empty string." }
  );
});
