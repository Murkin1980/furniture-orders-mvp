import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapPdfManifestToRecognition } from "../src/pdf/pdf-to-recognition.js";

describe("mapPdfManifestToRecognition", () => {
  it("returns null for non-object", () => {
    assert.equal(mapPdfManifestToRecognition(null), null);
    assert.equal(mapPdfManifestToRecognition("str"), null);
  });

  it("extracts dimensions from room furniture zones", () => {
    const result = mapPdfManifestToRecognition({
      pages: [{ pageNumber: 1, pageType: "floor_plan" }],
      rooms: [{
        name: "Кухня",
        furnitureZones: [{
          label: "Кухонный гарнитур",
          furnitureType: "kitchen",
          overallDimensions: { widthMm: 3000, heightMm: 2600, depthMm: 600 }
        }]
      }]
    });
    assert.equal(result.furnitureType, "kitchen");
    assert.equal(result.documentType, "furniture_sketch");
    assert.equal(result.dimensions.length, 3);
    assert.equal(result.dimensions[0].label, "width");
    assert.equal(result.dimensions[0].value, 3000);
  });

  it("handles dimensions from pages", () => {
    const result = mapPdfManifestToRecognition({
      pages: [{
        pageNumber: 1, pageType: "elevation",
        furnitureZones: [{ label: "Шкаф", furnitureType: "wardrobe", dimensions: { width: 2400, height: 2600 } }]
      }]
    });
    assert.equal(result.furnitureType, "wardrobe");
    assert.equal(result.dimensions.length, 2);
    assert.ok(result.missingInfo.length > 0);
  });

  it("handles empty manifest", () => {
    const result = mapPdfManifestToRecognition({});
    assert.equal(result.furnitureType, "other");
    assert.equal(result.dimensions.length, 0);
  });

  it("deduplicates zones by label", () => {
    const result = mapPdfManifestToRecognition({
      rooms: [{ furnitureZones: [{ label: "Кухня", furnitureType: "kitchen" }] }],
      pages: [{ pageNumber: 1, furnitureZones: [{ label: "Кухня", furnitureType: "kitchen" }] }]
    });
    assert.equal(result.components.length, 1);
  });

  it("does not mutate input", () => {
    const input = { pages: [{ pageNumber: 1 }] };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(input)));
    mapPdfManifestToRecognition(frozen);
  });
});
