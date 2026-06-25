import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrder,
  createOrderProjectSteps,
  formatTelegramMessage,
  listOrderSteps,
  listOrders,
  normalizeOrderPayload,
  updateOrderStep,
  updateOrderStatus,
  validateOrderPayload
} from "../src/orders-core.js";
import {
  createCalculator,
  getCalculatorPricing,
  getPublishedCalculatorRuntime,
  previewCalculatorPricing,
  publishCalculator,
  submitCalculatorLead,
  updateCalculatorPricing
} from "../src/calculators-core.js";
import { estimateCalculatorPrice } from "../src/calculators-pricing.js";
import { ORDER_STATUSES, isOrderStatus } from "../src/order-statuses.js";
import { STEP_STATUSES, findProjectTemplate } from "../src/project-templates.js";

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
  assert.equal(result.body.hermesSent, false);
  assert.equal(telegramCalls.length, 1);
  assert.match(JSON.parse(telegramCalls[0].options.body).text, /Новая заявка на мебель/);
});

test("creates order and sends Hermes when enabled", async () => {
  const db = createMockDb();
  const hermesCalls = [];
  const result = await createOrder({
    db,
    env: {
      RUNTIME_SCHEMA_INIT: "true",
      HERMES_AGENT_ENABLED: "true",
      HERMES_AGENT_WEBHOOK_URL: "https://hermes.test/webhook",
      HERMES_AGENT_TOKEN: "test-token"
    },
    fetchImpl: async (url, options) => {
      hermesCalls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          requiresHumanApproval: true,
          summary: "test",
          furnitureType: "other",
          leadTemperature: "neutral",
          missingInfo: [],
          nextQuestion: "",
          replyDraft: "",
          warnings: []
        })
      };
    },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      source: "site",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 500000,
      description: "Тестовый заказ"
    }
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.hermesSent, true);
  assert.ok(hermesCalls.length >= 1);
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

test("updates order follow-up task and date", async () => {
  const db = createMockDb();
  await createOrder({ db, env: { RUNTIME_SCHEMA_INIT: "true" }, payload: { name: "Ерлан", phone: "+77011234567" } });

  const result = await updateOrderStatus({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    orderId: 1,
    status: "new",
    notes: "",
    followUpAt: "2026-06-13",
    followUpTask: "Позвонить клиенту"
  });

  assert.equal(result.body.item.followUpAt, "2026-06-13");
  assert.equal(result.body.item.followUpTask, "Позвонить клиенту");
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

test("defines project templates and step statuses", () => {
  assert.deepEqual(STEP_STATUSES, ["pending", "done", "skipped"]);
  assert.equal(findProjectTemplate("kitchen").code, "kitchen-basic");
  assert.equal(findProjectTemplate("wardrobe").code, "wardrobe-basic");
  assert.equal(findProjectTemplate("unknown").code, "casework-basic");
});

test("initializes project steps from furniture template", async () => {
  const db = createMockDb();
  await createOrder({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      furnitureType: "wardrobe"
    }
  });

  const result = await createOrderProjectSteps({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    orderId: 1
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 9);
  assert.equal(result.body.items[0].stepCode, "measure_niche");
});

test("status transition to in_review initializes project steps", async () => {
  const db = createMockDb();
  await createOrder({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      furnitureType: "kitchen"
    }
  });

  const result = await updateOrderStatus({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    orderId: 1,
    status: "in_review"
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.projectSteps.length, 11);
});

test("updates order step status and completion fields", async () => {
  const db = createMockDb();
  await createOrder({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Ерлан",
      phone: "+77011234567",
      furnitureType: "kitchen"
    }
  });
  await createOrderProjectSteps({ db, env: { RUNTIME_SCHEMA_INIT: "true" }, orderId: 1 });
  const steps = await listOrderSteps({ db, orderId: 1 });

  const result = await updateOrderStep({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    orderId: 1,
    stepId: steps.body.items[0].id,
    status: "done",
    notes: "Замер подтверждён",
    completedBy: "manager"
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.item.status, "done");
  assert.equal(result.body.item.notes, "Замер подтверждён");
  assert.equal(result.body.item.completedBy, "manager");
  assert.equal(result.body.item.completedAt, now());
});

test("rejects invalid order step status", async () => {
  const result = await updateOrderStep({
    db: createMockDb(),
    orderId: 1,
    stepId: 1,
    status: "started"
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_step_status");
});

test("creates a calculator with default categories", async () => {
  const db = createMockDb();
  const result = await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.item.id, 1);
  assert.equal(result.body.item.categories.length, 3);
  assert.equal(result.body.item.categories[0].code, "kitchen");
});

test("publishes calculator and returns embed data", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    origin: "https://example.com"
  });
  const embed = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });

  assert.equal(published.status, 200);
  assert.equal(published.body.enabled, true);
  assert.match(published.body.embedCode, /data-furniture-calculator="1"/);
  assert.equal(embed.status, 200);
  assert.equal(embed.body.item.isEnabled, 1);
  assert.equal(embed.body.item.runtimeVersion, 1);
  assert.equal(embed.body.item.formulaVersion, 1);
  assert.equal(embed.body.item.schemaVersion, 1);
});

