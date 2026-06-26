import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapOrderToKitchenBrief } from "../src/kitchen/order-to-brief.js";

describe("mapOrderToKitchenBrief", () => {
  it("rejects non-kitchen order", () => {
    const r = mapOrderToKitchenBrief({ furnitureType: "wardrobe", description: "Шкаф" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "not_a_kitchen_order");
  });

  it("rejects invalid input", () => {
    assert.equal(mapOrderToKitchenBrief(null).ok, false);
    assert.equal(mapOrderToKitchenBrief("string").ok, false);
  });

  it("maps a kitchen order to brief", () => {
    const r = mapOrderToKitchenBrief({
      id: 1,
      name: "Ерлан",
      phone: "+77011234567",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 850000,
      description: "Нужна угловая кухня 3 метра, белый матовый фасад"
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.sourceType, "order");
    assert.equal(r.brief.sourceRef.orderId, 1);
    assert.equal(r.brief.customer.name, "Ерлан");
    assert.equal(r.brief.customer.phone, "+77011234567");
    assert.equal(r.brief.kitchen.layout, "l");
    assert.equal(r.brief.kitchen.room.wallAmm, 3000);
    assert.equal(r.brief.kitchen.room.ceilingHeightMm, 2700);
    assert.ok(r.brief.kitchen.modules.length > 0);
    assert.equal(r.brief.commercial.budgetKzt, 850000);
  });

  it("reads calculatorMeta from raw_payload", () => {
    const r = mapOrderToKitchenBrief({
      id: 5,
      name: "Тест",
      phone: "+77011234567",
      furnitureType: "kitchen",
      description: "кухня 3 метра",
      budget: 615000,
      raw_payload: JSON.stringify({
        calculatorMeta: { calculatorId: 1, estimate: 615000, formulaVersion: 1 }
      })
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.commercial.estimateKzt, 615000);
    assert.equal(r.brief.commercial.calculatorMeta.calculatorId, 1);
  });

  it("handles snake_case order fields", () => {
    const r = mapOrderToKitchenBrief({
      orderId: 10,
      clientName: "Иван",
      phone: "+77011234567",
      furniture_type: "kitchen",
      city: "Алматы",
      description: "Кухня 3 метра"
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.sourceRef.orderId, 10);
    assert.equal(r.brief.customer.name, "Иван");
    assert.equal(r.brief.kitchen.room.wallAmm, 3000);
  });

  it("guesses straight layout when no keywords", () => {
    const r = mapOrderToKitchenBrief({
      id: 3, name: "Тест", phone: "+77011234567",
      furnitureType: "kitchen", description: "Кухня 2 метра"
    });
    assert.equal(r.brief.kitchen.layout, "straight");
    assert.equal(r.brief.kitchen.room.wallAmm, 2000);
  });

  it("does not mutate input", () => {
    const order = { id: 1, name: "Тест", phone: "+77011234567", furnitureType: "kitchen", description: "Кухня" };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(order)));
    mapOrderToKitchenBrief(frozen);
  });
});
