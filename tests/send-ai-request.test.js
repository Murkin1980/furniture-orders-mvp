import test from "node:test";
import assert from "node:assert/strict";
import { sendOpenAiCompatibleRequest } from "../src/ai/send-ai-request.js";

const request = {
  url: "https://api.example.test/v1/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer secret"
  },
  body: {
    model: "test-model",
    messages: [{ role: "user", content: "Analyze" }],
    temperature: 0.1,
    max_tokens: 1000
  }
};

test("returns content from successful OpenAI-compatible response", async () => {
  const result = await sendOpenAiCompatibleRequest(request, {
    fetchFn: async () => jsonResponse(200, {
      choices: [{ message: { content: '{"leadScore":90}' } }]
    })
  });

  assert.deepEqual(result, { content: '{"leadScore":90}' });
});

test("calls fetch with correct URL method headers and body", async () => {
  let call;
  await sendOpenAiCompatibleRequest(request, {
    fetchFn: async (url, options) => {
      call = { url, options };
      return jsonResponse(200, { choices: [{ message: { content: "{}" } }] });
    }
  });

  assert.equal(call.url, request.url);
  assert.equal(call.options.method, "POST");
  assert.deepEqual(call.options.headers, request.headers);
  assert.deepEqual(JSON.parse(call.options.body), request.body);
});

for (const status of [401, 403]) {
  test(`returns authorization error for HTTP ${status}`, async () => {
    await assert.rejects(
      sendOpenAiCompatibleRequest(request, { fetchFn: async () => jsonResponse(status, {}) }),
      /authorization failed.*API key/i
    );
  });
}

test("returns rate limit error for HTTP 429", async () => {
  await assert.rejects(
    sendOpenAiCompatibleRequest(request, { fetchFn: async () => jsonResponse(429, {}) }),
    /rate limit exceeded/i
  );
});

test("returns provider error for HTTP 500", async () => {
  await assert.rejects(
    sendOpenAiCompatibleRequest(request, { fetchFn: async () => jsonResponse(500, {}) }),
    /provider server error \(500\)/i
  );
});

test("returns clear error for invalid JSON response", async () => {
  await assert.rejects(
    sendOpenAiCompatibleRequest(request, {
      fetchFn: async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } })
    }),
    /returned invalid JSON/i
  );
});

test("returns clear error when choices content is missing", async () => {
  await assert.rejects(
    sendOpenAiCompatibleRequest(request, { fetchFn: async () => jsonResponse(200, { choices: [] }) }),
    /missing choices\[0\]\.message\.content/i
  );
});

test("returns clear error for network failure", async () => {
  await assert.rejects(
    sendOpenAiCompatibleRequest(request, {
      fetchFn: async () => { throw new Error("connection reset"); }
    }),
    /network request failed: connection reset/i
  );
});

test("uses injected fetchFn and does not call globalThis.fetch", async () => {
  let globalCalls = 0;
  let injectedCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    globalCalls += 1;
    return jsonResponse(200, { choices: [{ message: { content: "{}" } }] });
  };

  try {
    await sendOpenAiCompatibleRequest(request, {
      fetchFn: async () => {
        injectedCalls += 1;
        return jsonResponse(200, { choices: [{ message: { content: "{}" } }] });
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(injectedCalls, 1);
  assert.equal(globalCalls, 0);
});

test("fails before fetch when API key authorization header is missing", async () => {
  let calls = 0;
  await assert.rejects(
    sendOpenAiCompatibleRequest(
      { ...request, headers: { "Content-Type": "application/json" } },
      { fetchFn: async () => { calls += 1; } }
    ),
    /API key is missing/i
  );
  assert.equal(calls, 0);
});

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}
