import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildKitchenNodeJob } from "../src/sketchup/kitchen-job-bridge.js";

describe("buildKitchenNodeJob", () => {
  it("rejects invalid kitchen model", () => {
    const r = buildKitchenNodeJob(null);
    assert.equal(r.ok, false);
    assert.ok(r.error);
  });

  it("rejects kitchen model not ready for SketchUp", () => {
    const r = buildKitchenNodeJob({
      layout: "straight", readiness: "draft",
      roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 },
      walls: [{ id: "a", lengthMm: 3000 }],
      baseModules: []
    }, { orderId: 99 });
    assert.equal(r.ok, false);
    assert.ok(r.message.includes("not ready"));
  });

  it("builds signed node job from execution-ready kitchen model", () => {
    const r = buildKitchenNodeJob({
      layout: "straight", readiness: "execution_ready",
      roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 },
      walls: [{ id: "a", lengthMm: 3000 }],
      baseModules: [{ id: "b1", wall: "a", kind: "sink-base", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 560 }],
      wallModules: [],
      applianceBlocks: []
    }, { orderId: 42, jobId: "kitchen-bridge-001", ttlMs: 300000 });

    assert.equal(r.ok, true, `Bridge failed: ${r.message}`);
    assert.ok(r.job);
    assert.equal(r.job.jobId, "kitchen-bridge-001");
    assert.equal(r.job.source.orderId, 42);
    assert.equal(r.job.payload.commandPlan.planVersion, "sketchup-command-plan/v1");
    assert.ok(r.kitchenPlan);
    assert.equal(r.kitchenPlan.planVersion, "kitchen-command-plan/v1");
    assert.ok(r.kitchenPlan.commands.length >= 1);
  });

  it("preserves kitchen plan in kitchenPayload", () => {
    const r = buildKitchenNodeJob({
      layout: "straight", readiness: "execution_ready",
      roomEnvelope: { wallAmm: 3000, ceilingHeightMm: 2700 },
      walls: [{ id: "a", lengthMm: 3000 }],
      baseModules: [{ id: "b1", wall: "a", kind: "sink-base", xMm: 0, widthMm: 800, heightMm: 720, depthMm: 560 }],
      wallModules: [],
      applianceBlocks: []
    }, { orderId: 99 });

    assert.ok(r.job.payload.commandPlan.kitchenPayload);
    assert.equal(r.job.payload.commandPlan.kitchenPayload.planVersion, "kitchen-command-plan/v1");
  });
});