test("calculator lead creates an order with estimate budget", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator",
      categories: [
        {
          code: "kitchen",
          name: "Kitchen",
          basePrice: 100000,
          unitLabel: "meter",
          unitPrice: 50000,
          minUnits: 2
        }
      ]
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });

  const result = await submitCalculatorLead({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token,
    payload: {
      name: "Erlan",
      phone: "+77011234567",
      categoryCode: "kitchen",
      units: 3,
      materialMultiplier: 1.2
    },
    fetchImpl: async () => ({ ok: true })
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.estimate, 300000);
  assert.equal(db.orders.length, 1);
  assert.equal(db.orders[0].source, "calculator:1");
  assert.equal(db.orders[0].budget, 300000);
  assert.deepEqual(JSON.parse(db.orders[0].rawPayload).calculatorMeta, {
    calculatorId: 1,
    categoryCode: "kitchen",
    units: 3,
    materialRuleCode: null,
    materialMultiplier: 1.2,
    estimate: 300000,
    formulaVersion: 1,
    schemaVersion: 1
  });
});

test("rejects calculator lead with invalid embed token", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  const result = await submitCalculatorLead({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: "bad-token",
    payload: {
      name: "Erlan",
      phone: "+77011234567",
      categoryCode: "kitchen",
      units: 3
    }
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "invalid_embed_token");
});

test("rejects calculator runtime for disabled calculators", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    enabled: false
  });

  const result = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, "calculator_not_found");
});

test("rejects calculator lead with invalid phone, category, or multiplier", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });

  const result = await submitCalculatorLead({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token,
    payload: {
      name: "Erlan",
      phone: "123",
      categoryCode: "unknown",
      units: 3,
      materialMultiplier: 0
    }
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body.fields.map((field) => field.field), [
    "phone",
    "categoryCode",
    "materialMultiplier"
  ]);
});

test("updates calculator draft pricing and previews draft total", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  const updated = await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      prices: [
        {
          code: "kitchen",
          name: "Kitchen",
          basePrice: 120000,
          unitLabel: "meter",
          unitPrice: 60000,
          minUnits: 2
        }
      ],
      rules: [
        { code: "material_standard", label: "Standard", ruleType: "multiplier", value: 1 },
        { code: "material_premium", label: "Premium", ruleType: "multiplier", value: 1.5 },
        { code: "delivery", label: "Delivery", ruleType: "fixed_addon", value: 10000 },
        { code: "discount", label: "Discount", ruleType: "percent_discount", value: 10 }
      ]
    }
  });
  const preview = await previewCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      categoryCode: "kitchen",
      units: 3,
      materialRuleCode: "material_premium"
    }
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.draft.prices[0].basePrice, 120000);
  assert.equal(updated.body.draft.fields.length > 0, true);
  assert.equal(updated.body.fields[0].fieldCode, "categoryCode");
  assert.equal(preview.status, 200);
  assert.equal(preview.body.estimate, 414000);
  assert.equal(preview.body.formulaVersion, 1);
  assert.equal(preview.body.schemaVersion, 1);
});

