import { isOrderStatus } from "./order-statuses.js";

const REQUIRED_FIELDS = ["name", "phone"];

export function normalizeOrderPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const normalized = {
    name: cleanText(payload.name),
    phone: normalizePhone(payload.phone),
    source: cleanText(payload.source) || "site",
    city: cleanText(payload.city),
    furnitureType: cleanText(payload.furnitureType),
    budget: normalizeBudget(payload.budget),
    description: cleanText(payload.description)
  };

  return normalized;
}

export function validateOrderPayload(payload) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!payload[field]) {
      errors.push({ field, message: `Field "${field}" is required.` });
    }
  }

  if (payload.phone && payload.phone.replace(/\D/g, "").length < 10) {
    errors.push({ field: "phone", message: "Phone must contain at least 10 digits." });
  }

  if (payload.budget !== null && (!Number.isInteger(payload.budget) || payload.budget < 0)) {
    errors.push({ field: "budget", message: "Budget must be a positive integer." });
  }

  return errors;
}

export async function createOrder({ db, payload, env = {}, fetchImpl = fetch }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalized = normalizeOrderPayload(payload);
  const validationErrors = validateOrderPayload(normalized);

  if (validationErrors.length) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "validation_error",
        message: "Required order fields are missing or invalid.",
        fields: validationErrors
      }
    };
  }

  const client = await upsertClient(db, normalized);
  const order = await insertOrder(db, client.id, normalized);
  const telegram = await notifyTelegram({ env, order, client, payload: normalized, fetchImpl });

  return {
    ok: true,
    status: 201,
    body: {
      success: true,
      orderId: order.id,
      clientId: client.id,
      status: order.status,
      telegramSent: telegram.sent
    }
  };
}

async function ensureSchema(db, env) {
  if (env.RUNTIME_SCHEMA_INIT !== "true" || typeof db.prepare !== "function") {
    return;
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      city TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'site',
      city TEXT,
      furniture_type TEXT,
      budget INTEGER CHECK (budget IS NULL OR budget >= 0),
      description TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      raw_payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,
    "CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)"
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }

  await ensureOrderUpdatedAtColumn(db);
  await ensureOrderNotesColumn(db);
}

async function ensureOrderUpdatedAtColumn(db) {
  const statement = db.prepare("PRAGMA table_info(orders)");
  if (typeof statement.all !== "function") {
    return;
  }

  const result = await statement.all();
  const columns = result?.results || [];
  const hasUpdatedAt = columns.some((column) => column.name === "updated_at");

  if (!hasUpdatedAt) {
    await db.prepare("ALTER TABLE orders ADD COLUMN updated_at TEXT").run();
  }
}

async function ensureOrderNotesColumn(db) {
  const statement = db.prepare("PRAGMA table_info(orders)");
  if (typeof statement.all !== "function") {
    return;
  }

  const result = await statement.all();
  const columns = result?.results || [];
  const hasNotes = columns.some((column) => column.name === "notes");

  if (!hasNotes) {
    await db.prepare("ALTER TABLE orders ADD COLUMN notes TEXT").run();
  }
}

export async function listOrders({ db, env = {}, status = null }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalizedStatus = cleanText(status);
  if (normalizedStatus && !isOrderStatus(normalizedStatus)) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "invalid_status",
        message: "Status is not supported."
      }
    };
  }

  const baseQuery = `
    SELECT
      orders.id,
      orders.client_id AS clientId,
      clients.name AS clientName,
      clients.phone AS phone,
      orders.source,
      orders.city,
      orders.furniture_type AS furnitureType,
      orders.budget,
      orders.description,
      orders.notes,
      orders.status,
      orders.created_at AS createdAt,
      COALESCE(orders.updated_at, orders.created_at) AS updatedAt
    FROM orders
    JOIN clients ON clients.id = orders.client_id`;
  const orderClause = " ORDER BY orders.created_at DESC, orders.id DESC";

  const statement = normalizedStatus
    ? db.prepare(`${baseQuery} WHERE orders.status = ?${orderClause}`).bind(normalizedStatus)
    : db.prepare(`${baseQuery}${orderClause}`);
  const result = await statement.all();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      items: result?.results || []
    }
  };
}

