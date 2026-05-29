import test from "node:test";
import assert from "node:assert/strict";
import { createOrder, normalizeOrderPayload, validateOrderPayload } from "../src/orders-core.js";

test("normalizes the base order contract", () => {
  const payload = normalizeOrderPayload({
    name: " Ерлан ",
    phone: "+7 (701) 123-45-67",
    budget: "850000"
  });

  assert.equal(payload.name, "Ерлан");
  assert.equal(payload.phone, "+77011234567");
  assert.equal(payload.source, "site");
  assert.equal(payload.budget, 850000);
});

test("requires name and phone", () => {
  const errors = validateOrderPayload(normalizeOrderPayload({ source: "site" }));
  assert.deepEqual(errors.map((error) => error.field), ["name", "phone"]);
});

test("creates client and order, then sends telegram when configured", async () => {
  const db = createMockDb();
  const telegramCalls = [];
  const result = await createOrder({
    db,
    env: {
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat"
    },
    fetchImpl: async (url, options) => {
      telegramCalls.push({ url, options });
      return { ok: true };
    },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      source: "site",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 850000,
      description: "Нужна угловая кухня"
    }
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.orderId, 1);
  assert.equal(result.body.clientId, 1);
  assert.equal(result.body.telegramSent, true);
  assert.equal(telegramCalls.length, 1);
});

test("returns 400 without writing invalid orders", async () => {
  const db = createMockDb();
  const result = await createOrder({
    db,
    payload: {
      phone: "123"
    }
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.clients.length, 0);
  assert.equal(db.orders.length, 0);
});

function createMockDb() {
  const state = {
    clients: [],
    orders: [],
    prepare(sql) {
      return {
        run: async () => {
          if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX")) {
            return { success: true };
          }

          throw new Error(`Unexpected unbound run SQL: ${sql}`);
        },
        bind: (...values) => ({
          run: async () => {
            if (sql.includes("INSERT INTO clients")) {
              const [name, phone, city] = values;
              let client = state.clients.find((item) => item.phone === phone);
              if (!client) {
                client = { id: state.clients.length + 1, name, phone, city };
                state.clients.push(client);
              } else {
                client.name = name;
                client.city = city || client.city;
              }
              return { success: true };
            }

            if (sql.includes("INSERT INTO orders")) {
              const [clientId, source, city, furnitureType, budget, description, rawPayload] = values;
              const order = {
                id: state.orders.length + 1,
                clientId,
                source,
                city,
                furnitureType,
                budget,
                description,
                rawPayload,
                status: "new"
              };
              state.orders.push(order);
              return { success: true, meta: { last_row_id: order.id } };
            }

            throw new Error(`Unexpected run SQL: ${sql}`);
          },
          first: async () => {
            if (sql.includes("SELECT id, name, phone, city FROM clients")) {
              const [phone] = values;
              return state.clients.find((item) => item.phone === phone) || null;
            }

            throw new Error(`Unexpected first SQL: ${sql}`);
          }
        })
      };
    }
  };

  return state;
}