test("publish copies draft pricing to published calculator runtime", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      prices: [
        {
          code: "wardrobe",
          name: "Wardrobe",
          basePrice: 200000,
          unitLabel: "square meter",
          unitPrice: 70000,
          minUnits: 3
        }
      ],
      rules: [
        { code: "material_standard", label: "Standard", ruleType: "multiplier", value: 1 }
      ]
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });
  const runtime = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });

  assert.equal(runtime.status, 200);
  assert.equal(runtime.body.item.categories[0].code, "wardrobe");
  assert.equal(runtime.body.item.categories[0].basePrice, 200000);
  assert.equal(runtime.body.item.fields[0].state, "published");
});

test("draft schema fields do not affect runtime before publish", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });
  await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      fields: [
        {
          fieldCode: "units",
          label: "Draft size label",
          fieldType: "number",
          role: "pricing_input",
          binding: "units",
          defaultValue: "4",
          minValue: 1,
          maxValue: 20,
          isRequired: 1
        }
      ]
    }
  });
  const runtimeBeforePublish = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });
  await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });
  const runtimeAfterPublish = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });

  assert.notEqual(runtimeBeforePublish.body.item.fields[0].label, "Draft size label");
  assert.equal(runtimeAfterPublish.body.item.fields[0].label, "Draft size label");
});

test("calculator preview, runtime, and lead use the same pricing formula", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      prices: [
        {
          code: "kitchen",
          name: "Kitchen",
          basePrice: 120000,
          unitLabel: "meter",
          unitPrice: 60000,
          minUnits: 2
        }
      ],
      rules: [
        { code: "material_standard", label: "Standard", ruleType: "multiplier", value: 1 },
        { code: "material_premium", label: "Premium", ruleType: "multiplier", value: 1.5 },
        { code: "delivery", label: "Delivery", ruleType: "fixed_addon", value: 10000 },
        { code: "discount", label: "Discount", ruleType: "percent_discount", value: 10 }
      ]
    }
  });
  const preview = await previewCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      categoryCode: "kitchen",
      units: 3,
      materialRuleCode: "material_premium"
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });
  const runtime = await getPublishedCalculatorRuntime({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token
  });
  const category = runtime.body.item.categories[0];
  const expected = estimateCalculatorPrice(category, 3, {
    materialRuleCode: "material_premium",
    rules: runtime.body.item.rules
  });
  const lead = await submitCalculatorLead({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token,
    payload: {
      name: "Erlan",
      phone: "+77011234567",
      categoryCode: "kitchen",
      units: 3,
      materialRuleCode: "material_premium"
    },
    fetchImpl: async () => ({ ok: true })
  });

  assert.equal(preview.body.estimate, expected);
  assert.equal(lead.body.estimate, expected);
  assert.equal(JSON.parse(db.orders[0].rawPayload).calculatorMeta.materialMultiplier, 1.5);
});

test("rejects unknown calculator material rule codes", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });
  const published = await publishCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });
  const preview = await previewCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      categoryCode: "kitchen",
      units: 3,
      materialRuleCode: "material_unknown"
    }
  });
  const lead = await submitCalculatorLead({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    token: published.body.token,
    payload: {
      name: "Erlan",
      phone: "+77011234567",
      categoryCode: "kitchen",
      units: 3,
      materialRuleCode: "material_unknown"
    }
  });

  assert.equal(preview.status, 400);
  assert.equal(preview.body.fields[0].field, "materialRuleCode");
  assert.equal(lead.status, 400);
  assert.equal(lead.body.fields[0].field, "materialRuleCode");
});

test("rejects invalid calculator pricing rules", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  const result = await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      prices: [
        {
          code: "kitchen",
          name: "Kitchen",
          basePrice: 100000,
          unitPrice: 50000,
          minUnits: 2
        }
      ],
      rules: [
        { code: "material_bad", label: "Bad", ruleType: "multiplier", value: 0.5 }
      ]
    }
  });
  const pricing = await getCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "validation_error");
  assert.equal(pricing.body.draft.prices.length > 0, true);
});

test("rejects unsupported calculator schema fields", async () => {
  const db = createMockDb();
  await createCalculator({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      ownerName: "Salamat Mebel",
      title: "Furniture calculator"
    }
  });

  const result = await updateCalculatorPricing({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    calculatorId: 1,
    payload: {
      fields: [
        {
          fieldCode: "unsafe",
          label: "Unsafe",
          fieldType: "script",
          role: "pricing_input",
          binding: "unsafeBinding"
        },
        {
          fieldCode: "units",
          label: "Units",
          fieldType: "number",
          role: "dynamic_formula",
          binding: "units"
        }
      ]
    }
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body.fields.map((field) => field.field), [
    "fields.0.fieldType",
    "fields.0.binding",
    "fields.1.role"
  ]);
});

