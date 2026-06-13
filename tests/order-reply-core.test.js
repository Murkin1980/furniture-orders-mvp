import test from "node:test";
import assert from "node:assert/strict";
import { suggestOrderReplyCore } from "../src/ai/order-reply-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/ai/suggest-reply.js";

test("returns 404 for missing order", async () => {
  const result = await suggestOrderReplyCore({ db: createDb(null) }, 7, { sendAiRequest: async () => "{}" });
  assert.equal(result.status, 404);
});

test("returns and persists a manual reply suggestion draft", async () => {
  const db = createDb({ id: 1, furnitureType: "kitchen", description: "Need kitchen" });
  const result = await suggestOrderReplyCore({ db }, 1, {
    sendAiRequest: async () => '{"reply":"Уточните размеры помещения.","tone":"professional","channel":"messenger","warnings":[]}'
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.suggestion.requiresHumanApproval, true);
  assert.equal(result.body.draft.status, "draft");
  assert.equal(db.writeCalls, 1);
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
  const drafts = [];
  return {
    writeCalls: 0,
    prepare(sql) {
      const db = this;
      let values = [];
      return {
        bind(...input) {
          values = input;
          return {
            async first() {
              if (sql.includes("FROM orders")) return order ? { ...order } : null;
              if (sql.includes("FROM communication_drafts WHERE id")) return drafts.find((item) => item.id === values[0]) || null;
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO communication_drafts")) {
                db.writeCalls += 1;
                drafts.push({ id: 1, orderId: values[0], channel: values[1], content: values[2], status: "draft", warningsJson: values[6] });
                return { meta: { last_row_id: 1 } };
              }
              return { success: true };
            }
          };
        }
      };
    }
  };
}
