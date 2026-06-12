import test from "node:test";
import assert from "node:assert/strict";
import { syncOrderToTwentyCore } from "../src/crm/twenty-sync-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/crm/twenty.js";

const env = {
  TWENTY_SYNC_ENABLED: "true",
  TWENTY_API_BASE_URL: "https://crm.example.test",
  TWENTY_API_KEY: "test-key"
};

test("returns 404 when order is not found", async () => {
  const result = await syncOrderToTwentyCore({ db: createDb(null), env }, 99, {
    sendRequest: fakeSender()
  });
  assert.equal(result.status, 404);
});

test("syncs person opportunity and note sequentially", async () => {
  const db = createDb(createOrder());
  const resources = [];
  const result = await syncOrderToTwentyCore({ db, env }, 1, {
    attemptedAt: "2026-06-12T10:00:00.000Z",
    sendRequest: async (request) => {
      resources.push(request.resource);
      return { data: { data: { id: `${request.resource}-1` } }, status: 201, resource: request.resource };
    }
  });

  assert.deepEqual(resources, ["person", "opportunity", "note"]);
  assert.equal(result.body.sync.status, "success");
  assert.deepEqual(result.body.sync.createdIds, {
    person: "person-1",
    opportunity: "opportunity-1",
    note: "note-1"
  });
  assert.equal(db.order.crm_sync_status, "success");
});

test("disabled sync saves failed status without calling sender", async () => {
  const db = createDb(createOrder());
  let calls = 0;
  const result = await syncOrderToTwentyCore({ db, env: { ...env, TWENTY_SYNC_ENABLED: "false" } }, 1, {
    sendRequest: async () => { calls += 1; }
  });

  assert.equal(calls, 0);
  assert.equal(result.body.sync.status, "failed");
  assert.match(db.order.crm_error, /disabled/i);
});

test("stops on first sender error and preserves partial IDs", async () => {
  const db = createDb(createOrder());
  const resources = [];
  const result = await syncOrderToTwentyCore({ db, env }, 1, {
    sendRequest: async (request) => {
      resources.push(request.resource);
      if (request.resource === "opportunity") throw new Error("Twenty unavailable");
      return { data: { data: { id: "person-1" } } };
    }
  });

  assert.deepEqual(resources, ["person", "opportunity"]);
  assert.equal(result.body.sync.status, "failed");
  assert.equal(result.body.sync.createdIds.person, "person-1");
  assert.equal(db.order.crm_person_id, "person-1");
  assert.match(db.order.crm_error, /unavailable/i);
});

test("does not mutate normal order fields", async () => {
  const db = createDb(createOrder());
  const before = structuredClone(db.order);
  await syncOrderToTwentyCore({ db, env }, 1, { sendRequest: fakeSender() });

  assert.equal(db.order.name, before.name);
  assert.equal(db.order.phone, before.phone);
  assert.equal(db.order.status, before.status);
  assert.equal(db.order.description, before.description);
});

test("endpoint requires admin token", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.test/api/orders/1/crm/twenty", { method: "POST" }),
    env: { ...env, ADMIN_TOKEN: "secret", DB: createDb(createOrder()) },
    params: { id: "1" },
    data: {}
  });
  assert.equal(response.status, 401);
});

test("endpoint uses injected sender and never calls global fetch", async () => {
  const db = createDb(createOrder());
  let globalCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { globalCalls += 1; };

  try {
    const response = await onRequestPost({
      request: new Request("https://example.test/api/orders/1/crm/twenty", {
        method: "POST",
        headers: { Authorization: "Bearer secret" }
      }),
      env: { ...env, ADMIN_TOKEN: "secret", DB: db },
      params: { id: "1" },
      data: { sendRequest: fakeSender() }
    });
    assert.equal(response.status, 200);
    assert.equal(globalCalls, 0);
    assert.equal(db.order.crm_sync_status, "success");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function fakeSender() {
  return async (request) => ({
    data: { data: { id: `${request.resource}-id` } },
    status: 201,
    resource: request.resource
  });
}

function createOrder() {
  return {
    id: 1,
    name: "Aida",
    phone: "+77010000000",
    source: "site",
    city: "Almaty",
    furnitureType: "kitchen",
    budget: 900000,
    description: "Kitchen order",
    notes: "",
    status: "new",
    rawPayload: "{}"
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
              if (!sql.includes("UPDATE orders") || !state.order) return { success: true };
              const keys = [
                "crm_sync_status",
                "crm_person_id",
                "crm_opportunity_id",
                "crm_note_id",
                "crm_error",
                "crm_last_attempt_at",
                "crm_synced_at"
              ];
              keys.forEach((key, index) => { state.order[key] = values[index]; });
              return { success: true };
            }
          };
        }
      };
    }
  };
  return state;
}
