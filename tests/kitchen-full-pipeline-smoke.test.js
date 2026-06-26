import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Kitchen 3D full pipeline smoke", () => {
  it("straight kitchen: order → KitchenBrief → KitchenModel → furniture-model → kitchen-command-plan → dry-run summary", async () => {
    // 1. Order data
    const order = { id: 42, name: "Ерлан", phone: "+77011234567", city: "Алматы", furnitureType: "kitchen", budget: 2500000, description: "Прямая кухня 5 метров, белый матовый фасад" };

    // 2. → KitchenBrief
    const { mapOrderToKitchenBrief } = await import("../src/kitchen/order-to-brief.js");
    const briefResult = mapOrderToKitchenBrief(order);
    assert.equal(briefResult.ok, true);
    assert.equal(briefResult.brief.kitchen.layout, "straight");
    assert.equal(briefResult.brief.kitchen.room.wallAmm, 5000);
    assert.equal(briefResult.brief.sourceRef.orderId, 42);

    // 3. → KitchenModel
    const { buildKitchenModel } = await import("../src/kitchen/build-kitchen-model.js");
    const modelResult = buildKitchenModel(briefResult.brief);
    assert.equal(modelResult.ok, true);
    assert.ok(modelResult.model.baseModules.length > 0);
    assert.ok(modelResult.model.wallModules.length > 0);
    const totalModules = modelResult.model.baseModules.length + modelResult.model.wallModules.length;

    // 4. → furniture-model/v1 (kitchen)
    const { buildKitchenFurnitureModel } = await import("../src/sketchup/kitchen-furniture-model.js");
    const furnResult = buildKitchenFurnitureModel(modelResult.model, { orderId: 42 });
    assert.equal(furnResult.ok, true);
    assert.equal(furnResult.model.furnitureType, "kitchen");
    assert.equal(furnResult.model.readyForSketchUp, true);
    assert.equal(furnResult.model.overall.width, 5000);
    assert.equal(furnResult.model.overall.height, 2700);
    assert.equal(furnResult.model.components.length, totalModules);

    // 5. → kitchen-command-plan/v1
    const { buildKitchenCommandPlan, validateKitchenCommandPlan } = await import("../src/sketchup/kitchen-command-plan.js");
    const planResult = buildKitchenCommandPlan(furnResult.model);
    assert.equal(planResult.ok, true);
    assert.equal(planResult.plan.planVersion, "kitchen-command-plan/v1");
    assert.ok(planResult.plan.commands.length >= 3);

    const firstCmd = planResult.plan.commands[0];
    assert.equal(firstCmd.type, "set_units_mm");
    assert.ok(planResult.plan.commands.some((c) => c.type === "create_room_envelope"));
    assert.ok(planResult.plan.commands.some((c) => c.type === "place_block_module"));
    assert.equal(planResult.plan.commands.filter((c) => c.type === "place_block_module").length, totalModules);

    // 6. Validate command plan
    const validation = validateKitchenCommandPlan(planResult.plan);
    assert.equal(validation.ok, true);

    // 7. Dry-run summary from fake-node
    const { buildDryRunSummary } = await import("../src/sketchup/fake-node.js");
    const summary = buildDryRunSummary(planResult.plan);
    assert.equal(summary.planVersion, "kitchen-command-plan/v1");
    assert.equal(summary.furnitureType, "kitchen");
    assert.equal(summary.dimensions.widthMm, 5000);
    assert.ok(summary.kitchenSummary);
    assert.equal(summary.kitchenSummary.baseModuleCount, modelResult.model.baseModules.length);
    assert.equal(summary.kitchenSummary.wallModuleCount, modelResult.model.wallModules.length);

    console.log(`  ✓ Kitchen smoke: order #42 → brief → ${totalModules} modules → furniture-model → ${planResult.plan.commands.length} commands → validated → dry-run summary`);
  });
});