export async function updateOrderStatus({ db, env = {}, orderId, status, notes = null }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalizedOrderId = Number(orderId);
  const normalizedStatus = cleanText(status);
  const normalizedNotes = cleanText(notes);

  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId < 1) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "invalid_order_id",
        message: "orderId must be a positive integer."
      }
    };
  }

  if (!normalizedStatus || !isOrderStatus(normalizedStatus)) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "invalid_status",
        message: "Status is not supported."
      }
    };
  }

  const existing = await db
    .prepare("SELECT id FROM orders WHERE id = ?")
    .bind(normalizedOrderId)
    .first();

  if (!existing) {
    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        error: "order_not_found",
        message: "Order was not found."
      }
    };
  }

  await db
    .prepare(
      `UPDATE orders
       SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(normalizedStatus, normalizedNotes, normalizedOrderId)
    .run();

  const result = await db
    .prepare(
      `SELECT
        orders.id,
        orders.client_id AS clientId,
        clients.name AS clientName,
        clients.phone AS phone,
        orders.source,
        orders.city,
        orders.furniture_type AS furnitureType,
        orders.budget,
        orders.description,
        orders.notes,
        orders.status,
        orders.created_at AS createdAt,
        COALESCE(orders.updated_at, orders.created_at) AS updatedAt
       FROM orders
       JOIN clients ON clients.id = orders.client_id
       WHERE orders.id = ?`
    )
    .bind(normalizedOrderId)
    .first();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: result
    }
  };
}

async function upsertClient(db, payload) {
  await db
    .prepare(
      `INSERT INTO clients (name, phone, city, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(phone) DO UPDATE SET
         name = excluded.name,
         city = COALESCE(excluded.city, clients.city),
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(payload.name, payload.phone, payload.city)
    .run();

  const client = await db
    .prepare("SELECT id, name, phone, city FROM clients WHERE phone = ?")
    .bind(payload.phone)
    .first();

  if (!client) {
    throw new Error("Client was not created.");
  }

  return client;
}

async function insertOrder(db, clientId, payload) {
  const result = await db
    .prepare(
      `INSERT INTO orders (
        client_id, source, city, furniture_type, budget, description, status, raw_payload, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, CURRENT_TIMESTAMP)`
    )
    .bind(
      clientId,
      payload.source,
      payload.city,
      payload.furnitureType,
      payload.budget,
      payload.description,
      JSON.stringify(payload)
    )
    .run();

  const orderId = result?.meta?.last_row_id;
  if (!orderId) {
    throw new Error("Order was not created.");
  }

  return {
    id: orderId,
    status: "new"
  };
}

async function notifyTelegram({ env, order, client, payload, fetchImpl }) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { sent: false, skipped: true };
  }

  const text = formatTelegramMessage({ order, client, payload });

  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    return { sent: response.ok };
  } catch (error) {
    console.error("Telegram notification failed", error);
    return { sent: false };
  }
}

export function formatTelegramMessage({ order, client, payload }) {
  return [
    "Новая заявка на мебель",
    `Заказ: #${order.id}`,
    `Клиент: ${client.name}`,
    `Телефон: ${client.phone}`,
    payload.city ? `Город: ${payload.city}` : null,
    payload.furnitureType ? `Тип: ${payload.furnitureType}` : null,
    payload.budget ? `Бюджет: ${payload.budget}` : null,
    payload.description ? `Комментарий: ${payload.description}` : null,
    `Источник: ${payload.source}`
  ].filter(Boolean).join("\n");
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function normalizePhone(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  return text.replace(/[^\d+]/g, "");
}

function normalizeBudget(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : NaN;
}
