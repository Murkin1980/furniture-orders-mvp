import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDefaultPdfEstimate, generatePdfEstimate } from "../src/pdf/pdf-estimate-generator.js";

describe("generatePdfEstimate", () => {
  it("returns default for empty manifest", () => {
    const result = generatePdfEstimate({});
    assert.equal(result.estimateVersion, "pdf-estimate/v1");
    assert.equal(result.items.length, 0);
  });

  it("generates estimate from furniture zones in rooms", () => {
    const manifest = {
      document: { orderId: 1 },
      rooms: [{
        name: "Кухня",
        furnitureZones: [{ furnitureType: "kitchen", label: "Кухонный гарнитур", dimensions: { width: 3000 } }]
      }]
    };
    const result = generatePdfEstimate(manifest);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].furnitureType, "kitchen");
    assert.equal(result.items[0].label, "Кухонный гарнитур");
    assert.ok(result.totals.total > 0);
  });

  it("generates estimate from furniture zones in pages", () => {
    const manifest = {
      pages: [{
        pageNumber: 1, pageType: "floor_plan",
        furnitureZones: [{ furnitureType: "wardrobe", label: "Шкаф-купе", overallDimensions: { widthMm: 2400 } }]
      }]
    };
    const result = generatePdfEstimate(manifest);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].furnitureType, "wardrobe");
  });

  it("handles multiple zones and deduplicates by label", () => {
    const manifest = {
      rooms: [
        { name: "Кухня", furnitureZones: [{ furnitureType: "kitchen", label: "Кухня" }] },
        { name: "Спальня", furnitureZones: [{ furnitureType: "bedroom", label: "Спальня" }, { furnitureType: "wardrobe", label: "Шкаф" }] }
      ]
    };
    const result = generatePdfEstimate(manifest);
    assert.equal(result.items.length, 3);
    assert.equal(result.totals.itemCount, 3);
  });

  it("uses units from width dimension", () => {
    const manifest = {
      rooms: [{
        furnitureZones: [{ furnitureType: "kitchen", dimensions: { width: 3000 }, label: "Кухня" }]
      }]
    };
    const result = generatePdfEstimate(manifest);
    assert.equal(result.items[0].units, 3);
  });

  it("applies discount percent", () => {
    const manifest = {
      rooms: [{ furnitureZones: [{ furnitureType: "kitchen", label: "Кухня" }] }]
    };
    const result = generatePdfEstimate(manifest, { discountPercent: 10 });
    assert.ok(result.totals.discount > 0);
    assert.equal(result.totals.total, result.totals.subtotal - result.totals.discount);
  });

  it("uses source draftId and orderId from options", () => {
    const manifest = { document: { orderId: 5 } };
    const result = generatePdfEstimate(manifest, { draftId: 3 });
    assert.equal(result.source.draftId, 3);
    assert.equal(result.source.orderId, 5);
  });

  it("does not mutate input", () => {
    const manifest = { rooms: [{ furnitureZones: [{ furnitureType: "kitchen", label: "K" }] }] };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(manifest)));
    generatePdfEstimate(frozen);
  });
});
