import { createOrder } from "./orders-core.js";
import { hasMinimumPhoneDigits, normalizePhone } from "./phone.js";

const DEFAULT_CATEGORIES = [
  {
    code: "kitchen",
    name: "Kitchen",
    basePrice: 180000,
    unitLabel: "linear meter",
    unitPrice: 145000,
    minUnits: 2,
    sortOrder: 10
  },
  {
    code: "wardrobe",
    name: "Wardrobe",
    basePrice: 130000,
    unitLabel: "square meter",
    unitPrice: 85000,
    minUnits: 3,
    sortOrder: 20
  },
  {
    code: "casework",
    name: "Cabinet furniture",
    basePrice: 90000,
    unitLabel: "item",
    unitPrice: 65000,
    minUnits: 1,
    sortOrder: 30
  }
];

export function normalizeCalculatorPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    ownerName: cleanText(payload.ownerName) || "Furniture workshop",
    ownerPhone: cleanText(payload.ownerPhone),
    title: cleanText(payload.title) || "Furniture cost calculator",
    description: cleanText(payload.description) || "Get a quick estimate before manager confirmation.",
    currency: cleanText(payload.currency) || "KZT",
    isEnabled: payload.isEnabled === true || payload.isEnabled === 1 ? 1 : 0,
    categories: normalizeCategories(payload.categories)
  };
}

export function estimateCalculatorPrice(category, rawUnits, options = {}) {
  const units = Math.max(Number(rawUnits) || 0, Number(category.minUnits) || 1);
  const multiplier = Math.max(1, normalizeMaterialMultiplier(options.materialMultiplier));
  const basePrice = Number(category.basePrice) || 0;
  const unitPrice = Number(category.unitPrice) || 0;

  return Math.round((basePrice + unitPrice * units) * multiplier);
}

