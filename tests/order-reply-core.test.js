import test from "node:test";
import assert from "node:assert/strict";
import { suggestOrderReplyCore } from "../src/ai/order-reply-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/ai/suggest-reply.js";

test("returns 404 for missing order", async () => {
  const result = await suggestOrderReplyCore({ db: createDb(null) }, 7, { sendAiRequest: async () => "{}" });
  assert.equal(result.status, 404);
});

test("returns a manual reply suggestion without database writes", async () => {
  const db = createDb({ id: 1, furnitureType: "kitchen", description: "Need kitchen" });
  const result = await suggestOrderReplyCore({ db }, 1, {
    sendAiRequest: async () => '{"reply":"Уточните размеры помещения.","tone":"professional","channel":"messenger","warnings":[]}'
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.suggestion.requiresHumanApproval, true);
  assert.equal(db.writeCalls, 0);
});

test("endpoint is disabled by default", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.test/api/orders/1/ai/suggest-reply", { method: "POST", headers: { "X-Admin-Token": "secret" } }),
    env: { ADMIN_TOKEN: "secret", DB: createDb({ id: 1 }) },
    params: { id: "1" },
    data: {}
  });
  assert.equal(response.status, 503);
});

test("endpoint supports injected sender when explicitly enabled", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.test/api/orders/1/ai/suggest-reply", { method: "POST", headers: { "X-Admin-Token": "secret" } }),
    env: { ADMIN_TOKEN: "secret", AI_COMMUNICATIONS_ENABLED: "true", DB: createDb({ id: 1, furnitureType: "office" }) },
    params: { id: "1" },
    data: { sendAiRequest: async () => '{"reply":"Уточните размеры.","tone":"concise","channel":"messenger","warnings":[]}' }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).suggestion.reply, "Уточните размеры.");
});

function createDb(order) {
  return {
    writeCalls: 0,
    prepare() {
      return {
        bind() {
          return {
            async first() { return order ? { ...order } : null; },
            async run() { this.writeCalls += 1; }
          };
        }
      };
    }
  };
}
