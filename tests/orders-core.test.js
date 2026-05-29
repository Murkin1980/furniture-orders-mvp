import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrder,
  formatTelegramMessage,
  listOrders,
  normalizeOrderPayload,
  updateOrderStatus,
  validateOrderPayload
} from "../src/orders-core.js";
import { ORDER_STATUSES, isOrderStatus } from "../src/order-statuses.js";

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
      RUNTIME_SCHEMA_INIT: "true",
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
  assert.match(JSON.parse(telegramCalls[0].options.body).text, /Новая заявка на мебель/);
});

test("returns 400 without writing invalid orders", async () => {
  const db = createMockDb();
  const result = await createOrder({
    db,
    env: {
      RUNTIME_SCHEMA_INIT: "true"
    },
    payload: {
      phone: "123"
    }
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.clients.length, 0);
  assert.equal(db.orders.length, 0);
});

test("formats telegram message for furniture managers", () => {
  const text = formatTelegramMessage({
    order: { id: 123 },
    client: { name: "Ерлан", phone: "+77011234567" },
    payload: {
      source: "site",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 850000,
      description: "Нужна угловая кухня"
    }
  });

  assert.equal(
    text,
    [
      "Новая заявка на мебель",
      "Заказ: #123",
      "Клиент: Ерлан",
      "Телефон: +77011234567",
      "Город: Алматы",
      "Тип: kitchen",
      "Бюджет: 850000",
      "Комментарий: Нужна угловая кухня",
      "Источник: site"
    ].join("\n")
  );
});

test("defines the stage 2 order statuses", () => {
  assert.deepEqual(ORDER_STATUSES, [
    "new",
    "in_review",
    "quoted",
    "in_production",
    "completed",
    "canceled"
  ]);
  assert.equal(isOrderStatus("quoted"), true);
  assert.equal(isOrderStatus("unknown"), false);
});

test("lists orders with client fields and status filter", async () => {
  const db = createMockDb();
  await createOrder({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      source: "site",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 850000,
      description: "Нужна кухня"
    }
  });

  const all = await listOrders({ db, env: { RUNTIME_SCHEMA_INIT: "true" } });
  assert.equal(all.status, 200);
  assert.equal(all.body.items.length, 1);
  assert.equal(all.body.items[0].clientName, "Ерлан");
  assert.equal(all.body.items[0].status, "new");

  const filtered = await listOrders({ db, status: "completed" });
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.items.length, 0);
});

test("rejects unsupported list filter status", async () => {
  const result = await listOrders({ db: createMockDb(), status: "waiting" });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_status");
});

test("updates order status and notes", async () => {
  const db = createMockDb();
  await createOrder({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Ерлан",
      phone: "+77011234567"
    }
  });

  const result = await updateOrderStatus({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    orderId: 1,
    status: "in_review",
    notes: "Уточнить размеры"
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.item.status, "in_review");
  assert.equal(result.body.item.notes, "Уточнить размеры");
});

test("rejects invalid status updates", async () => {
  const result = await updateOrderStatus({
    db: createMockDb(),
    orderId: 1,
    status: "waiting"
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_status");
});

test("returns 404 when updating a missing order", async () => {
  const result = await updateOrderStatus({
    db: createMockDb(),
    orderId: 999,
    status: "quoted"
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, "order_not_found");
});

function createMockDb() {
  const state = {
    clients: [],
    orders: [],
    prepare(sql) {
      return {
        all: async () => {
          if (sql.includes("PRAGMA table_info(orders)")) {
            return { results: [{ name: "updated_at" }, { name: "notes" }] };
          }

          if (sql.includes("FROM orders") && sql.includes("JOIN clients")) {
            const statusFilter = sql.includes("WHERE orders.status = ?") ? this?.values?.[0] : null;
            const items = state.orders
              .filter((order) => !statusFilter || order.status === statusFilter)
              .map((order) => toOrderRow(state, order))
              .sort((a, b) => b.id - a.id);
            return { results: items };
          }

          throw new Error(`Unexpected all SQL: ${sql}`);
        },
        run: async () => {
          if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX") || sql.startsWith("ALTER TABLE")) {
            return { success: true };
          }

          throw new Error(`Unexpected unbound run SQL: ${sql}`);
        },
        bind: (...values) => ({
          all: async () => {
            if (sql.includes("FROM orders") && sql.includes("JOIN clients")) {
              const statusFilter = sql.includes("WHERE orders.status = ?") ? values[0] : null;
              const items = state.orders
                .filter((order) => !statusFilter || order.status === statusFilter)
                .map((order) => toOrderRow(state, order))
                .sort((a, b) => b.id - a.id);
              return { results: items };
            }

            throw new Error(`Unexpected bound all SQL: ${sql}`);
          },
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
                notes: null,
                status: "new",
                createdAt: now(),
                updatedAt: now()
              };
              state.orders.push(order);
              return { success: true, meta: { last_row_id: order.id } };
            }

            if (sql.includes("UPDATE orders")) {
              const [status, notes, orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              if (order) {
                order.status = status;
                order.notes = notes;
                order.updatedAt = now();
              }
              return { success: true };
            }

            throw new Error(`Unexpected run SQL: ${sql}`);
          },
          first: async () => {
            if (sql.includes("SELECT id, name, phone, city FROM clients")) {
              const [phone] = values;
              return state.clients.find((item) => item.phone === phone) || null;
            }

            if (sql.includes("SELECT id FROM orders WHERE id = ?")) {
              const [orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              return order ? { id: order.id } : null;
            }

            if (sql.includes("FROM orders") && sql.includes("JOIN clients") && sql.includes("WHERE orders.id = ?")) {
              const [orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              return order ? toOrderRow(state, order) : null;
            }

            throw new Error(`Unexpected first SQL: ${sql}`);
          }
        })
      };
    }
  };

  return state;
}

function now() {
  return "2026-05-30 10:00:00";
}

function toOrderRow(state, order) {
  const client = state.clients.find((item) => item.id === order.clientId);

  return {
    id: order.id,
    clientId: order.clientId,
    clientName: client?.name || null,
    phone: client?.phone || null,
    source: order.source,
    city: order.city,
    furnitureType: order.furnitureType,
    budget: order.budget,
    description: order.description,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
