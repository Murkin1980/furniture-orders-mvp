import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKitchenCommandPlan, validateKitchenCommandPlan } from "../src/sketchup/kitchen-command-plan.js";

describe("buildKitchenCommandPlan", () => {
  it("rejects missing input", () => {
    const r = buildKitchenCommandPlan(null);
    assert.equal(r.ok, false);
  });

  it("builds valid plan from kitchen furniture model", () => {
    const r = buildKitchenCommandPlan({
      kitchenLayout: "straight",
      overall: { width: 3000, height: 2700 },
      kitchenWalls: [{ id: "a", lengthMm: 3000 }],
      kitchenBaseModules: [
        { wall: "a", kind: "sink-base", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 560 },
        { wall: "a", kind: "drawers", xMm: 800, widthMm: 600, heightMm: 720, depthMm: 560 }
      ],
      kitchenWallModules: [
        { wall: "a", kind: "wall-cabinet", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 320, mountBottomMm: 1980 }
      ],
      kitchenAppliances: [
        { wall: "a", kind: "fridge", xMm: 1400, widthMm: 600, heightMm: 2000, depthMm: 650 }
      ]
    });

    assert.equal(r.ok, true);
    assert.equal(r.plan.planVersion, "kitchen-command-plan/v1");
    assert.equal(r.plan.commands.length, 6);
    assert.equal(r.plan.commands[0].type, "set_units_mm");
    assert.equal(r.plan.commands[1].type, "create_room_envelope");
    assert.equal(r.plan.commands[1].wallAmm, 3000);
    assert.equal(r.plan.commands[2].type, "place_block_module");
    assert.equal(r.plan.commands[2].kind, "sink-base");
    assert.equal(r.plan.commands[3].type, "place_block_module");
    assert.equal(r.plan.commands[3].kind, "drawers");
    assert.equal(r.plan.commands[4].type, "place_block_module");
    assert.equal(r.plan.commands[4].kind, "wall-cabinet");
    assert.equal(r.plan.commands[5].type, "place_block_appliance");
    assert.equal(r.plan.commands[5].kind, "fridge");
  });

  it("handles empty modules gracefully", () => {
    const r = buildKitchenCommandPlan({
      kitchenLayout: "l",
      overall: { width: 3000, height: 2700 },
      kitchenWalls: [{ id: "A", lengthMm: 3000 }, { id: "B", lengthMm: 2100 }],
      kitchenBaseModules: [],
      kitchenWallModules: [],
      kitchenAppliances: []
    });
    assert.equal(r.ok, true);
    assert.equal(r.plan.commands.length, 2);
  });
});

describe("validateKitchenCommandPlan", () => {
  it("rejects null plan", () => {
    assert.equal(validateKitchenCommandPlan(null).ok, false);
  });

  it("rejects unknown command types", () => {
    const r = validateKitchenCommandPlan({
      planVersion: "kitchen-command-plan/v1",
      commands: [{ type: "execute_ruby_script" }]
    });
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("disallowed_command"));
  });

  it("rejects unknown module kind", () => {
    const r = validateKitchenCommandPlan({
      planVersion: "kitchen-command-plan/v1",
      commands: [{ type: "place_block_module", kind: "custom-geo" }]
    });
    assert.equal(r.ok, false);
  });

  it("accepts valid plan", () => {
    const r = validateKitchenCommandPlan({
      planVersion: "kitchen-command-plan/v1",
      commands: [
        { type: "set_units_mm" },
        { type: "create_room_envelope", layout: "straight", wallAmm: 3000, ceilingHeightMm: 2700 },
        { type: "place_block_module", zone: "base", wall: "a", kind: "sink-base", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 560 },
        { type: "place_block_appliance", wall: "a", kind: "fridge", xMm: 1400, widthMm: 600, heightMm: 2000, depthMm: 650 }
      ]
    });
    assert.equal(r.ok, true);
  });
});
