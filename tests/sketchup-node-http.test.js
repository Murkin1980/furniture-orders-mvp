import test from "node:test";
import assert from "node:assert/strict";
import { sendSketchUpNodeRequest } from "../src/sketchup/node-http.js";

test("sends a signed request through injected fetch once", async () => {
  let calls = 0;
  const result = await sendSketchUpNodeRequest(request(), {
    fetchFn: async (url, init) => {
      calls += 1;
      assert.equal(url, request().url);
      assert.equal(init.method, "POST");
      return response(200, { status: "accepted", jobId: "job-test-001" });
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.meta.attempts, 1);
});

test("requires injected fetch and never uses global fetch", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls += 1; };
  try {
    const result = await sendSketchUpNodeRequest(request());
    assert.equal(result.error, "fetch_required");
    assert.equal(result.meta.attempts, 0);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stops immediately on 429 without retry", async () => {
  let calls = 0;
  const result = await sendSketchUpNodeRequest(request(), {
    fetchFn: async () => {
      calls += 1;
      return response(429, {});
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.error, "rate_limited");
  assert.equal(result.meta.attempts, 1);
});

test("normalizes authorization and server errors", async () => {
  const unauthorized = await sendSketchUpNodeRequest(request(), { fetchFn: async () => response(401, {}) });
  const server = await sendSketchUpNodeRequest(request(), { fetchFn: async () => response(500, {}) });
  assert.equal(unauthorized.error, "authorization_failed");
  assert.equal(server.error, "node_server_error");
});

test("handles invalid JSON and network errors", async () => {
  const invalid = await sendSketchUpNodeRequest(request(), {
    fetchFn: async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } })
  });
  const network = await sendSketchUpNodeRequest(request(), {
    fetchFn: async () => { throw new Error("offline"); }
  });
  assert.equal(invalid.error, "invalid_node_response");
  assert.equal(network.error, "network_error");
  assert.equal(network.meta.attempts, 1);
});

test("rejects invalid request before fetch", async () => {
  let calls = 0;
  const result = await sendSketchUpNodeRequest({ url: "http://unsafe.test" }, {
    fetchFn: async () => { calls += 1; }
  });
  assert.equal(result.error, "invalid_request");
  assert.equal(result.meta.attempts, 0);
  assert.equal(calls, 0);
});

function request() {
  return {
    url: "https://sketchup-node.example.test/v1/jobs",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sketchup-signature": "a".repeat(64),
      "x-idempotency-key": "sketchup:8:1:job-test-001"
    },
    body: "{\"jobId\":\"job-test-001\"}"
  };
}

function response(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
