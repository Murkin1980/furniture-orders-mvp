import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateKitchenModel, getDefaultKitchenModel, READINESS, getSupportedLayouts } from "../src/kitchen/model.js";

describe("validateKitchenModel", () => {
  it("rejects non-object", () => {
    const r = validateKitchenModel(null);
    assert.equal(r.ok, false);
    assert.equal(r.readiness, READINESS.DRAFT);
  });

  it("rejects unsupported layout", () => {
    const r = validateKitchenModel({ ...getDefaultKitchenModel(), layout: "island" });
    assert.equal(r.ok, false);
  });

  it("rejects missing walls", () => {
    const r = validateKitchenModel({ ...getDefaultKitchenModel(), layout: "straight", walls: [] });
    assert.equal(r.ok, false);
  });

  it("accepts valid straight kitchen", () => {
    const model = getDefaultKitchenModel();
    model.layout = "straight";
    model.walls = [{ id: "a", lengthMm: 3000 }];
    const r = validateKitchenModel(model);
    assert.equal(r.ok, true);
    assert.equal(r.readiness, READINESS.PARTIAL);
  });

  it("accepts L layout with two walls", () => {
    const model = getDefaultKitchenModel();
    model.layout = "l";
    model.walls = [{ id: "a", lengthMm: 3000 }, { id: "b", lengthMm: 2100 }];
    const r = validateKitchenModel(model);
    assert.equal(r.ok, true);
  });

  it("rejects L layout with single wall", () => {
    const model = getDefaultKitchenModel();
    model.layout = "l";
    model.walls = [{ id: "a", lengthMm: 3000 }];
    const r = validateKitchenModel(model);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("two walls")));
  });

  it("sets readiness based on errors and warnings", () => {
    const model = getDefaultKitchenModel();
    model.layout = "straight";
    model.walls = [{ id: "a", lengthMm: 3000 }];
    model.baseModules = [{ wall: "a", widthMm: 600 }];
    const r = validateKitchenModel(model);
    assert.equal(r.readiness, READINESS.EXECUTION_READY);
  });

  it("sets partial readiness when modules overflow", () => {
    const model = getDefaultKitchenModel();
    model.layout = "straight";
    model.walls = [{ id: "a", lengthMm: 500 }];
    model.baseModules = [{ wall: "a", widthMm: 800 }];
    const r = validateKitchenModel(model);
    assert.equal(r.readiness, READINESS.PARTIAL);
  });
});
