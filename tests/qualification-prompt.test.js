import test from "node:test";
import assert from "node:assert/strict";
import { buildQualificationPrompt } from "../src/ai/qualification-prompt.js";

test("builds prompt with all key order fields", () => {
  const prompt = buildQualificationPrompt({
    name: "Алия",
    phone: "+7 777 123 45 67",
    city: "Алматы",
    district: "Бостандыкский",
    furnitureType: "kitchen",
    projectType: "custom",
    description: "Угловая кухня",
    budget: 2500000,
    budgetRange: "2-3 млн",
    deadline: "до сентября",
    address: "ул. Абая",
    source: "landing",
    preferredChannel: "WhatsApp"
  });

  for (const value of ["Алия", "+7 777 123 45 67", "Алматы", "Бостандыкский", "kitchen", "custom", "Угловая кухня", "2500000", "2-3 млн", "до сентября", "ул. Абая", "landing", "WhatsApp"]) {
    assert.match(prompt, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("does not contain undefined or null for empty order data", () => {
  const prompt = buildQualificationPrompt({});

  assert.doesNotMatch(prompt, /\bundefined\b/i);
  assert.doesNotMatch(prompt, /\bnull\b/i);
  assert.match(prompt, /Не указано/);
});

test("includes required JSON result fields", () => {
  const prompt = buildQualificationPrompt({});
  const requiredFields = [
    "furnitureType",
    "isQualified",
    "leadScore",
    "leadTemperature",
    "missingInfo",
    "nextQuestion",
    "urgency",
    "potentialValue",
    "recommendedStatus",
    "ownerSummary"
  ];

  for (const field of requiredFields) {
    assert.match(prompt, new RegExp(field));
  }
  assert.match(prompt, /только один валидный JSON-объект/i);
});

test("includes furniture business context", () => {
  const prompt = buildQualificationPrompt({});

  for (const context of ["кухни", "шкафы", "гардеробные", "мебель для ванной", "прихожие", "детские", "офисная мебель", "ТВ-зоны", "коммерческая мебель", "Алматы и область", "среднему чеку"]) {
    assert.match(prompt, new RegExp(context, "i"));
  }
});

test("supports camelCase and snake_case order fields", () => {
  const camelPrompt = buildQualificationPrompt({
    furnitureType: "wardrobe",
    projectType: "built-in",
    budgetRange: "1-2 млн",
    preferredChannel: "Telegram"
  });
  const snakePrompt = buildQualificationPrompt({
    furniture_type: "bathroom",
    project_type: "wall-mounted",
    budget_range: "500-800 тыс",
    preferred_channel: "WhatsApp"
  });

  for (const value of ["wardrobe", "built-in", "1-2 млн", "Telegram"]) {
    assert.match(camelPrompt, new RegExp(value));
  }
  for (const value of ["bathroom", "wall-mounted", "500-800 тыс", "WhatsApp"]) {
    assert.match(snakePrompt, new RegExp(value));
  }
});

test("includes calculatorMeta when provided", () => {
  const prompt = buildQualificationPrompt({
    calculatorMeta: {
      calculatorId: "kitchen-v2",
      estimate: 1850000,
      ignored: null
    }
  });

  assert.match(prompt, /calculatorMeta: \{"calculatorId":"kitchen-v2","estimate":1850000\}/);
  assert.doesNotMatch(prompt, /\bnull\b/i);
});
