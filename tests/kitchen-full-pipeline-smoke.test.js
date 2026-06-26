import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Kitchen 3D full pipeline smoke", () => {
  it("straight kitchen: brief → model → furniture-model → command-plan → dry-run summary", async () => {
    // 1. Build KitchenBrief directly (intentional, not inferred from order)
    const { normalizeKitchenBrief } = await import("../src/kitchen/brief.js");
    const briefResult = normalizeKitchenBrief({
      sourceType: "order",
      sourceRef: { orderId: 42 },
      customer: { name: "Ерлан", phone: "+77011234567", city: "Алматы" },
      kitchen: {
        layout: "straight",
        room: { wallAmm: 5000, ceilingHeightMm: 2700 },
        modules: [
          { zone: "base", wall: "A", type: "sink-base", widthMm: 800, heightMm: 720, depthMm: 560 },
          { zone: "base", wall: "A", type: "drawers", widthMm: 600, heightMm: 720, depthMm: 560 },
          { zone: "base", wall: "A", type: "base-cabinet", widthMm: 600, heightMm: 720, depthMm: 560 },
          { zone: "wall", wall: "A", type: "wall-cabinet", widthMm: 800, heightMm: 720, depthMm: 320 }
        ]
      },
      commercial: { budgetKzt: 2500000 }
    });
    assert.equal(briefResult.ok, true, `Brief: ${briefResult.error}`);
    assert.equal(briefResult.brief.kitchen.layout, "straight");
    assert.equal(briefResult.brief.kitchen.room.wallAmm, 5000);
    assert.equal(briefResult.brief.sourceRef.orderId, 42);

    // 2. → KitchenModel
    const { buildKitchenModel } = await import("../src/kitchen/build-kitchen-model.js");
    const modelResult = buildKitchenModel(briefResult.brief);
    assert.equal(modelResult.ok, true, `Model: ${modelResult.error}`);
    assert.equal(modelResult.model.layout, "straight");
    assert.ok(modelResult.model.baseModules.length > 0, "Should have base modules");
    assert.ok(modelResult.model.wallModules.length > 0, "Should have wall modules");
    assert.equal(modelResult.model.readiness, "execution_ready", "Model should be execution_ready");
    const totalModules = modelResult.model.baseModules.length + modelResult.model.wallModules.length;

    // 3. → furniture-model/v1 (kitchen)
    const { buildKitchenFurnitureModel } = await import("../src/sketchup/kitchen-furniture-model.js");
    const furnResult = buildKitchenFurnitureModel(modelResult.model, { orderId: 42 });
    assert.equal(furnResult.ok, true);
    assert.equal(furnResult.model.furnitureType, "kitchen");
    assert.equal(furnResult.model.readyForSketchUp, true);
    assert.equal(furnResult.model.overall.width, 5000);
    assert.equal(furnResult.model.overall.height, 2700);
    assert.equal(furnResult.model.overall.depth, null);
    assert.equal(furnResult.model.components.length, totalModules);
    assert.equal(furnResult.model.kitchenEnvelope.layout, "straight");
    assert.equal(furnResult.model.kitchenEnvelope.primaryRunMm, 5000);

    // 4. → kitchen-command-plan/v1
    const { buildKitchenCommandPlan, validateKitchenCommandPlan } = await import("../src/sketchup/kitchen-command-plan.js");
    const planResult = buildKitchenCommandPlan(furnResult.model);
    assert.equal(planResult.ok, true, `Plan: ${planResult.error}`);
    assert.equal(planResult.plan.planVersion, "kitchen-command-plan/v1");
    assert.ok(planResult.plan.commands.length >= 3);

    const firstCmd = planResult.plan.commands[0];
    assert.equal(firstCmd.type, "set_units_mm");
    assert.ok(planResult.plan.commands.some((c) => c.type === "create_room_envelope"));
    assert.equal(planResult.plan.commands.filter((c) => c.type === "place_block_module").length, totalModules);

    // 5. Validate command plan
    const validation = validateKitchenCommandPlan(planResult.plan);
    assert.equal(validation.ok, true);

    // 6. Dry-run summary
    const { buildDryRunSummary } = await import("../src/sketchup/fake-node.js");
    const summary = buildDryRunSummary(planResult.plan);
    assert.equal(summary.planVersion, "kitchen-command-plan/v1");
    assert.equal(summary.furnitureType, "kitchen");
    assert.equal(summary.dimensions.widthMm, 5000);
    assert.ok(summary.kitchenSummary);
    assert.equal(summary.kitchenSummary.baseModuleCount, modelResult.model.baseModules.length);
    assert.equal(summary.kitchenSummary.wallModuleCount, modelResult.model.wallModules.length);

    console.log(`  ✓ Kitchen smoke: brief → ${totalModules} modules → ${planResult.plan.commands.length} commands → validated → dry-run`);
  });
});
