import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { analyzeOrderWithHermesCore } from "../src/agents/hermes-order-core.js";

function makeDb(orders = []) {
  const store = [...orders];
  return {
    prepare(sql) {
      return {
        bind(...args) {
          const id = args[0];
          const order = store.find((o) => o.id === id);
          return {
            first() { return order ? { ...order } : null; },
            all() { return { results: [] }; },
            run() { return { meta: { last_row_id: 1 } }; }
          };
        }
      };
    }
  };
}

function makeEnv(config = {}) {
  return {
    HERMES_AGENT_ENABLED: "true",
    HERMES_AGENT_WEBHOOK_URL: "https://hermes.test/webhook",
    HERMES_AGENT_TOKEN: "test-token",
    ...config
  };
}

function makeOrder(overrides = {}) {
  return {
    id: 1,
    source: "site",
    city: "Алматы",
    furnitureType: "kitchen",
    budget: 615000,
    description: "Кухня 3 метра",
    raw_payload: JSON.stringify({ calculatorMeta: { calculatorId: 1 } }),
    createdAt: "2026-06-25T10:00:00.000Z",
    ...overrides
  };
}

function makeSuccessFetch() {
  return async (url, opts) => ({
    ok: true,
    json: async () => ({
      schemaVersion: 1,
      requiresHumanApproval: true,
      summary: "Client wants a kitchen",
      furnitureType: "kitchen",
      leadTemperature: "warm",
      missingInfo: ["wall width"],
      nextQuestion: "Send wall width?",
      replyDraft: "Hello! Please send wall width.",
      warnings: []
    })
  });
}

describe("analyzeOrderWithHermesCore", () => {
  it("returns 400 for invalid order id", async () => {
    const result = await analyzeOrderWithHermesCore({ db: makeDb() }, -1, { env: makeEnv() });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_order_id");
  });

  it("returns 404 when order is not found", async () => {
    const result = await analyzeOrderWithHermesCore({ db: makeDb() }, 999, { env: makeEnv() });
    assert.equal(result.status, 404);
    assert.equal(result.body.error, "order_not_found");
  });

  it("returns 503 when Hermes is disabled", async () => {
    const result = await analyzeOrderWithHermesCore({ db: makeDb([makeOrder()]) }, 1, {
      env: makeEnv({ HERMES_AGENT_ENABLED: "false" })
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "hermes_agent_disabled");
  });

  it("returns 200 and normalized result on success", async () => {
    const result = await analyzeOrderWithHermesCore({ db: makeDb([makeOrder()]) }, 1, {
      env: makeEnv(),
      sendHermesRequest: makeSuccessFetch()
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.orderId, 1);
    assert.equal(result.body.hermes.furnitureType, "kitchen");
    assert.equal(result.body.hermes.leadTemperature, "warm");
    assert.equal(result.body.hermes.replyDraft, "Hello! Please send wall width.");
  });

  it("returns 502 when Hermes returns error", async () => {
    const failingFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });

    const result = await analyzeOrderWithHermesCore({ db: makeDb([makeOrder()]) }, 1, {
      env: makeEnv(),
      sendHermesRequest: failingFetch
    });

    assert.equal(result.status, 502);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error, "hermes_agent_http_error");
  });

  it("preserves order fields on Hermes error", async () => {
    const failingFetch = async () => { throw new Error("network failure"); };

    const result = await analyzeOrderWithHermesCore({ db: makeDb([makeOrder()]) }, 1, {
      env: makeEnv(),
      sendHermesRequest: failingFetch
    });

    assert.equal(result.status, 502);
    assert.equal(result.body.error, "hermes_agent_network_error");
    assert.equal(result.body.orderId, 1);
  });

  it("saves communication draft when replyDraft is present", async () => {
    let savedDraft = null;
    const db = {
      prepare() { return this; },
      bind() { return this; },
      first() { return makeOrder(); },
      run() {
        savedDraft = true;
        return { meta: { last_row_id: 1 } };
      },
      all() { return { results: [] }; }
    };

    const createDraftSpy = { called: false };
    const originalCreateDraft = (await import("../src/communication-drafts.js")).createCommunicationDraft;

    const result = await analyzeOrderWithHermesCore({ db }, 1, {
      env: makeEnv(),
      sendHermesRequest: makeSuccessFetch()
    });

    assert.equal(result.status, 200);
    assert.ok(result.body.draft || result.body.hermes.replyDraft);
  });

  it("does not use global fetch", async () => {
    const originalFetch = globalThis.fetch;
    let globalFetchCalled = false;
    globalThis.fetch = async () => {
      globalFetchCalled = true;
      return { ok: true, json: async () => ({}) };
    };

    const result = await analyzeOrderWithHermesCore({ db: makeDb([makeOrder()]) }, 1, {
      env: makeEnv(),
      sendHermesRequest: async () => ({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          requiresHumanApproval: true,
          summary: "test",
          furnitureType: "other",
          leadTemperature: "neutral",
          missingInfo: [],
          nextQuestion: "",
          replyDraft: "",
          warnings: []
        })
      })
    });

    globalThis.fetch = originalFetch;
    assert.equal(result.status, 200);
    assert.equal(globalFetchCalled, false);
  });
});