export async function createCalculator({ db, env = {}, payload }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalized = normalizeCalculatorPayload(payload);
  const validationErrors = validateCalculatorPayload(normalized);

  if (validationErrors.length) {
    return validationResponse(validationErrors);
  }

  const result = await db
    .prepare(
      `INSERT INTO calculators (
        owner_name, owner_phone, title, description, currency, is_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      normalized.ownerName,
      normalized.ownerPhone,
      normalized.title,
      normalized.description,
      normalized.currency,
      normalized.isEnabled
    )
    .run();

  const calculatorId = result?.meta?.last_row_id;
  if (!calculatorId) {
    throw new Error("Calculator was not created.");
  }

  await replaceCalculatorCategories(db, calculatorId, normalized.categories);

  return getCalculator({ db, env, calculatorId });
}

export async function listCalculators({ db, env = {} }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);

  const result = await db
    .prepare(
      `SELECT
        id,
        owner_name AS ownerName,
        owner_phone AS ownerPhone,
        title,
        description,
        currency,
        is_enabled AS isEnabled,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM calculators
       ORDER BY created_at DESC, id DESC`
    )
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

export async function getCalculator({ db, env = {}, calculatorId, publicOnly = false }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalizedCalculatorId = normalizePositiveInteger(calculatorId);

  if (!normalizedCalculatorId) {
    return calculatorIdError();
  }

  const calculator = await selectCalculator(db, normalizedCalculatorId);
  if (!calculator || (publicOnly && !calculator.isEnabled)) {
    return calculatorNotFound();
  }

  const categories = await listCalculatorCategories(db, normalizedCalculatorId);

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: {
        ...calculator,
        categories
      }
    }
  };
}

export async function publishCalculator({ db, env = {}, calculatorId, enabled = true, origin = "" }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalizedCalculatorId = normalizePositiveInteger(calculatorId);

  if (!normalizedCalculatorId) {
    return calculatorIdError();
  }

  const calculator = await selectCalculator(db, normalizedCalculatorId);
  if (!calculator) {
    return calculatorNotFound();
  }

  const token = await ensureEmbedToken(db, normalizedCalculatorId);
  await db
    .prepare("UPDATE calculators SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(enabled ? 1 : 0, normalizedCalculatorId)
    .run();

  return embedCodeResponse({
    calculatorId: normalizedCalculatorId,
    token,
    origin,
    enabled: enabled ? 1 : 0
  });
}

export async function getCalculatorEmbedCode({ db, env = {}, calculatorId, origin = "" }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalizedCalculatorId = normalizePositiveInteger(calculatorId);

  if (!normalizedCalculatorId) {
    return calculatorIdError();
  }

  const tokenRecord = await getLatestEmbedToken(db, normalizedCalculatorId);
  if (!tokenRecord) {
    return {
      ok: false,
      status: 404,
      body: {
        success: false,
        error: "embed_token_not_found",
        message: "Publish calculator before generating embed code."
      }
    };
  }

  return embedCodeResponse({
    calculatorId: normalizedCalculatorId,
    token: tokenRecord.token,
    origin,
    enabled: 1
  });
}

export async function getPublishedCalculatorRuntime({ db, env = {}, calculatorId, token }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalizedCalculatorId = normalizePositiveInteger(calculatorId);

  if (!normalizedCalculatorId) {
    return calculatorIdError();
  }

  const tokenRecord = await findEmbedToken(db, normalizedCalculatorId, token);
  if (!tokenRecord) {
    return invalidEmbedTokenResponse();
  }

  return getCalculator({ db, env, calculatorId: normalizedCalculatorId, publicOnly: true });
}

export async function submitCalculatorLead({ db, env = {}, calculatorId, token, payload, fetchImpl = fetch }) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }

  await ensureCalculatorSchema(db, env);
  const normalizedCalculatorId = normalizePositiveInteger(calculatorId);
  if (!normalizedCalculatorId) {
    return calculatorIdError();
  }

  const tokenRecord = await findEmbedToken(db, normalizedCalculatorId, token);
  if (!tokenRecord) {
    return invalidEmbedTokenResponse();
  }

  const calculatorResult = await getCalculator({ db, env, calculatorId: normalizedCalculatorId, publicOnly: true });
  if (!calculatorResult.ok) {
    return calculatorResult;
  }

  const calculator = calculatorResult.body.item;
  const lead = normalizeLeadPayload(payload);
  const category = calculator.categories.find((item) => item.code === lead.categoryCode);
  const validationErrors = validateLeadPayload(lead, category);

  if (validationErrors.length) {
    return validationResponse(validationErrors);
  }

  const estimate = estimateCalculatorPrice(category, lead.units, {
    materialMultiplier: lead.materialMultiplier
  });
  const description = [
    `Calculator: ${calculator.title}`,
    `Category: ${category.name}`,
    `Size: ${lead.units} ${category.unitLabel}`,
    `Material multiplier: ${lead.materialMultiplier}`,
    `Estimated price: ${estimate} ${calculator.currency}`,
    lead.comment ? `Comment: ${lead.comment}` : null
  ].filter(Boolean).join("\n");

  const orderResult = await createOrder({
    db,
    env,
    fetchImpl,
    payload: {
      name: lead.name,
      phone: lead.phone,
      source: `calculator:${normalizedCalculatorId}`,
      city: lead.city,
      furnitureType: category.code,
      budget: estimate,
      description,
      calculatorMeta: {
        calculatorId: normalizedCalculatorId,
        categoryCode: category.code,
        units: lead.units,
        materialMultiplier: lead.materialMultiplier,
        estimate
      }
    }
  });

  if (!orderResult.ok) {
    return orderResult;
  }

  return {
    ok: true,
    status: 201,
    body: {
      success: true,
      orderId: orderResult.body.orderId,
      calculatorId: normalizedCalculatorId,
      estimate,
      currency: calculator.currency
    }
  };
}

async function ensureCalculatorSchema(db, env) {
  if (env.RUNTIME_SCHEMA_INIT !== "true" || typeof db.prepare !== "function") {
    return;
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS calculators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      owner_phone TEXT,
      title TEXT NOT NULL,
      description TEXT,
      currency TEXT NOT NULL DEFAULT 'KZT',
      is_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS calculator_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculator_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      base_price INTEGER NOT NULL DEFAULT 0,
      unit_label TEXT NOT NULL DEFAULT 'unit',
      unit_price INTEGER NOT NULL DEFAULT 0,
      min_units REAL NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS calculator_embed_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculator_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_calculator_categories_calculator_id ON calculator_categories(calculator_id)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_calculator_id ON calculator_embed_tokens(calculator_id)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_token ON calculator_embed_tokens(token)"
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

function normalizeCategories(categories) {
  const items = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;

  return items.map((category, index) => ({
    code: cleanSlug(category.code) || `category-${index + 1}`,
    name: cleanText(category.name) || `Category ${index + 1}`,
    basePrice: normalizeMoney(category.basePrice),
    unitLabel: cleanText(category.unitLabel) || "unit",
    unitPrice: normalizeMoney(category.unitPrice),
    minUnits: normalizeUnits(category.minUnits, 1),
    sortOrder: normalizeSortOrder(category.sortOrder, (index + 1) * 10)
  }));
}

function validateCalculatorPayload(payload) {
  const errors = [];

  if (!payload.ownerName) {
    errors.push({ field: "ownerName", message: "ownerName is required." });
  }

  if (!payload.title) {
    errors.push({ field: "title", message: "title is required." });
  }

  if (!payload.categories.length) {
    errors.push({ field: "categories", message: "At least one category is required." });
  }

  for (const [index, category] of payload.categories.entries()) {
    if (category.basePrice < 0 || category.unitPrice < 0 || category.minUnits <= 0) {
      errors.push({ field: `categories.${index}`, message: "Category prices and units must be positive." });
    }
  }

  return errors;
}

function validateLeadPayload(payload, category) {
  const errors = [];

  if (!payload.name) {
    errors.push({ field: "name", message: "name is required." });
  }

  if (!payload.phone) {
    errors.push({ field: "phone", message: "phone is required." });
  } else if (!hasMinimumPhoneDigits(payload.phone)) {
    errors.push({ field: "phone", message: "phone must contain at least 10 digits." });
  }

  if (!category) {
    errors.push({ field: "categoryCode", message: "categoryCode is not supported." });
  }

  if (payload.units <= 0) {
    errors.push({ field: "units", message: "units must be greater than zero." });
  }

  if (payload.materialMultiplier < 1) {
    errors.push({ field: "materialMultiplier", message: "materialMultiplier must be at least 1." });
  }

  return errors;
}

async function replaceCalculatorCategories(db, calculatorId, categories) {
  await db.prepare("DELETE FROM calculator_categories WHERE calculator_id = ?").bind(calculatorId).run();

  for (const category of categories) {
    await db
      .prepare(
        `INSERT INTO calculator_categories (
          calculator_id, code, name, base_price, unit_label, unit_price, min_units, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        calculatorId,
        category.code,
        category.name,
        category.basePrice,
        category.unitLabel,
        category.unitPrice,
        category.minUnits,
        category.sortOrder
      )
      .run();
  }
}

