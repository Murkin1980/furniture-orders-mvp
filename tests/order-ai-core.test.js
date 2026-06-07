import test from "node:test";
import assert from "node:assert/strict";
import { analyzeOrderWithAiCore } from "../src/ai/order-ai-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/ai/analyze.js";

const validAiResult = {
  furnitureType: "kitchen",
  isQualified: true,
  leadScore: 91,
  leadTemperature: "hot",
  missingInfo: ["dimensions"],
  nextQuestion: "Какие размеры помещения?",
  urgency: "high",
  potentialValue: "high",
  recommendedStatus: "qualified",
  ownerSummary: "Клиент готов к замеру."
};

test("returns 404 when order is not found", async () => {
  const result = await analyzeOrderWithAiCore({ db: createDb(null) }, 99, {
    sendAiRequest: async () => JSON.stringify(validAiResult)
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, "order_not_found");
});

test("successful analysis saves normalized AI fields", async () => {
  const db = createDb(createOrder());
  const result = await analyzeOrderWithAiCore({ db }, 1, {
    sendAiRequest: async () => JSON.stringify(validAiResult),
    analyzedAt: "2026-06-07T12:00:00.000Z"
  });

  assert.equal(result.status, 200);
  assert.equal(db.order.ai_status, "success");
  assert.equal(db.order.ai_score, 91);
  assert.equal(db.order.ai_temperature, "hot");
  assert.equal(db.order.ai_summary, "Клиент готов к замеру.");
  assert.equal(db.order.ai_analyzed_at, "2026-06-07T12:00:00.000Z");
});

test("invalid JSON saves the parser default result", async () => {
  const db = createDb(createOrder());
  await analyzeOrderWithAiCore({ db }, 1, {
    sendAiRequest: async () => "{invalid"
  });

  assert.equal(db.order.ai_status, "success");
  assert.equal(db.order.ai_score, 1);
  assert.equal(db.order.ai_temperature, "neutral");
  assert.equal(db.order.ai_summary, null);
});

test("sendAiRequest error saves failed status and error", async () => {
  const db = createDb(createOrder());
  await analyzeOrderWithAiCore({ db }, 1, {
    sendAiRequest: async () => {
      throw new Error("Provider unavailable");
    }
  });

  assert.equal(db.order.ai_status, "failed");
  assert.equal(db.order.ai_error, "Provider unavailable");
});

test("endpoint requires the existing admin token convention", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.test/api/orders/1/ai/analyze", { method: "POST" }),
    env: { ADMIN_TOKEN: "secret", DB: createDb(createOrder()) },
    params: { id: "1" },
    data: {}
  });

  assert.equal(response.status, 401);
});

test("endpoint does not call fetch and preserves normal order fields", async () => {
  const db = createDb(createOrder());
  const originalOrder = {
    name: db.order.name,
    phone: db.order.phone,
    source: db.order.source,
    status: db.order.status,
    description: db.order.description
  };
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
  };

  try {
    const response = await onRequestPost({
      request: new Request("https://example.test/api/orders/1/ai/analyze", {
        method: "POST",
        headers: { Authorization: "Bearer secret" }
      }),
      env: { ADMIN_TOKEN: "secret", DB: db },
      params: { id: "1" },
      data: { sendAiRequest: async () => JSON.stringify(validAiResult) }
    });

    assert.equal(response.status, 200);
    assert.equal(fetchCalls, 0);
    assert.deepEqual({
      name: db.order.name,
      phone: db.order.phone,
      source: db.order.source,
      status: db.order.status,
      description: db.order.description
    }, originalOrder);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("endpoint without API key saves failed status before network call", async () => {
  const db = createDb(createOrder());
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
  };

  try {
    const response = await onRequestPost({
      request: new Request("https://example.test/api/orders/1/ai/analyze", {
        method: "POST",
        headers: { Authorization: "Bearer secret" }
      }),
      env: { ADMIN_TOKEN: "secret", DB: db },
      params: { id: "1" },
      data: {}
    });

    assert.equal(response.status, 200);
    assert.equal(db.order.ai_status, "failed");
    assert.match(db.order.ai_error, /API key is missing/i);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createOrder() {
  return {
    id: 1,
    name: "Алия",
    phone: "+77011234567",
    source: "site",
    city: "Алматы",
    furnitureType: "kitchen",
    budget: 1500000,
    description: "Нужна кухня",
    status: "new"
  };
}

function createDb(order) {
  const state = {
    order,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              return sql.includes("FROM orders") && state.order && values[0] === state.order.id
                ? { ...state.order }
                : null;
            },
            async run() {
              if (!sql.includes("UPDATE orders") || !state.order) {
                return { success: true };
              }

              const keys = [
                "ai_status",
                "ai_score",
                "ai_temperature",
                "ai_furniture_type",
                "ai_qualified",
                "ai_summary",
                "ai_next_question",
                "ai_missing_info_json",
                "ai_urgency",
                "ai_potential_value",
                "ai_recommended_status",
                "ai_provider",
                "ai_model",
                "ai_processing_time_ms",
                "ai_error",
                "ai_analyzed_at"
              ];

              keys.forEach((key, index) => {
                state.order[key] = values[index];
              });
              return { success: true };
            }
          };
        }
      };
    }
  };

  return state;
}
