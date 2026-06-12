import { isOrderStatus } from "./order-statuses.js";
import { findProjectTemplate, getTemplateSteps, isStepStatus, PROJECT_TEMPLATES } from "./project-templates.js";
import { hasMinimumPhoneDigits, normalizePhone } from "./phone.js";

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
    description: cleanText(payload.description),
    calculatorMeta: normalizeCalculatorMeta(payload.calculatorMeta)
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

  if (payload.phone && !hasMinimumPhoneDigits(payload.phone)) {
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
      ai_status TEXT,
      ai_score INTEGER,
      ai_temperature TEXT,
      ai_furniture_type TEXT,
      ai_qualified INTEGER,
      ai_summary TEXT,
      ai_next_question TEXT,
      ai_missing_info_json TEXT,
      ai_urgency TEXT,
      ai_potential_value TEXT,
      ai_recommended_status TEXT,
      ai_provider TEXT,
      ai_model TEXT,
      ai_processing_time_ms INTEGER,
      ai_error TEXT,
      ai_analyzed_at TEXT,
      crm_sync_status TEXT,
      crm_person_id TEXT,
      crm_opportunity_id TEXT,
      crm_note_id TEXT,
      crm_error TEXT,
      crm_last_attempt_at TEXT,
      crm_synced_at TEXT,
      raw_payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,
    "CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)",
    `CREATE TABLE IF NOT EXISTS project_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      furniture_type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS template_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      step_code TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      required INTEGER NOT NULL DEFAULT 1,
      default_assignee_role TEXT,
      FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS order_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      template_step_id INTEGER,
      step_code TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      completed_at TEXT,
      completed_by TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (template_step_id) REFERENCES template_steps(id) ON DELETE SET NULL
    )`,
    "CREATE INDEX IF NOT EXISTS idx_template_steps_template_id ON template_steps(template_id)",
    "CREATE INDEX IF NOT EXISTS idx_order_steps_order_id ON order_steps(order_id)",
    "CREATE INDEX IF NOT EXISTS idx_order_steps_status ON order_steps(status)"
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }

  await ensureOrderUpdatedAtColumn(db);
  await ensureOrderNotesColumn(db);
  await seedProjectTemplates(db);
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

async function seedProjectTemplates(db) {
  for (const template of PROJECT_TEMPLATES) {
    await ensureProjectTemplate(db, template);
  }
}