async function selectCalculator(db, calculatorId) {
  return db
    .prepare(
      `SELECT
        id,
        owner_name AS ownerName,
        owner_phone AS ownerPhone,
        title,
        description,
        currency,
        is_enabled AS isEnabled,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM calculators
       WHERE id = ?`
    )
    .bind(calculatorId)
    .first();
}

async function listCalculatorCategories(db, calculatorId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        calculator_id AS calculatorId,
        code,
        name,
        base_price AS basePrice,
        unit_label AS unitLabel,
        unit_price AS unitPrice,
        min_units AS minUnits,
        sort_order AS sortOrder
       FROM calculator_categories
       WHERE calculator_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(calculatorId)
    .all();

  return result?.results || [];
}

async function ensureEmbedToken(db, calculatorId) {
  const existing = await getLatestEmbedToken(db, calculatorId);
  if (existing) {
    return existing.token;
  }

  const token = createEmbedToken();
  await db
    .prepare("INSERT INTO calculator_embed_tokens (calculator_id, token, is_active) VALUES (?, ?, 1)")
    .bind(calculatorId, token)
    .run();

  return token;
}

async function getLatestEmbedToken(db, calculatorId) {
  return db
    .prepare(
      `SELECT id, calculator_id AS calculatorId, token, is_active AS isActive
       FROM calculator_embed_tokens
       WHERE calculator_id = ? AND is_active = 1
       ORDER BY id DESC
       LIMIT 1`
    )
    .bind(calculatorId)
    .first();
}

async function findEmbedToken(db, calculatorId, token) {
  const normalizedToken = cleanText(token);
  if (!normalizedToken) {
    return null;
  }

  return db
    .prepare(
      `SELECT id, calculator_id AS calculatorId, token, is_active AS isActive
       FROM calculator_embed_tokens
       WHERE calculator_id = ? AND token = ? AND is_active = 1`
    )
    .bind(calculatorId, normalizedToken)
    .first();
}

function embedCodeResponse({ calculatorId, token, origin, enabled }) {
  const baseUrl = cleanText(origin) || "";
  const src = `${baseUrl}/api/calculators/${calculatorId}/embed?token=${encodeURIComponent(token)}`;
  const embedCode = `<div data-furniture-calculator="${calculatorId}"></div><script async src="${src}"></script>`;

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      calculatorId,
      enabled: Boolean(enabled),
      token,
      scriptUrl: src,
      embedCode
    }
  };
}

function normalizeLeadPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    name: cleanText(payload.name),
    phone: normalizePhone(payload.phone),
    city: cleanText(payload.city),
    categoryCode: cleanSlug(payload.categoryCode),
    units: normalizeUnits(payload.units, 0),
    materialMultiplier: normalizeMaterialMultiplier(payload.materialMultiplier),
    comment: cleanText(payload.comment)
  };
}

function createEmbedToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validationResponse(fields) {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "validation_error",
      message: "Required fields are missing or invalid.",
      fields
    }
  };
}

function calculatorIdError() {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "invalid_calculator_id",
      message: "calculatorId must be a positive integer."
    }
  };
}

function calculatorNotFound() {
  return {
    ok: false,
    status: 404,
    body: {
      success: false,
      error: "calculator_not_found",
      message: "Calculator was not found."
    }
  };
}

function invalidEmbedTokenResponse() {
  return {
    ok: false,
    status: 401,
    body: {
      success: false,
      error: "invalid_embed_token",
      message: "Embed token is invalid or inactive."
    }
  };
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function cleanSlug(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  return text.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || null;
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function normalizeUnits(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function normalizeMaterialMultiplier(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 1;
}

function normalizeSortOrder(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
