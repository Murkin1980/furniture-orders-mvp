import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendToHermes, HERMES_ERROR } from "../src/agents/hermes-client.js";

function makeFetchFn(status = 200, body = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
}

describe("sendToHermes", () => {
  it("returns disabled error when enabled is not true", async () => {
    const result = await sendToHermes({ id: 1 }, { fetchFn: makeFetchFn() });
    assert.equal(result.ok, false);
    assert.equal(result.error, HERMES_ERROR.DISABLED);
  });

  it("returns missing_url error when webhookUrl is empty", async () => {
    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "", token: "tok", fetchFn: makeFetchFn() }
    );
    assert.equal(result.error, HERMES_ERROR.MISSING_URL);
  });

  it("returns missing_token error when token is empty", async () => {
    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "", fetchFn: makeFetchFn() }
    );
    assert.equal(result.error, HERMES_ERROR.MISSING_TOKEN);
  });

  it("returns invalid_payload error when payload is not an object", async () => {
    const result = await sendToHermes(
      null,
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn: makeFetchFn() }
    );
    assert.equal(result.error, HERMES_ERROR.INVALID_PAYLOAD);
  });

  it("sends minimal payload and returns ok with data", async () => {
    const expectedBody = { schemaVersion: 1, order: { id: 123 } };
    let capturedUrl, capturedOptions;

    const fetchFn = async (url, opts) => {
      capturedUrl = url;
      capturedOptions = opts;
      return { ok: true, status: 200, json: async () => ({ summary: "test" }) };
    };

    const result = await sendToHermes(expectedBody, {
      enabled: true,
      webhookUrl: "https://hermes.test/webhook",
      token: "secret-token",
      fetchFn
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { summary: "test" });
    assert.equal(capturedUrl, "https://hermes.test/webhook");
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.headers["Content-Type"], "application/json");
    assert.equal(capturedOptions.headers["Authorization"], "Bearer secret-token");
    assert.equal(capturedOptions.body, JSON.stringify(expectedBody));
  });

  it("returns http_error for non-ok response", async () => {
    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn: makeFetchFn(503) }
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, HERMES_ERROR.HTTP_ERROR);
  });

  it("stops on HTTP 429 without retry", async () => {
    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn: makeFetchFn(429) }
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, HERMES_ERROR.HTTP_ERROR);
  });

  it("returns invalid_json when response is not valid JSON", async () => {
    const fetchFn = async () => ({
      ok: true,
      json: async () => { throw new Error("invalid json"); }
    });

    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn }
    );
    assert.equal(result.error, HERMES_ERROR.INVALID_JSON);
  });

  it("returns timeout error when fetch takes too long", async () => {
    const fetchFn = async () => {
      await new Promise((r) => setTimeout(r, 200));
      throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    };

    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn, timeoutMs: 10 }
    );
    assert.equal(result.error, HERMES_ERROR.TIMEOUT);
  });

  it("returns network error when fetch throws", async () => {
    const fetchFn = async () => { throw new Error("connection refused"); };

    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn }
    );
    assert.equal(result.error, HERMES_ERROR.NETWORK_ERROR);
  });

  it("uses default timeout of 4000ms when timeoutMs is not set", async () => {
    let capturedSignal;
    const fetchFn = async (url, opts) => {
      capturedSignal = opts.signal;
      return { ok: true, json: async () => ({}) };
    };

    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn }
    );

    assert.equal(result.ok, true);
    assert.ok(capturedSignal);
    assert.equal(capturedSignal.signal?.aborted, undefined);
  });

  it("throws when fetchFn is missing", async () => {
    await assert.rejects(
      () => sendToHermes({ id: 1 }, { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok" }),
      /Hermes fetch implementation is not available/
    );
  });

  it("does not use global fetch by default", async () => {
    const originalFetch = globalThis.fetch;
    let globalFetchCalled = false;
    globalThis.fetch = async () => {
      globalFetchCalled = true;
      return { ok: true, json: async () => ({}) };
    };

    const result = await sendToHermes(
      { id: 1 },
      { enabled: true, webhookUrl: "https://example.com/webhook", token: "tok", fetchFn: async () => {
        return { ok: true, json: async () => ({ summary: "from injected" }) };
      }}
    );

    globalThis.fetch = originalFetch;
    assert.equal(result.ok, true);
    assert.equal(globalFetchCalled, false);
  });
});
