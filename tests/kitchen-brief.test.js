import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeKitchenBrief, getDefaultKitchenBrief, LAYOUT_TYPES, MODULE_TYPES } from "../src/kitchen/brief.js";

describe("normalizeKitchenBrief", () => {
  it("returns error for non-object input", () => {
    const r = normalizeKitchenBrief(null);
    assert.equal(r.ok, false);
    assert.equal(r.error, "invalid_input");
  });

  it("returns error when layout is missing", () => {
    const r = normalizeKitchenBrief({ kitchen: { room: { wallAmm: 3000, ceilingHeightMm: 2700 } } });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("layout"));
  });

  it("returns error when wall lengths are missing", () => {
    const r = normalizeKitchenBrief({ kitchen: { layout: "straight", room: { ceilingHeightMm: 2700 } } });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("wall length"));
  });

  it("returns error when ceiling height is missing", () => {
    const r = normalizeKitchenBrief({ kitchen: { layout: "straight", room: { wallAmm: 3000 } } });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("Ceiling height"));
  });

  it("normalizes a valid straight kitchen", () => {
    const r = normalizeKitchenBrief({
      sourceType: "order",
      sourceRef: { orderId: 1 },
      customer: { name: "Ерлан", phone: "+77011234567", city: "Алматы" },
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [
          { zone: "base", wall: "A", type: "sink-base", widthMm: 800 },
          { zone: "base", wall: "A", type: "drawers", widthMm: 600 },
          { zone: "wall", wall: "A", type: "wall-cabinet", widthMm: 800 }
        ]
      },
      commercial: { budgetKzt: 1500000 },
      notes: ["Кухня под потолок"]
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.schemaVersion, 1);
    assert.equal(r.brief.sourceType, "order");
    assert.equal(r.brief.customer.name, "Ерлан");
    assert.equal(r.brief.kitchen.layout, "straight");
    assert.equal(r.brief.kitchen.room.wallAmm, 3000);
    assert.equal(r.brief.kitchen.room.ceilingHeightMm, 2700);
    assert.equal(r.brief.kitchen.modules.length, 3);
    assert.equal(r.brief.commercial.budgetKzt, 1500000);
    assert.equal(r.brief.notes[0], "Кухня под потолок");
  });

  it("normalizes an L-shaped kitchen", () => {
    const r = normalizeKitchenBrief({
      kitchen: {
        layout: "L",
        room: { wallAmm: 3000, wallBmm: 2100, ceilingHeightMm: 2700 }
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.kitchen.layout, "l");
    assert.equal(r.brief.kitchen.room.wallAmm, 3000);
    assert.equal(r.brief.kitchen.room.wallBmm, 2100);
  });

  it("rejects unknown module types", () => {
    const r = normalizeKitchenBrief({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ type: "unknown-type", widthMm: 600 }]
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.brief.kitchen.modules.length, 0);
  });

  it("marks missing dimensions as provisional", () => {
    const r = normalizeKitchenBrief({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: 800 }]
      }
    });
    assert.equal(r.brief.kitchen.modules[0].heightMm, null);
    assert.equal(r.brief.kitchen.modules[0].depthMm, null);
    assert.equal(r.brief.kitchen.modules[0]._provisional.height, true);
    assert.equal(r.brief.kitchen.modules[0]._provisional.depth, true);
  });

  it("normalizes enum values case-insensitively", () => {
    const r = normalizeKitchenBrief({
      kitchen: {
        layout: "L",
        room: { wallAmm: 3000, wallBmm: 2000, ceilingHeightMm: 2700 }
      }
    });
    assert.equal(r.brief.kitchen.layout, "l");
  });

  it("does not mutate input", () => {
    const input = { kitchen: { layout: "straight", room: { wallAmm: 3000, ceilingHeightMm: 2700 } } };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(input)));
    normalizeKitchenBrief(frozen);
  });
});
