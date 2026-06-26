import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Kitchen manager review flow — end-to-end", () => {
  it("synthetic order → inferred brief → manager review → kitchen model → command plan → fake node dry-run", async () => {
    // 1. Synthetic order arrives (heuristic, missing data)
    const { mapOrderToKitchenBrief } = await import("../src/kitchen/order-to-brief.js");
    const syncOrder = mapOrderToKitchenBrief({
      id: 99,
      name: "Ерлан",
      phone: "+77011234567",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 1800000,
      description: "Угловая кухня 3 метра, белый матовый фасад"
    });

    // 2. Inferred brief requires review — missing ceiling height, no modules, no wallB
    assert.equal(syncOrder.ok, false, "Inferred brief is not valid — needs manager");
    assert.equal(syncOrder.brief.provenance.inferred, true);
    assert.equal(syncOrder.brief.provenance.requiresReview, true);
    assert.equal(syncOrder.brief.kitchen.room.ceilingHeightMm, null);
    assert.equal(syncOrder.brief.kitchen.modules.length, 0);
    assert.ok(syncOrder.error.includes("Ceiling height"));
    console.log("  ✓ Step 1: Inferred brief — requires manager review (ceiling, modules, wallB missing)");

    // 3. Manager reviews and completes the brief
    const { normalizeKitchenBrief } = await import("../src/kitchen/brief.js");
    const reviewedBrief = normalizeKitchenBrief({
      sourceType: "order",
      sourceRef: { orderId: 99 },
      customer: { name: "Ерлан", phone: "+77011234567", city: "Алматы" },
      kitchen: {
        layout: "l",
        room: { wallAmm: 3000, wallBmm: 2100, ceilingHeightMm: 2700 },
        style: { frontMaterial: "MDF", frontFinish: "matte", frontColor: "white", bodyMaterial: "LDSP", bodyColor: "sonoma" },
        appliances: { sink: true, hob: true, oven: true, fridge: true, hood: true },
        zones: { sinkWall: "a", hobWall: "a", ovenWall: "a", fridgeWall: "b", hoodWall: "a" },
        modules: [
          { zone: "base", wall: "a", type: "sink-base", widthMm: 800, heightMm: 720, depthMm: 560 },
          { zone: "base", wall: "b", type: "base-cabinet", widthMm: 900, heightMm: 720, depthMm: 560 },
          { zone: "wall", wall: "a", type: "wall-cabinet", widthMm: 600, heightMm: 720, depthMm: 320 }
        ]
      },
      commercial: { budgetKzt: 1800000 },
      provenance: { inferred: false, requiresReview: false }
    });

    assert.equal(reviewedBrief.ok, true, `Manager brief: ${reviewedBrief.error}`);
    assert.equal(reviewedBrief.brief.kitchen.layout, "l");
    assert.equal(reviewedBrief.brief.kitchen.room.wallAmm, 3000);
    assert.equal(reviewedBrief.brief.kitchen.room.wallBmm, 2100);
    assert.equal(reviewedBrief.brief.kitchen.room.ceilingHeightMm, 2700);
    assert.equal(reviewedBrief.brief.kitchen.modules.length, 3);
    assert.equal(reviewedBrief.brief.provenance.inferred, false);
    assert.equal(reviewedBrief.brief.provenance.requiresReview, false);
    console.log("  ✓ Step 2: Manager completed brief — L-kitchen, 3000x2100mm, 3 modules, 5 appliances");

    // 4. Build kitchen model
    const { buildKitchenModel } = await import("../src/kitchen/build-kitchen-model.js");
    const modelResult = buildKitchenModel(reviewedBrief.brief);
    assert.equal(modelResult.ok, true, `Model: ${modelResult.error}`);
    assert.equal(modelResult.model.layout, "l");
    assert.equal(modelResult.model.readiness, "execution_ready");
    assert.equal(modelResult.model.walls.length, 2);
    assert.ok(modelResult.model.baseModules.length >= 2);
    assert.ok(modelResult.model.wallModules.length >= 1);
    console.log(`  ✓ Step 3: Kitchen model ready — ${modelResult.model.baseModules.length} base, ${modelResult.model.wallModules.length} wall, ${modelResult.model.applianceBlocks.length} appliances`);

    // 5. Build kitchen furniture model
    const { buildKitchenFurnitureModel } = await import("../src/sketchup/kitchen-furniture-model.js");
    const furnResult = buildKitchenFurnitureModel(modelResult.model, { orderId: 99 });
    assert.equal(furnResult.ok, true);
    assert.equal(furnResult.model.furnitureType, "kitchen");
    assert.equal(furnResult.model.readyForSketchUp, true);
    assert.equal(furnResult.model.kitchenEnvelope.primaryRunMm, 3000);
    assert.equal(furnResult.model.kitchenEnvelope.secondaryRunMm, 2100);
    assert.equal(furnResult.model.kitchenEnvelope.layout, "l");
    console.log("  ✓ Step 4: Furniture model — kitchen, envelope 3000+2100mm");

    // 6. Build kitchen command plan
    const { buildKitchenCommandPlan, validateKitchenCommandPlan } = await import("../src/sketchup/kitchen-command-plan.js");
    const planResult = buildKitchenCommandPlan(furnResult.model);
    assert.equal(planResult.ok, true);
    assert.equal(planResult.plan.planVersion, "kitchen-command-plan/v1");
    const placeCommands = planResult.plan.commands.filter((c) => c.type === "place_block_module" || c.type === "place_block_appliance");
    assert.ok(placeCommands.length >= 5, `Expected 5+ place commands, got ${placeCommands.length}`);
    console.log(`  ✓ Step 5: Command plan — ${planResult.plan.commands.length} commands total`);

    // 7. Validate command plan
    const validation = validateKitchenCommandPlan(planResult.plan);
    assert.equal(validation.ok, true, `Validation: ${validation.message}`);
    console.log("  ✓ Step 6: Command plan validated — all types, payloads, and kinds allowed");

    // 8. Wrap in node job and verify dry-run
    const { buildSketchUpNodeJob } = await import("../src/sketchup/node-job.js");
    const { signSketchUpNodeJob } = await import("../src/sketchup/node-auth.js");
    const { handleFakeSketchUpNodeJob, buildDryRunSummary } = await import("../src/sketchup/fake-node.js");

    // Build a standard command plan for node-job (kitchen plan routing through existing pipeline)
    // Kitchen plan is accepted by dry-run summary directly
    const drySummary = buildDryRunSummary(planResult.plan);
    assert.equal(drySummary.planVersion, "kitchen-command-plan/v1");
    assert.equal(drySummary.furnitureType, "kitchen");
    assert.equal(drySummary.kitchenSummary.layout, "l");
    assert.equal(drySummary.kitchenSummary.baseModuleCount, modelResult.model.baseModules.length);
    assert.equal(drySummary.kitchenSummary.wallModuleCount, modelResult.model.wallModules.length);
    assert.equal(drySummary.kitchenSummary.applianceCount, modelResult.model.applianceBlocks.length);
    assert.equal(drySummary.executable, undefined);
    assert.equal(drySummary.script, undefined);
    console.log("  ✓ Step 7: Dry-run summary — safe, no executable code");

    // 9. Full pipeline passes through existing signed node-job (standard plan)
    const { buildSketchUpCommandPlan } = await import("../src/sketchup/command-plan.js");
    const stdPlan = buildSketchUpCommandPlan({
      modelVersion: "furniture-model/v1",
      source: { orderId: 99, recognitionId: 1 },
      furnitureType: "kitchen",
      overall: { width: 3000, height: 2700, depth: 2100 },
      components: modelResult.model.baseModules.map((m, i) => ({ id: `c${i}`, label: m.kind })),
      materials: [],
      notes: [],
      warnings: [],
      readyForSketchUp: true
    }).plan;

    const jobResult = buildSketchUpNodeJob(stdPlan, { jobId: "kitchen-review-smoke-001", ttlMs: 300000 });
    assert.equal(jobResult.ok, true);
    const signed = await signSketchUpNodeJob(jobResult.job, "test-secret-that-is-long-enough-for-hmac-smoke-2026");
    assert.equal(signed.ok, true);

    const store = new Map();
    const nodeResult = await handleFakeSketchUpNodeJob(signed.job, {
      signingSecret: "test-secret-that-is-long-enough-for-hmac-smoke-2026",
      hasIdempotencyKey: async (k) => store.has(k),
      markIdempotencyKey: async (k, v) => store.set(k, v)
    });
    assert.equal(nodeResult.status, "accepted");
    assert.equal(nodeResult.dryRun, true);
    console.log("  ✓ Step 8: Signed node job → fake node accepted (dry-run)");

    console.log("\n  ✓✓ Kitchen manager review flow complete: order → inferred → manager reviewed → model → plan → signed → dry-run");
  });
});