function createMockDb() {
  const state = {
    clients: [],
    orders: [],
    projectTemplates: [],
    templateSteps: [],
    orderSteps: [],
    calculators: [],
    calculatorCategories: [],
    calculatorEmbedTokens: [],
    calculatorPrices: [],
    calculatorRules: [],
    calculatorFields: [],
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

          if (sql.includes("FROM calculators")) {
            return {
              results: state.calculators
                .map((item) => ({ ...item }))
                .sort((a, b) => b.id - a.id)
            };
          }

          throw new Error(`Unexpected all SQL: ${sql}`);
        },
        run: async () => {
            if (sql.startsWith("CREATE") || sql.startsWith("ALTER TABLE")) {
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

            if (sql.includes("INSERT INTO project_templates")) {
              const [code, name, furnitureType] = values;
              let template = state.projectTemplates.find((item) => item.code === code);
              if (!template) {
                template = { id: state.projectTemplates.length + 1, code, name, furnitureType };
                state.projectTemplates.push(template);
              } else {
                template.name = name;
                template.furnitureType = furnitureType;
              }
              return { success: true };
            }

            if (sql.includes("INSERT INTO template_steps")) {
              const [templateId, stepCode, title, sortOrder, required, defaultAssigneeRole] = values;
              state.templateSteps.push({
                id: state.templateSteps.length + 1,
                templateId,
                stepCode,
                title,
                sortOrder,
                required,
                defaultAssigneeRole
              });
              return { success: true };
            }

            if (sql.includes("INSERT INTO order_steps")) {
              const [orderId, templateStepId, stepCode, title, sortOrder] = values;
              state.orderSteps.push({
                id: state.orderSteps.length + 1,
                orderId,
                templateStepId,
                stepCode,
                title,
                status: "pending",
                notes: null,
                completedAt: null,
                completedBy: null,
                sortOrder
              });
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculators")) {
              const [ownerName, ownerPhone, title, description, currency, isEnabled] = values;
              const calculator = {
                id: state.calculators.length + 1,
                ownerName,
                ownerPhone,
                title,
                description,
                currency,
                isEnabled,
                createdAt: now(),
                updatedAt: now()
              };
              state.calculators.push(calculator);
              return { success: true, meta: { last_row_id: calculator.id } };
            }

            if (sql.includes("DELETE FROM calculator_categories")) {
              const [calculatorId] = values;
              state.calculatorCategories = state.calculatorCategories.filter((item) => item.calculatorId !== calculatorId);
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculator_categories")) {
              const [calculatorId, code, name, basePrice, unitLabel, unitPrice, minUnits, sortOrder] = values;
              state.calculatorCategories.push({
                id: state.calculatorCategories.length + 1,
                calculatorId,
                code,
                name,
                basePrice,
                unitLabel,
                unitPrice,
                minUnits,
                sortOrder
              });
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculator_embed_tokens")) {
              const [calculatorId, token] = values;
              state.calculatorEmbedTokens.push({
                id: state.calculatorEmbedTokens.length + 1,
                calculatorId,
                token,
                isActive: 1
              });
              return { success: true };
            }

            if (sql.includes("DELETE FROM calculator_prices")) {
              const [calculatorId, pricingState] = values;
              state.calculatorPrices = state.calculatorPrices.filter((item) => item.calculatorId !== calculatorId || item.state !== pricingState);
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculator_prices")) {
              const [calculatorId, code, name, basePrice, unitLabel, unitPrice, minUnits, sortOrder, pricingState] = values;
              state.calculatorPrices.push({
                id: state.calculatorPrices.length + 1,
                calculatorId,
                code,
                name,
                basePrice,
                unitLabel,
                unitPrice,
                minUnits,
                sortOrder,
                state: pricingState
              });
              return { success: true };
            }

            if (sql.includes("DELETE FROM calculator_rules")) {
              const [calculatorId, pricingState] = values;
              state.calculatorRules = state.calculatorRules.filter((item) => item.calculatorId !== calculatorId || item.state !== pricingState);
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculator_rules")) {
              const [calculatorId, code, label, ruleType, value, pricingState, sortOrder] = values;
              state.calculatorRules.push({
                id: state.calculatorRules.length + 1,
                calculatorId,
                code,
                label,
                ruleType,
                value,
                state: pricingState,
                sortOrder
              });
              return { success: true };
            }

            if (sql.includes("DELETE FROM calculator_fields")) {
              const [calculatorId, fieldState] = values;
              state.calculatorFields = state.calculatorFields.filter((item) => item.calculatorId !== calculatorId || item.state !== fieldState);
              return { success: true };
            }

            if (sql.includes("INSERT INTO calculator_fields")) {
              const [
                calculatorId,
                fieldCode,
                label,
                fieldType,
                role,
                binding,
                optionsSource,
                defaultValue,
                minValue,
                maxValue,
                sortOrder,
                isActive,
                isRequired,
                fieldState
              ] = values;
              state.calculatorFields.push({
                id: state.calculatorFields.length + 1,
                calculatorId,
                fieldCode,
                label,
                fieldType,
                role,
                binding,
                optionsSource,
                defaultValue,
                minValue,
                maxValue,
                sortOrder,
                isActive,
                isRequired,
                state: fieldState
              });
              return { success: true };
            }

            if (sql.includes("UPDATE orders")) {
              const [status, notes, followUpAt, followUpTask, orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              if (order) {
                order.status = status;
                order.notes = notes;
                order.followUpAt = followUpAt;
                order.followUpTask = followUpTask;
                order.updatedAt = now();
              }
              return { success: true };
            }

            if (sql.includes("UPDATE order_steps")) {
              const [status, notes, statusForCompletedAt, statusForCompletedBy, completedBy, stepId, orderId] = values;
              const step = state.orderSteps.find((item) => item.id === stepId && item.orderId === orderId);
              if (step) {
                step.status = status;
                step.notes = notes;
                step.completedAt = statusForCompletedAt === "done" ? now() : null;
                step.completedBy = statusForCompletedBy === "done" ? completedBy : null;
              }
              return { success: true };
            }

            if (sql.includes("UPDATE calculators")) {
              const [isEnabled, calculatorId] = values;
              const calculator = state.calculators.find((item) => item.id === calculatorId);
              if (calculator) {
                calculator.isEnabled = isEnabled;
                calculator.updatedAt = now();
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

            if (sql.includes("FROM project_templates WHERE code = ?")) {
              const [code] = values;
              return state.projectTemplates.find((item) => item.code === code) || null;
            }

            if (sql.includes("FROM template_steps WHERE template_id = ? AND step_code = ?")) {
              const [templateId, stepCode] = values;
              return state.templateSteps.find((item) => item.templateId === templateId && item.stepCode === stepCode) || null;
            }

            if (sql.includes("SELECT id, furniture_type AS furnitureType FROM orders")) {
              const [orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              return order ? { id: order.id, furnitureType: order.furnitureType } : null;
            }

            if (sql.includes("SELECT id FROM order_steps WHERE order_id = ? LIMIT 1")) {
              const [orderId] = values;
              const step = state.orderSteps.find((item) => item.orderId === orderId);
              return step ? { id: step.id } : null;
            }

            if (sql.includes("SELECT id FROM orders WHERE id = ?")) {
              const [orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              return order ? { id: order.id } : null;
            }

            if (sql.includes("SELECT id FROM order_steps WHERE id = ? AND order_id = ?")) {
              const [stepId, orderId] = values;
              const step = state.orderSteps.find((item) => item.id === stepId && item.orderId === orderId);
              return step ? { id: step.id } : null;
            }

            if (sql.includes("FROM order_steps") && sql.includes("WHERE id = ? AND order_id = ?")) {
              const [stepId, orderId] = values;
              const step = state.orderSteps.find((item) => item.id === stepId && item.orderId === orderId);
              return step ? toStepRow(step) : null;
            }

            if (sql.includes("FROM orders") && sql.includes("JOIN clients") && sql.includes("WHERE orders.id = ?")) {
              const [orderId] = values;
              const order = state.orders.find((item) => item.id === orderId);
              return order ? toOrderRow(state, order) : null;
            }

            if (sql.includes("FROM calculators") && sql.includes("WHERE id = ?")) {
              const [calculatorId] = values;
              const calculator = state.calculators.find((item) => item.id === calculatorId);
              return calculator ? { ...calculator } : null;
            }

            if (sql.includes("FROM calculator_embed_tokens") && sql.includes("calculator_id = ? AND token = ?")) {
              const [calculatorId, token] = values;
              const record = state.calculatorEmbedTokens.find((item) => item.calculatorId === calculatorId && item.token === token && item.isActive === 1);
              return record ? { ...record } : null;
            }

            if (sql.includes("FROM calculator_embed_tokens") && sql.includes("calculator_id = ? AND is_active = 1")) {
              const [calculatorId] = values;
              const records = state.calculatorEmbedTokens.filter((item) => item.calculatorId === calculatorId && item.isActive === 1);
              const record = records.at(-1);
              return record ? { ...record } : null;
            }

            if (sql.includes("SELECT id FROM calculator_prices")) {
              const [calculatorId] = values;
              const row = state.calculatorPrices.find((item) => item.calculatorId === calculatorId && item.state === "draft");
              return row ? { id: row.id } : null;
            }

            throw new Error(`Unexpected first SQL: ${sql}`);
          },
          all: async () => {
            if (sql.includes("FROM orders") && sql.includes("JOIN clients")) {
              const statusFilter = sql.includes("WHERE orders.status = ?") ? values[0] : null;
              const items = state.orders
                .filter((order) => !statusFilter || order.status === statusFilter)
                .map((order) => toOrderRow(state, order))
                .sort((a, b) => b.id - a.id);
              return { results: items };
            }

            if (sql.includes("FROM template_steps")) {
              const [templateId] = values;
              return {
                results: state.templateSteps
                  .filter((item) => item.templateId === templateId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({ ...item }))
              };
            }

            if (sql.includes("FROM order_steps") && sql.includes("WHERE order_id = ?")) {
              const [orderId] = values;
              return {
                results: state.orderSteps
                  .filter((item) => item.orderId === orderId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(toStepRow)
              };
            }

            if (sql.includes("FROM calculator_categories")) {
              const [calculatorId] = values;
              return {
                results: state.calculatorCategories
                  .filter((item) => item.calculatorId === calculatorId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({ ...item }))
              };
            }

            if (sql.includes("FROM calculator_prices")) {
              const [calculatorId, pricingState] = values;
              return {
                results: state.calculatorPrices
                  .filter((item) => item.calculatorId === calculatorId && item.state === pricingState)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({ ...item }))
              };
            }

            if (sql.includes("FROM calculator_rules")) {
              const [calculatorId, pricingState] = values;
              return {
                results: state.calculatorRules
                  .filter((item) => item.calculatorId === calculatorId && item.state === pricingState)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({ ...item }))
              };
            }

            if (sql.includes("FROM calculator_fields")) {
              const [calculatorId, fieldState] = values;
              return {
                results: state.calculatorFields
                  .filter((item) => item.calculatorId === calculatorId && item.state === fieldState)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => ({ ...item }))
              };
            }

            throw new Error(`Unexpected bound all SQL: ${sql}`);
          }
        })
      };
    }
  };

  return state;
}

function toStepRow(step) {
  return {
    id: step.id,
    orderId: step.orderId,
    templateStepId: step.templateStepId,
    stepCode: step.stepCode,
    title: step.title,
    status: step.status,
    notes: step.notes,
    completedAt: step.completedAt,
    completedBy: step.completedBy,
    sortOrder: step.sortOrder
  };
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
    aiStatus: order.ai_status || null,
    aiScore: order.ai_score ?? null,
    aiTemperature: order.ai_temperature || null,
    aiFurnitureType: order.ai_furniture_type || null,
    aiQualified: order.ai_qualified ?? null,
    aiSummary: order.ai_summary || null,
    aiNextQuestion: order.ai_next_question || null,
    aiMissingInfoJson: order.ai_missing_info_json || null,
    aiUrgency: order.ai_urgency || null,
    aiPotentialValue: order.ai_potential_value || null,
    aiRecommendedStatus: order.ai_recommended_status || null,
    aiError: order.ai_error || null,
    followUpAt: order.followUpAt || null,
    followUpTask: order.followUpTask || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
