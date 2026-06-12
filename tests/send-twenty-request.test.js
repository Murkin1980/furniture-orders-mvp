import test from "node:test";
import assert from "node:assert/strict";
import { sendTwentyRequest } from "../src/crm/send-twenty-request.js";

const request = {
  resource: "person",
  url: "https://crm.example.test/rest/people",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer test-key"
  },
  body: {
    name: "Aida"
  }
};

test("returns normalized successful Twenty response", async () => {
  const result = await sendTwentyRequest(request, {
    fetchFn: async () => jsonResponse(201, { data: { id: "person-1" } })
  });

  assert.deepEqual(result, {
    data: { data: { id: "person-1" } },
    status: 201,
    resource: "person"
  });
});

test("calls injected fetch once with request values", async () => {
  const calls = [];
  await sendTwentyRequest(request, {
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(200, {});
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, request.url);
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(calls[0].options.headers, request.headers);
  assert.deepEqual(JSON.parse(calls[0].options.body), request.body);
});

test("requires injected fetchFn and never falls back to global fetch", async () => {
  let globalCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    globalCalls += 1;
    return jsonResponse(200, {});
  };

  try {
    await assert.rejects(sendTwentyRequest(request), /requires an injected fetchFn/i);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(globalCalls, 0);
});

test("fails before fetch when API key is missing", async () => {
  let calls = 0;

  await assert.rejects(
    sendTwentyRequest(
      { ...request, headers: { "Content-Type": "application/json" } },
      { fetchFn: async () => { calls += 1; } }
    ),
    /API key is missing/i
  );

  assert.equal(calls, 0);
});

for (const status of [401, 403]) {
  test(`returns authorization error for HTTP ${status}`, async () => {
    await assert.rejects(
      sendTwentyRequest(request, { fetchFn: async () => jsonResponse(status, {}) }),
      /authorization failed.*API key/i
    );
  });
}

test("stops after one request on HTTP 429", async () => {
  let calls = 0;

  await assert.rejects(
    sendTwentyRequest(request, {
      fetchFn: async () => {
        calls += 1;
        return jsonResponse(429, {});
      }
    }),
    /rate limit exceeded.*try again later/i
  );

  assert.equal(calls, 1);
});

test("returns server error for HTTP 500", async () => {
  await assert.rejects(
    sendTwentyRequest(request, { fetchFn: async () => jsonResponse(500, {}) }),
    /Twenty server error \(500\)/i
  );
});

test("returns clear error for invalid JSON response", async () => {
  await assert.rejects(
    sendTwentyRequest(request, {
      fetchFn: async () => ({
        ok: true,
        status: 200,
        json: async () => { throw new Error("bad json"); }
      })
    }),
    /Twenty returned invalid JSON/i
  );
});

test("returns clear error for network failure", async () => {
  await assert.rejects(
    sendTwentyRequest(request, {
      fetchFn: async () => { throw new Error("connection reset"); }
    }),
    /Twenty network request failed: connection reset/i
  );
});

test("validates the request before calling fetch", async () => {
  let calls = 0;

  await assert.rejects(
    sendTwentyRequest(
      { ...request, method: "GET" },
      { fetchFn: async () => { calls += 1; } }
    ),
    /method must be POST/i
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
