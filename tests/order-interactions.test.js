import test from "node:test";
import assert from "node:assert/strict";
import { createOrderInteraction, listOrderInteractions } from "../src/order-interactions.js";

function createDb() {
  const interactions = [];
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async first() {
          if (sql.includes("FROM orders")) return values[0] === 1 ? { id: 1 } : null;
          if (sql.includes("FROM order_interactions WHERE id")) return interactions.find((item) => item.id === values[0]) || null;
          return null;
        },
        async all() { return { results: interactions.filter((item) => item.orderId === values[0]).reverse() }; },
        async run() {
          interactions.push({ id: interactions.length + 1, orderId: values[0], type: values[1], summary: values[2], createdBy: values[3], createdAt: "2026-06-12" });
          return { meta: { last_row_id: interactions.length } };
        }
      };
    }
  };
}

test("creates and lists order interactions", async () => {
  const db = createDb();
  const created = await createOrderInteraction({ db, orderId: 1, type: "call", summary: "Обсудили замер" });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.type, "call");
  const listed = await listOrderInteractions({ db, orderId: 1 });
  assert.equal(listed.body.items.length, 1);
});

test("validates interaction input and missing order", async () => {
  const db = createDb();
  assert.equal((await createOrderInteraction({ db, orderId: 1, type: "email", summary: "x" })).status, 400);
  assert.equal((await createOrderInteraction({ db, orderId: 1, type: "call", summary: "" })).status, 400);
  assert.equal((await listOrderInteractions({ db, orderId: 99 })).status, 404);
});
