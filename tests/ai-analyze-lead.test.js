import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLead } from "../src/ai/analyze-lead.js";
import { getDefaultAiResult } from "../src/ai/parse-ai-response.js";

const validAiResult = {
  furnitureType: "kitchen",
  isQualified: true,
  leadScore: 88,
  leadTemperature: "hot",
  missingInfo: ["dimensions"],
  nextQuestion: "Какие размеры помещения?",
  urgency: "high",
  potentialValue: "high",
  recommendedStatus: "qualified",
  ownerSummary: "Готов к замеру."
};

function clock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test("analyzes a lead successfully with a fake client", async () => {
  const result = await analyzeLead(
    { name: "Алия", furnitureType: "kitchen" },
    {
      sendAiRequest: async () => JSON.stringify(validAiResult),
      now: clock(100, 125)
    }
  );

  assert.deepEqual({ ...result, meta: undefined }, { ...validAiResult, meta: undefined });
  assert.deepEqual(result.meta, {
    provider: "openai",
    model: "gpt-4o-mini",
    processingTimeMs: 25,
    requestBuilt: true
  });
});

test("calls sendAiRequest with a request object", async () => {
  let receivedRequest;
  await analyzeLead(
    { description: "Шкаф в спальню" },
    {
      sendAiRequest: async (request) => {
        receivedRequest = request;
        return JSON.stringify(validAiResult);
      }
    }
  );

  assert.match(receivedRequest.url, /chat\/completions$/);
  assert.equal(receivedRequest.headers["Content-Type"], "application/json");
  assert.match(receivedRequest.body.messages[1].content, /Шкаф в спальню/);
});

test("uses providerName model and env", async () => {
  let receivedRequest;
  const result = await analyzeLead({}, {
    providerName: "groq",
    model: "custom/groq-model",
    env: { GROQ_API_KEY: "groq-secret" },
    sendAiRequest: async (request) => {
      receivedRequest = request;
      return JSON.stringify(validAiResult);
    }
  });

  assert.equal(receivedRequest.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(receivedRequest.headers.Authorization, "Bearer groq-secret");
  assert.equal(receivedRequest.body.model, "custom/groq-model");
  assert.equal(result.meta.provider, "groq");
  assert.equal(result.meta.model, "custom/groq-model");
});

test("returns default result and meta error without sendAiRequest", async () => {
  const result = await analyzeLead({}, { now: clock(10, 12) });

  assert.deepEqual({ ...result, meta: undefined }, { ...getDefaultAiResult(), meta: undefined });
  assert.equal(result.meta.error, "sendAiRequest must be provided.");
  assert.equal(result.meta.requestBuilt, true);
  assert.equal(result.meta.processingTimeMs, 2);
});

test("returns default result and meta error when sendAiRequest throws", async () => {
  const result = await analyzeLead({}, {
    sendAiRequest: async () => {
      throw new Error("Provider unavailable");
    }
  });

  assert.deepEqual({ ...result, meta: undefined }, { ...getDefaultAiResult(), meta: undefined });
  assert.equal(result.meta.error, "Provider unavailable");
  assert.equal(result.meta.requestBuilt, true);
});

test("returns default result for invalid AI JSON", async () => {
  const result = await analyzeLead({}, {
    sendAiRequest: async () => "{invalid"
  });

  assert.deepEqual({ ...result, meta: undefined }, { ...getDefaultAiResult(), meta: undefined });
  assert.equal(result.meta.error, undefined);
});

test("supports raw string response", async () => {
  const result = await analyzeLead({}, {
    sendAiRequest: async () => JSON.stringify(validAiResult)
  });
  assert.equal(result.leadScore, 88);
});

test("supports content response", async () => {
  const result = await analyzeLead({}, {
    sendAiRequest: async () => ({ content: JSON.stringify(validAiResult) })
  });
  assert.equal(result.ownerSummary, "Готов к замеру.");
});

test("supports OpenAI-like choices response", async () => {
  const result = await analyzeLead({}, {
    sendAiRequest: async () => ({
      choices: [{ message: { content: JSON.stringify(validAiResult) } }]
    })
  });
  assert.equal(result.furnitureType, "kitchen");
});

test("does not call fetch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
  };

  try {
    await analyzeLead({}, {
      sendAiRequest: async () => JSON.stringify(validAiResult)
    });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not mutate input orderData", async () => {
  const orderData = {
    name: "Алия",
    calculatorMeta: { estimate: 1800000 }
  };
  const snapshot = structuredClone(orderData);

  await analyzeLead(orderData, {
    sendAiRequest: async () => JSON.stringify(validAiResult)
  });

  assert.deepEqual(orderData, snapshot);
});
