import { createOrder } from "./orders-core.js";
import { hasMinimumPhoneDigits, normalizePhone } from "./phone.js";
import {
  DEFAULT_FIELDS,
  DEFAULT_RULES,
  FORMULA_VERSION,
  SCHEMA_VERSION,
  buildCalculatorRuntime,
  estimateCalculatorPrice,
  findMaterialRule,
  normalizeMaterialMultiplier
} from "./calculators-pricing.js";

export { estimateCalculatorPrice } from "./calculators-pricing.js";

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

const PRICING_STATES = ["draft", "published"];
const FIELD_TYPES = ["select", "number", "text", "tel", "textarea"];
const FIELD_ROLES = ["pricing_input", "lead_input", "display_only"];
const FIELD_BINDINGS = ["categoryCode", "units", "materialRuleCode", "name", "phone", "city", "comment"];
const FIELD_OPTIONS_SOURCES = ["prices", "multiplier_rules"];

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
  await seedCalculatorPricing(db, calculatorId, normalized.categories);

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

  await ensureCalculatorPricingSeeded(db, normalizedCalculatorId);
  const pricingState = publicOnly ? "published" : null;
  const categories = await listCalculatorCategories(db, normalizedCalculatorId, pricingState);
  const rules = pricingState ? await listCalculatorRules(db, normalizedCalculatorId, pricingState) : [];
  const fields = pricingState ? await listCalculatorFields(db, normalizedCalculatorId, pricingState) : [];

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: {
        ...calculator,
        categories,
        rules,
        fields
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
  await publishCalculatorPricing(db, normalizedCalculatorId);
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

export async function getCalculatorPricing({ db, env = {}, calculatorId }) {
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

  await ensureCalculatorPricingSeeded(db, normalizedCalculatorId);

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      calculatorId: normalizedCalculatorId,
      draft: {
        prices: await listCalculatorPrices(db, normalizedCalculatorId, "draft"),
        rules: await listCalculatorRules(db, normalizedCalculatorId, "draft"),
        fields: await listCalculatorFields(db, normalizedCalculatorId, "draft")
      },
      published: {
        prices: await listCalculatorPrices(db, normalizedCalculatorId, "published"),
        rules: await listCalculatorRules(db, normalizedCalculatorId, "published"),
        fields: await listCalculatorFields(db, normalizedCalculatorId, "published")
      },
      fields: await listCalculatorFields(db, normalizedCalculatorId, "draft")
    }
  };
}

export async function updateCalculatorPricing({ db, env = {}, calculatorId, payload }) {
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

  await ensureCalculatorPricingSeeded(db, normalizedCalculatorId);
  const normalized = normalizePricingPayload(payload);
  const validationErrors = validatePricingPayload(normalized);
  if (validationErrors.length) {
    return validationResponse(validationErrors);
  }

  await replaceCalculatorPrices(db, normalizedCalculatorId, "draft", normalized.prices);
  await replaceCalculatorRules(db, normalizedCalculatorId, "draft", normalized.rules);
  await replaceCalculatorFields(db, normalizedCalculatorId, "draft", normalized.fields);

  return getCalculatorPricing({ db, env, calculatorId: normalizedCalculatorId });
}

export async function getCalculatorRules({ db, env = {}, calculatorId }) {
  const pricing = await getCalculatorPricing({ db, env, calculatorId });
  if (!pricing.ok) {
    return pricing;
  }

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      calculatorId: pricing.body.calculatorId,
      draft: pricing.body.draft.rules,
      published: pricing.body.published.rules
    }
  };
}

export async function updateCalculatorRules({ db, env = {}, calculatorId, payload }) {
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

  await ensureCalculatorPricingSeeded(db, normalizedCalculatorId);
  const rules = normalizeRules(payload?.rules || payload);
  const errors = validateRules(rules);
  if (errors.length) {
    return validationResponse(errors);
  }

  await replaceCalculatorRules(db, normalizedCalculatorId, "draft", rules);

  return getCalculatorRules({ db, env, calculatorId: normalizedCalculatorId });
}

