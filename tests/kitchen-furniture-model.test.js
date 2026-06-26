import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKitchenFurnitureModel } from "../src/sketchup/kitchen-furniture-model.js";

describe("buildKitchenFurnitureModel", () => {
  it("returns error for invalid input", () => {
    const r = buildKitchenFurnitureModel(null);
    assert.equal(r.ok, false);
  });

  it("builds furniture model from kitchen model", () => {
    const kitchenModel = {
      layout: "straight",
      roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 },
      walls: [{ id: "A", lengthMm: 3000 }],
      baseModules: [
        { id: "base-0", wall: "A", kind: "sink-base", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 560 },
        { id: "base-800", wall: "A", kind: "drawers", xMm: 800, widthMm: 600, heightMm: 720, depthMm: 560 }
      ],
      wallModules: [
        { id: "wall-0", wall: "A", kind: "wall-cabinet", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 320, mountBottomMm: 1980 }
      ],
      applianceBlocks: [
        { id: "fridge-1", wall: "A", kind: "fridge", xMm: 1400, widthMm: 600, heightMm: 2000, depthMm: 650 }
      ]
    };

    const r = buildKitchenFurnitureModel(kitchenModel, { orderId: 5 });
    assert.equal(r.ok, true);
    assert.equal(r.model.furnitureType, "kitchen");
    assert.equal(r.model.overall.width, 3000);
    assert.equal(r.model.overall.height, 2700);
    assert.equal(r.model.readyForSketchUp, true);
    assert.equal(r.model.source.orderId, 5);
    assert.equal(r.model.components.length, 4);
    assert.equal(r.model.kitchenLayout, "straight");
    assert.equal(r.model.kitchenBaseModules.length, 2);
    assert.equal(r.model.kitchenWallModules.length, 1);
    assert.equal(r.model.kitchenAppliances.length, 1);
  });

  it("sets readyForSketchUp=false when dimensions missing", () => {
    const r = buildKitchenFurnitureModel({
      layout: "straight",
      roomEnvelope: { wallAmm: null, ceilingHeightMm: null },
      walls: []
    });
    assert.equal(r.model.readyForSketchUp, false);
    assert.equal(r.model.missingInfo.length, 2);
  });

  it("uses default furniture model version", () => {
    const r = buildKitchenFurnitureModel({
      layout: "straight",
      roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 },
      walls: [{ id: "A", lengthMm: 3000 }]
    });
    assert.equal(r.model.modelVersion, "furniture-model/v1");
  });

  it("does not mutate input", () => {
    const input = { layout: "straight", roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 }, walls: [{ id: "A", lengthMm: 3000 }], baseModules: [], wallModules: [], applianceBlocks: [] };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(input)));
    buildKitchenFurnitureModel(frozen);
  });
});
