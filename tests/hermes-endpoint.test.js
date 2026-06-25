import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost, onRequest, onRequestOptions } from "../functions/api/orders/[id]/agent/hermes.js";

function makeRequest(overrides = {}) {
  const headerMap = overrides.headers || {};
  return {
    ...overrides,
    headers: {
      get(name) { return headerMap[name] || null; }
    }
  };
}

describe("Hermes endpoint", () => {
  it("returns 401 without admin token", async () => {
    const ctx = {
      request: makeRequest({ headers: {} }),
      env: { ADMIN_TOKEN: "admin-tok" },
      params: { id: "1" }
    };
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 401);
    const body = JSON.parse(await res.text());
    assert.equal(body.error, "unauthorized");
  });

  it("returns 503 when ADMIN_TOKEN is not configured", async () => {
    const ctx = {
      request: makeRequest({ headers: { "X-Admin-Token": "tok" } }),
      env: {},
      params: { id: "1" }
    };
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 503);
    assert.equal(JSON.parse(await res.text()).error, "admin_not_configured");
  });

  it("returns 503 when Hermes is disabled", async () => {
    const ctx = {
      request: makeRequest({ headers: { "X-Admin-Token": "admin-tok" } }),
      env: { ADMIN_TOKEN: "admin-tok", HERMES_AGENT_ENABLED: "false" },
      params: { id: "1" }
    };
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 503);
    const body = JSON.parse(await res.text());
    assert.equal(body.error, "hermes_agent_disabled");
  });

  it("returns 503 when webhook URL or token is not configured", async () => {
    const ctx = {
      request: makeRequest({ headers: { "X-Admin-Token": "admin-tok" } }),
      env: { ADMIN_TOKEN: "admin-tok", HERMES_AGENT_ENABLED: "true" },
      params: { id: "1" }
    };
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 503);
    const body = JSON.parse(await res.text());
    assert.equal(body.error, "hermes_agent_not_configured");
  });

  it("uses injected sender when provided via context.data", async () => {
    const ctx = {
      request: makeRequest({ headers: { "X-Admin-Token": "admin-tok" } }),
      env: {
        ADMIN_TOKEN: "admin-tok",
        HERMES_AGENT_ENABLED: "true",
        HERMES_AGENT_WEBHOOK_URL: "https://hermes.test/webhook",
        HERMES_AGENT_TOKEN: "test-token",
        DB: {
          prepare() {
            return {
              bind() { return this; },
              first() {
                return {
                  id: 1, source: "site", city: "Алматы",
                  furniture_type: "kitchen", budget: 615000,
                  description: "test", raw_payload: "{}",
                  created_at: "2026-06-25T10:00:00.000Z"
                };
              },
              all() { return { results: [] }; },
              run() { return { meta: { last_row_id: 1 } }; }
            };
          }
        }
      },
      params: { id: "1" },
      data: {
        sendHermesRequest: async () => ({
          ok: true,
          json: async () => ({
            schemaVersion: 1,
            requiresHumanApproval: true,
            summary: "test summary",
            furnitureType: "kitchen",
            leadTemperature: "warm",
            missingInfo: [],
            nextQuestion: "",
            replyDraft: "",
            warnings: []
          })
        })
      }
    };
    const res = await onRequestPost(ctx);
    assert.equal(res.status, 200);
    const body = JSON.parse(await res.text());
    assert.equal(body.success, true);
    assert.equal(body.hermes.furnitureType, "kitchen");
  });

  it("rejects non-POST methods", async () => {
    const ctx = { request: makeRequest({}), env: {}, params: {} };
    const res = await onRequest(ctx);
    assert.equal(res.status, 405);
    assert.equal(JSON.parse(await res.text()).error, "method_not_allowed");
  });

  it("responds to OPTIONS", async () => {
    const res = await onRequestOptions();
    assert.equal(res.status, 204);
  });
});