export async function previewCalculatorPricing({ db, env = {}, calculatorId, payload }) {
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

  await ensureCalculatorPricingSeeded(db, normalizedCalculatorId);

  const categoryCode = cleanSlug(payload?.categoryCode);
  const units = normalizeUnits(payload?.units, 0);
  const materialRuleCode = cleanSlug(payload?.materialRuleCode) || "material_standard";
  const prices = await listCalculatorPrices(db, normalizedCalculatorId, "draft");
  const rules = await listCalculatorRules(db, normalizedCalculatorId, "draft");
  const category = prices.find((item) => item.code === categoryCode) || prices[0];
  const materialRule = findMaterialRule(rules, materialRuleCode);

  if (!category || units <= 0 || !materialRule) {
    return validationResponse([
      !category ? { field: "categoryCode", message: "categoryCode is not supported." } : null,
      units <= 0 ? { field: "units", message: "units must be greater than zero." } : null,
      !materialRule ? { field: "materialRuleCode", message: "materialRuleCode is not supported." } : null
    ].filter(Boolean));
  }

  const estimate = estimateCalculatorPrice(category, units, {
    materialRuleCode,
    rules
  });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      calculatorId: normalizedCalculatorId,
      state: "draft",
      categoryCode: category.code,
      units,
      materialRuleCode,
      estimate,
      currency: calculator.currency,
      formulaVersion: FORMULA_VERSION,
      schemaVersion: SCHEMA_VERSION,
      formula: "((basePrice + unitPrice * units) * materialMultiplier + fixedAddons) - discountPercent"
    }
  };
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

  const result = await getCalculator({ db, env, calculatorId: normalizedCalculatorId, publicOnly: true });
  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    body: {
      ...result.body,
      item: buildCalculatorRuntime(result.body.item)
    }
  };
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
  const materialRule = findMaterialRule(calculator.rules, lead.materialRuleCode);
  const validationErrors = validateLeadPayload(lead, category, materialRule);

  if (validationErrors.length) {
    return validationResponse(validationErrors);
  }

  const estimate = estimateCalculatorPrice(category, lead.units, {
    materialMultiplier: lead.materialMultiplier,
    materialRuleCode: lead.materialRuleCode,
    rules: calculator.rules
  });
  const description = [
    `Calculator: ${calculator.title}`,
    `Category: ${category.name}`,
    `Size: ${lead.units} ${category.unitLabel}`,
    `Material: ${lead.materialRuleCode || lead.materialMultiplier}`,
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
        materialRuleCode: lead.materialRuleCode,
        materialMultiplier: materialRule?.value ?? lead.materialMultiplier,
        estimate,
        formulaVersion: FORMULA_VERSION,
        schemaVersion: SCHEMA_VERSION
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
    `CREATE TABLE IF NOT EXISTS calculator_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculator_id INTEGER NOT NULL,
      category_code TEXT NOT NULL,
      label TEXT NOT NULL,
      base_price INTEGER NOT NULL DEFAULT 0,
      unit_label TEXT NOT NULL DEFAULT 'unit',
      unit_price INTEGER NOT NULL DEFAULT 0,
      min_units REAL NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS calculator_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculator_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS calculator_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calculator_id INTEGER NOT NULL,
      field_code TEXT NOT NULL,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pricing_input',
      binding TEXT,
      options_source TEXT,
      default_value TEXT,
      min_value REAL,
      max_value REAL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_required INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'draft',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculator_id) REFERENCES calculators(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_calculator_categories_calculator_id ON calculator_categories(calculator_id)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_calculator_id ON calculator_embed_tokens(calculator_id)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_embed_tokens_token ON calculator_embed_tokens(token)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_prices_unique_state ON calculator_prices(calculator_id, category_code, state)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_rules_unique_state ON calculator_rules(calculator_id, code, state)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_fields_unique_state ON calculator_fields(calculator_id, field_code, state)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_prices_calculator_state ON calculator_prices(calculator_id, state)",
    "CREATE INDEX IF NOT EXISTS idx_calculator_rules_calculator_state ON calculator_rules(calculator_id, state)"
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

async function seedCalculatorPricing(db, calculatorId, categories) {
  for (const state of PRICING_STATES) {
    await replaceCalculatorPrices(db, calculatorId, state, categories);
    await replaceCalculatorRules(db, calculatorId, state, DEFAULT_RULES);
  }

  for (const state of PRICING_STATES) {
    await replaceCalculatorFields(db, calculatorId, state, DEFAULT_FIELDS);
  }
}

async function ensureCalculatorPricingSeeded(db, calculatorId) {
  const existing = await db
    .prepare("SELECT id FROM calculator_prices WHERE calculator_id = ? AND state = 'draft' LIMIT 1")
    .bind(calculatorId)
    .first();

  if (existing) {
    return;
  }

  const categories = await listCalculatorCategories(db, calculatorId);
  await seedCalculatorPricing(db, calculatorId, categories);
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

function validateLeadPayload(payload, category, materialRule) {
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

  if (payload.materialRuleCode && !materialRule) {
    errors.push({ field: "materialRuleCode", message: "materialRuleCode is not supported." });
  }

  if (!payload.materialRuleCode && payload.materialMultiplier < 1) {
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

async function listCalculatorCategories(db, calculatorId, state = null) {
  if (state) {
    return listCalculatorPrices(db, calculatorId, state);
  }

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

async function listCalculatorPrices(db, calculatorId, state) {
  const result = await db
    .prepare(
      `SELECT
        id,
        calculator_id AS calculatorId,
        category_code AS code,
        label AS name,
        base_price AS basePrice,
        unit_label AS unitLabel,
        unit_price AS unitPrice,
        min_units AS minUnits,
        sort_order AS sortOrder,
        state
       FROM calculator_prices
       WHERE calculator_id = ? AND state = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(calculatorId, state)
    .all();

  return result?.results || [];
}

