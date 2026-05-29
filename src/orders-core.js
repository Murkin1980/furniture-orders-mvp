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

  await ensureSchema(db);

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

async function ensureSchema(db) {
  if (typeof db.prepare !== "function") {
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
      budget INTEGER,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      raw_payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,
    "CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)"
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
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
        client_id, source, city, furniture_type, budget, description, status, raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`
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

  const text = [
    "New furniture order",
    `Order: #${order.id}`,
    `Client: ${client.name}`,
    `Phone: ${client.phone}`,
    payload.city ? `City: ${payload.city}` : null,
    payload.furnitureType ? `Type: ${payload.furnitureType}` : null,
    payload.budget ? `Budget: ${payload.budget}` : null,
    payload.description ? `Request: ${payload.description}` : null,
    `Source: ${payload.source}`
  ].filter(Boolean).join("\n");

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
