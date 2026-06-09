import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultSiteBrief,
  normalizeSiteBrief,
  parseSiteBrief,
  serializeSiteBrief,
  validateSiteBrief
} from "../src/site-brief.js";
import { SITE_TEMPLATES, buildTemplateSiteBrief, getSiteTemplate } from "../src/site-templates.js";

test("normalizes a structured commercial landing brief", () => {
  const input = {
    businessName: "  Salamat Mebel ",
    city: " Алматы ",
    phone: "+77001234567",
    primaryOffer: "Кухни на заказ",
    advantages: "Замер, Проект, Замер",
    sections: ["services", "calculator", "unsafe"],
    calculatorRequired: true,
    calculatorId: "12",
    accentColor: "#AA5500"
  };
  const result = normalizeSiteBrief(input);

  assert.equal(result.businessName, "Salamat Mebel");
  assert.deepEqual(result.advantages, ["Замер", "Проект"]);
  assert.deepEqual(result.sections, ["services", "calculator", "portfolio"]);
  assert.equal(result.calculatorId, 12);
  assert.equal(result.accentColor, "#aa5500");
  assert.deepEqual(input.sections, ["services", "calculator", "unsafe"]);
});

test("brief safely serializes, parses, and validates", () => {
  const valid = {
    businessName: "Salamat Mebel",
    city: "Алматы",
    whatsapp: "+77001234567",
    primaryOffer: "Мебель на заказ"
  };

  assert.deepEqual(validateSiteBrief(valid), []);
  assert.equal(parseSiteBrief(serializeSiteBrief(valid)).businessName, "Salamat Mebel");
  assert.deepEqual(parseSiteBrief("{broken"), getDefaultSiteBrief());
  assert.deepEqual(validateSiteBrief({}).map((error) => error.field), [
    "brief.businessName",
    "brief.city",
    "brief.primaryOffer",
    "brief.phone"
  ]);
});

test("calculator selection is required only for enabled calculator section", () => {
  const base = {
    businessName: "A",
    city: "B",
    phone: "C",
    primaryOffer: "D"
  };

  assert.equal(validateSiteBrief({ ...base, calculatorRequired: true })[0].field, "brief.calculatorId");
  assert.equal(normalizeSiteBrief({ ...base, calculatorRequired: false, calculatorId: 9 }).calculatorId, null);
});

test("template library is allowlisted and returns independent defaults", () => {
  assert.deepEqual(SITE_TEMPLATES.map((template) => template.key), [
    "default-furniture",
    "kitchen",
    "wardrobe",
    "casework"
  ]);
  assert.equal(getSiteTemplate("unknown").key, "default-furniture");
  const brief = buildTemplateSiteBrief("kitchen", { city: "Алматы" });
  brief.advantages.push("Changed");
  assert.equal(getSiteTemplate("kitchen").advantages.includes("Changed"), false);
});
