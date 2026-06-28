import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKitchenModel } from "../src/kitchen/build-kitchen-model.js";

describe("buildKitchenModel", () => {
  it("returns error for invalid brief", () => {
    const r = buildKitchenModel({});
    assert.equal(r.ok, false);
    assert.ok(r.error);
  });

  it("returns error for unsupported layout", () => {
    const r = buildKitchenModel({
      kitchen: { layout: "island", room: { wallAmm: 3000, ceilingHeightMm: 2700 } }
    });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("not yet supported"));
  });

  it("builds a straight kitchen from brief with modules", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [
          { zone: "base", wall: "a", type: "sink-base", widthMm: 800 },
          { zone: "base", wall: "a", type: "drawers", widthMm: 600 },
          { zone: "wall", wall: "a", type: "wall-cabinet", widthMm: 800 }
        ]
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.layout, "straight");
    assert.equal(r.model.walls.length, 1);
    assert.equal(r.model.walls[0].id, "a");
    assert.equal(r.model.walls[0].lengthMm, 3000);
    assert.equal(r.model.baseModules.length, 2);
    assert.equal(r.model.wallModules.length, 1);
    assert.equal(r.model.baseModules[0].kind, "sink-base");
    assert.equal(r.model.baseModules[0].xMm, 0);
    assert.equal(r.model.baseModules[1].xMm, 800);
    assert.equal(r.model.wallModules[0].kind, "wall-cabinet");
  });

  it("warns when modules exceed wall length", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 1000, ceilingHeightMm: 2700 },
        modules: [
          { zone: "base", wall: "a", type: "sink-base", widthMm: 800 },
          { zone: "base", wall: "a", type: "drawers", widthMm: 600 }
        ]
      }
    });
    assert.equal(r.ok, true);
    assert.ok(r.model.warnings.length > 0);
    assert.equal(r.model.baseModules.length, 1);
  });

  it("builds appliance blocks from brief", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 5000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: 800 }],
        appliances: { sink: false, hob: true, oven: true, fridge: true },
        zones: { sinkWall: "a", hobWall: "a", ovenWall: "a", fridgeWall: "a" }
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.applianceBlocks.length, 3);
    assert.equal(r.model.applianceBlocks[0].kind, "hob");
    assert.equal(r.model.applianceBlocks[1].kind, "oven");
    assert.equal(r.model.applianceBlocks[2].kind, "fridge");
  });

  it("does not mutate input", () => {
    const input = {
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: 800 }]
      }
    };
    const frozen = Object.freeze(JSON.parse(JSON.stringify(input)));
    buildKitchenModel(frozen);
  });

  it("rejects L layout without wallB", () => {
    const r = buildKitchenModel({
      kitchen: { layout: "l", room: { wallAmm: 3000, ceilingHeightMm: 2700 } }
    });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("wallB"));
  });

  it("rejects inferred data without manager approval", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: 800 }]
      },
      provenance: { inferred: true, managerApprovedInferred: false }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.readiness, "draft");
    assert.ok(r.model.warnings.some((w) => w.includes("Inferred data")));
  });

  it("accepts inferred data after manager approval", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: 800 }]
      },
      provenance: { inferred: true, managerApprovedInferred: true }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.readiness, "execution_ready");
  });

  it("rejects unknown wall reference in modules", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "x", type: "sink-base", widthMm: 800 }]
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.baseModules.length, 0);
    assert.ok(r.model.warnings.some((w) => w.includes("unknown wall")));
  });

  it("skips modules with null widthMm", () => {
    const r = buildKitchenModel({
      kitchen: {
        layout: "straight",
        room: { wallAmm: 3000, ceilingHeightMm: 2700 },
        modules: [{ zone: "base", wall: "a", type: "sink-base", widthMm: null }]
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.model.baseModules.length, 0);
    assert.ok(r.model.warnings.some((w) => w.includes("no width")));
  });
});
