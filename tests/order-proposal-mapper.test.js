import test from "node:test";
import assert from "node:assert/strict";
import { buildProposalDraftFromOrder } from "../src/proposals/order-proposal-mapper.js";

test("maps order identity and customer fields into a proposal draft", () => {
  const result = buildProposalDraftFromOrder({
    id: 27,
    clientName: "Алия",
    phone: "+7 700 111 22 33",
    city: "Алматы",
    furnitureType: "kitchen",
    description: "Кухня до потолка"
  }, { now: new Date("2026-06-21T00:00:00Z") });

  assert.equal(result.proposalNumber, "КП-0027");
  assert.equal(result.date, "21.06.2026");
  assert.equal(result.customer.name, "Алия");
  assert.equal(result.customer.contact, "Телефон: +7 700 111 22 33");
  assert.equal(result.items[0].name, "Кухня");
  assert.equal(result.items[0].specification, "Кухня до потолка");
});

test("never turns order budget into an approved proposal price", () => {
  const result = buildProposalDraftFromOrder({ id: 3, budget: 850000, furnitureType: "wardrobe" });
  assert.equal(result.items[0].unitPrice, 0);
  assert.equal(result.meta.referenceBudget, 850000);
  assert.equal(result.meta.requiresManagerPricing, true);
});

test("prefers AI furniture type but keeps manager pricing required", () => {
  const result = buildProposalDraftFromOrder({ furnitureType: "other", aiFurnitureType: "office" });
  assert.equal(result.items[0].name, "Офисная мебель");
  assert.equal(result.meta.requiresManagerPricing, true);
});

test("reads snake case and raw payload JSON safely", () => {
  const result = buildProposalDraftFromOrder({
    id: 8,
    client_name: "Тест",
    furniture_type: "cabinet",
    raw_payload: JSON.stringify({
      district: "Медеуский район",
      address: "Тестовый адрес",
      calculatorMeta: { calculatorId: 2, estimate: 410000, formulaVersion: 1, schemaVersion: 1 }
    })
  });
  assert.equal(result.customer.project, "Медеуский район, Тестовый адрес");
  assert.equal(result.meta.calculator.estimate, 410000);
  assert.equal(result.items[0].unitPrice, 0);
});

test("invalid raw payload and empty order do not throw", () => {
  const invalid = buildProposalDraftFromOrder({ rawPayload: "{bad json" });
  const empty = buildProposalDraftFromOrder();
  assert.equal(invalid.meta.calculator, null);
  assert.equal(empty.customer.name, "Не указан");
  assert.equal(empty.items[0].name, "Мебель на заказ");
});

test("does not mutate order or options", () => {
  const order = { id: 5, rawPayload: { city: "Алматы" } };
  const options = { company: { name: "Компания" }, terms: { productionDays: 20 } };
  const orderBefore = structuredClone(order);
  const optionsBefore = structuredClone(options);
  buildProposalDraftFromOrder(order, options);
  assert.deepEqual(order, orderBefore);
  assert.deepEqual(options, optionsBefore);
});