async function ensureProjectTemplate(db, template) {
  await db
    .prepare(
      `INSERT INTO project_templates (code, name, furniture_type, is_active)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(code) DO UPDATE SET
         name = excluded.name,
         furniture_type = excluded.furniture_type,
         is_active = 1`
    )
    .bind(template.code, template.name, template.furnitureType)
    .run();

  const record = await db
    .prepare("SELECT id, code, name, furniture_type AS furnitureType FROM project_templates WHERE code = ?")
    .bind(template.code)
    .first();

  if (!record) {
    throw new Error("Project template was not created.");
  }

  for (const step of getTemplateSteps(template)) {
    const existing = await db
      .prepare("SELECT id FROM template_steps WHERE template_id = ? AND step_code = ?")
      .bind(record.id, step.stepCode)
      .first();

    if (!existing) {
      await db
        .prepare(
          `INSERT INTO template_steps (
            template_id, step_code, title, sort_order, required, default_assignee_role
          ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(record.id, step.stepCode, step.title, step.sortOrder, step.required ? 1 : 0, step.defaultAssigneeRole)
        .run();
    }
  }

  return record;
}

async function listTemplateSteps(db, templateId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        step_code AS stepCode,
        title,
        sort_order AS sortOrder,
        required,
        default_assignee_role AS defaultAssigneeRole
       FROM template_steps
       WHERE template_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(templateId)
    .all();

  return result?.results || [];
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
      orders.ai_status AS aiStatus,
      orders.ai_score AS aiScore,
      orders.ai_temperature AS aiTemperature,
      orders.ai_furniture_type AS aiFurnitureType,
      orders.ai_qualified AS aiQualified,
      orders.ai_summary AS aiSummary,
      orders.ai_next_question AS aiNextQuestion,
      orders.ai_missing_info_json AS aiMissingInfoJson,
      orders.ai_urgency AS aiUrgency,
      orders.ai_potential_value AS aiPotentialValue,
      orders.ai_recommended_status AS aiRecommendedStatus,
      orders.ai_error AS aiError,
      orders.crm_sync_status AS crmSyncStatus,
      orders.crm_person_id AS crmPersonId,
      orders.crm_opportunity_id AS crmOpportunityId,
      orders.crm_note_id AS crmNoteId,
      orders.crm_error AS crmError,
      orders.crm_last_attempt_at AS crmLastAttemptAt,
      orders.crm_synced_at AS crmSyncedAt,
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

  let projectSteps = null;
  if (normalizedStatus === "in_review") {
    const steps = await createOrderProjectSteps({ db, env, orderId: normalizedOrderId });
    projectSteps = steps.body.items;
  }

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
      item: result,
      projectSteps
    }
  };
}

export async function createOrderProjectSteps({ db, env = {}, orderId }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalizedOrderId = Number(orderId);
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

  const order = await db
    .prepare("SELECT id, furniture_type AS furnitureType FROM orders WHERE id = ?")
    .bind(normalizedOrderId)
    .first();

  if (!order) {
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

  const existing = await db
    .prepare("SELECT id FROM order_steps WHERE order_id = ? LIMIT 1")
    .bind(normalizedOrderId)
    .first();

  if (!existing) {
    const template = findProjectTemplate(order.furnitureType);
    const templateRecord = await ensureProjectTemplate(db, template);
    const templateSteps = await listTemplateSteps(db, templateRecord.id);

    for (const step of templateSteps) {
      await db
        .prepare(
          `INSERT INTO order_steps (
            order_id, template_step_id, step_code, title, status, notes, completed_at, completed_by, sort_order
          ) VALUES (?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?)`
        )
        .bind(normalizedOrderId, step.id, step.stepCode, step.title, step.sortOrder)
        .run();
    }
  }

  return listOrderSteps({ db, env, orderId: normalizedOrderId });
}

export async function listOrderSteps({ db, env = {}, orderId }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalizedOrderId = Number(orderId);
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

  const order = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(normalizedOrderId).first();
  if (!order) {
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

  const result = await db
    .prepare(
      `SELECT
        id,
        order_id AS orderId,
        template_step_id AS templateStepId,
        step_code AS stepCode,
        title,
        status,
        notes,
        completed_at AS completedAt,
        completed_by AS completedBy,
        sort_order AS sortOrder
       FROM order_steps
       WHERE order_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(normalizedOrderId)
    .all();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      items: result?.results || []
    }
  };
}

export async function updateOrderStep({ db, env = {}, orderId, stepId, status, notes = null, completedBy = null }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureSchema(db, env);

  const normalizedOrderId = Number(orderId);
  const normalizedStepId = Number(stepId);
  const normalizedStatus = cleanText(status);
  const normalizedNotes = cleanText(notes);
  const normalizedCompletedBy = cleanText(completedBy);

  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId < 1 || !Number.isInteger(normalizedStepId) || normalizedStepId < 1) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "invalid_step_request",
        message: "orderId and stepId must be positive integers."
      }
    };
  }

  if (!normalizedStatus || !isStepStatus(normalizedStatus)) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: "invalid_step_status",
        message: "Step status is not supported."
      }
    };
  }

  const existing = await db
    .prepare("SELECT id FROM order_steps WHERE id = ? AND order_id = ?")
    .bind(normalizedStepId, normalizedOrderId)
    .first();

  if (!existing) {
    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        error: "step_not_found",
        message: "Order step was not found."
      }
    };
  }

  await db
    .prepare(
      `UPDATE order_steps
       SET status = ?,
           notes = ?,
           completed_at = CASE WHEN ? = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END,
           completed_by = CASE WHEN ? = 'done' THEN ? ELSE NULL END
       WHERE id = ? AND order_id = ?`
    )
    .bind(
      normalizedStatus,
      normalizedNotes,
      normalizedStatus,
      normalizedStatus,
      normalizedCompletedBy,
      normalizedStepId,
      normalizedOrderId
    )
    .run();

  const item = await db
    .prepare(
      `SELECT
        id,
        order_id AS orderId,
        template_step_id AS templateStepId,
        step_code AS stepCode,
        title,
        status,
        notes,
        completed_at AS completedAt,
        completed_by AS completedBy,
        sort_order AS sortOrder
       FROM order_steps
       WHERE id = ? AND order_id = ?`
    )
    .bind(normalizedStepId, normalizedOrderId)
    .first();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item
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

function normalizeBudget(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : NaN;
}

function normalizeCalculatorMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    calculatorId: normalizeNullableInteger(value.calculatorId),
    categoryCode: cleanText(value.categoryCode),
    units: normalizeNullableNumber(value.units),
    materialRuleCode: cleanText(value.materialRuleCode),
    materialMultiplier: normalizeNullableNumber(value.materialMultiplier),
    estimate: normalizeNullableInteger(value.estimate),
    formulaVersion: normalizeNullableInteger(value.formulaVersion),
    schemaVersion: normalizeNullableInteger(value.schemaVersion)
  };
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