async function listCalculatorRules(db, calculatorId, state) {
  const result = await db
    .prepare(
      `SELECT
        id,
        calculator_id AS calculatorId,
        code,
        label,
        rule_type AS ruleType,
        value,
        state,
        sort_order AS sortOrder
       FROM calculator_rules
       WHERE calculator_id = ? AND state = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(calculatorId, state)
    .all();

  return result?.results || [];
}

async function listCalculatorFields(db, calculatorId, state = "draft") {
  const result = await db
    .prepare(
      `SELECT
        id,
        calculator_id AS calculatorId,
        field_code AS fieldCode,
        label,
        field_type AS fieldType,
        role,
        binding,
        options_source AS optionsSource,
        default_value AS defaultValue,
        min_value AS minValue,
        max_value AS maxValue,
        sort_order AS sortOrder,
        is_active AS isActive,
        is_required AS isRequired,
        state
       FROM calculator_fields
       WHERE calculator_id = ? AND state = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .bind(calculatorId, state)
    .all();

  return result?.results || [];
}

async function replaceCalculatorPrices(db, calculatorId, state, prices) {
  await db.prepare("DELETE FROM calculator_prices WHERE calculator_id = ? AND state = ?").bind(calculatorId, state).run();

  for (const price of normalizePrices(prices)) {
    await db
      .prepare(
        `INSERT INTO calculator_prices (
          calculator_id, category_code, label, base_price, unit_label, unit_price, min_units, sort_order, state, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(
        calculatorId,
        price.code,
        price.name,
        price.basePrice,
        price.unitLabel,
        price.unitPrice,
        price.minUnits,
        price.sortOrder,
        state
      )
      .run();
  }
}

async function replaceCalculatorRules(db, calculatorId, state, rules) {
  await db.prepare("DELETE FROM calculator_rules WHERE calculator_id = ? AND state = ?").bind(calculatorId, state).run();

  for (const rule of normalizeRules(rules)) {
    await db
      .prepare(
        `INSERT INTO calculator_rules (
          calculator_id, code, label, rule_type, value, state, sort_order, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(calculatorId, rule.code, rule.label, rule.ruleType, rule.value, state, rule.sortOrder)
      .run();
  }
}

async function replaceCalculatorFields(db, calculatorId, state, fields) {
  await db.prepare("DELETE FROM calculator_fields WHERE calculator_id = ? AND state = ?").bind(calculatorId, state).run();

  for (const field of normalizeFields(fields)) {
    await db
      .prepare(
        `INSERT INTO calculator_fields (
          calculator_id, field_code, label, field_type, role, binding, options_source,
          default_value, min_value, max_value, sort_order, is_active, is_required, state, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(
        calculatorId,
        field.fieldCode,
        field.label,
        field.fieldType,
        field.role,
        field.binding,
        field.optionsSource,
        field.defaultValue,
        field.minValue,
        field.maxValue,
        field.sortOrder,
        field.isActive,
        field.isRequired,
        state
      )
      .run();
  }
}

async function publishCalculatorPricing(db, calculatorId) {
  await ensureCalculatorPricingSeeded(db, calculatorId);
  const draftPrices = await listCalculatorPrices(db, calculatorId, "draft");
  const draftRules = await listCalculatorRules(db, calculatorId, "draft");
  const draftFields = await listCalculatorFields(db, calculatorId, "draft");

  await replaceCalculatorPrices(db, calculatorId, "published", draftPrices);
  await replaceCalculatorRules(db, calculatorId, "published", draftRules);
  await replaceCalculatorFields(db, calculatorId, "published", draftFields);
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
    materialRuleCode: cleanSlug(payload.materialRuleCode),
    materialMultiplier: normalizeMaterialMultiplier(payload.materialMultiplier),
    comment: cleanText(payload.comment)
  };
}

function normalizePricingPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    prices: normalizePrices(payload.prices),
    rules: normalizeRules(payload.rules),
    fields: normalizeFields(payload.fields)
  };
}

function normalizePrices(prices) {
  return (Array.isArray(prices) && prices.length ? prices : DEFAULT_CATEGORIES).map((price, index) => ({
    code: cleanSlug(price.code || price.categoryCode) || `category-${index + 1}`,
    name: cleanText(price.name || price.label) || `Category ${index + 1}`,
    basePrice: normalizeMoney(price.basePrice),
    unitLabel: cleanText(price.unitLabel) || "unit",
    unitPrice: normalizeMoney(price.unitPrice),
    minUnits: normalizeUnits(price.minUnits, 1),
    sortOrder: normalizeSortOrder(price.sortOrder, (index + 1) * 10)
  }));
}

function normalizeRules(rules) {
  return (Array.isArray(rules) && rules.length ? rules : DEFAULT_RULES).map((rule, index) => ({
    code: cleanSlug(rule.code) || `rule-${index + 1}`,
    label: cleanText(rule.label) || `Rule ${index + 1}`,
    ruleType: cleanText(rule.ruleType || rule.rule_type) || "multiplier",
    value: normalizeRuleValue(rule.value),
    sortOrder: normalizeSortOrder(rule.sortOrder, (index + 1) * 10)
  }));
}

function normalizeFields(fields) {
  return (Array.isArray(fields) && fields.length ? fields : DEFAULT_FIELDS).map((field, index) => {
    const rawFieldCode = cleanText(field.fieldCode || field.field_code);
    const fieldCode = FIELD_BINDINGS.includes(rawFieldCode) ? rawFieldCode : cleanSlug(rawFieldCode) || `field-${index + 1}`;

    return {
      fieldCode,
      label: cleanText(field.label) || `Field ${index + 1}`,
      fieldType: cleanText(field.fieldType || field.field_type) || "text",
      role: cleanText(field.role) || inferFieldRole(fieldCode),
      binding: cleanText(field.binding) || fieldCode,
      optionsSource: cleanText(field.optionsSource || field.options_source),
      defaultValue: cleanText(field.defaultValue || field.default_value),
      minValue: normalizeOptionalNumber(field.minValue ?? field.min_value),
      maxValue: normalizeOptionalNumber(field.maxValue ?? field.max_value),
      sortOrder: normalizeSortOrder(field.sortOrder, (index + 1) * 10),
      isActive: field.isActive === false || field.is_active === 0 ? 0 : 1,
      isRequired: field.isRequired === true || field.isRequired === 1 || field.is_required === 1 ? 1 : 0
    };
  });
}

function validatePricingPayload(payload) {
  return [
    ...validatePrices(payload.prices),
    ...validateRules(payload.rules),
    ...validateFields(payload.fields)
  ];
}

function validatePrices(prices) {
  const errors = [];
  if (!prices.length) {
    errors.push({ field: "prices", message: "At least one price row is required." });
  }

  for (const [index, price] of prices.entries()) {
    if (price.basePrice < 0 || price.unitPrice < 0 || price.minUnits <= 0) {
      errors.push({ field: `prices.${index}`, message: "Price rows must use non-negative prices and positive units." });
    }
  }

  return errors;
}

function validateRules(rules) {
  const errors = [];
  const supportedTypes = ["multiplier", "fixed_addon", "percent_discount"];

  for (const [index, rule] of rules.entries()) {
    if (!supportedTypes.includes(rule.ruleType)) {
      errors.push({ field: `rules.${index}.ruleType`, message: "Rule type is not supported." });
    }

    if (rule.ruleType === "multiplier" && rule.value < 1) {
      errors.push({ field: `rules.${index}.value`, message: "Multiplier rules must be at least 1." });
    }

    if (rule.ruleType !== "multiplier" && rule.value < 0) {
      errors.push({ field: `rules.${index}.value`, message: "Addon and discount rules cannot be negative." });
    }
  }

  return errors;
}

function validateFields(fields) {
  const errors = [];
  const seen = new Set();

  for (const [index, field] of fields.entries()) {
    if (seen.has(field.fieldCode)) {
      errors.push({ field: `fields.${index}.fieldCode`, message: "Field code must be unique." });
    }
    seen.add(field.fieldCode);

    if (!FIELD_TYPES.includes(field.fieldType)) {
      errors.push({ field: `fields.${index}.fieldType`, message: "Field type is not supported." });
    }

    if (!FIELD_ROLES.includes(field.role)) {
      errors.push({ field: `fields.${index}.role`, message: "Field role is not supported." });
    }

    if (!FIELD_BINDINGS.includes(field.binding)) {
      errors.push({ field: `fields.${index}.binding`, message: "Field binding is not supported." });
    }

    if (field.optionsSource && !FIELD_OPTIONS_SOURCES.includes(field.optionsSource)) {
      errors.push({ field: `fields.${index}.optionsSource`, message: "Field options source is not supported." });
    }

    if (field.minValue !== null && field.maxValue !== null && field.minValue > field.maxValue) {
      errors.push({ field: `fields.${index}.minValue`, message: "Field minValue cannot be greater than maxValue." });
    }

    if (field.binding === "units" && field.fieldType !== "number") {
      errors.push({ field: `fields.${index}.fieldType`, message: "Units binding must use number field type." });
    }
    if (["categoryCode", "materialRuleCode"].includes(field.binding) && field.fieldType !== "select") {
      errors.push({ field: `fields.${index}.fieldType`, message: "Category and material bindings must use select field type." });
    }
    if (field.binding === "phone" && field.fieldType !== "tel") {
      errors.push({ field: `fields.${index}.fieldType`, message: "Phone binding must use tel field type." });
    }
  }

  return errors;
}

function inferFieldRole(fieldCode) {
  const code = cleanText(fieldCode);
  return ["name", "phone", "city", "comment"].includes(code) ? "lead_input" : "pricing_input";
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

function normalizeRuleValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeSortOrder(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
