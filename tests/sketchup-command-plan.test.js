import test from "node:test";
import assert from "node:assert/strict";
import {
  SKETCHUP_COMMAND_PLAN_VERSION,
  SKETCHUP_COMMAND_TYPES,
  buildSketchUpCommandPlan,
  getDefaultSketchUpCommandPlan,
  validateSketchUpCommandPlan
} from "../src/sketchup/command-plan.js";

test("builds a versioned allowlisted command plan", () => {
  const result = buildSketchUpCommandPlan(readyModel());
  assert.equal(result.ok, true);
  assert.equal(result.plan.planVersion, SKETCHUP_COMMAND_PLAN_VERSION);
  assert.deepEqual(result.plan.commands.map(({ type }) => type), SKETCHUP_COMMAND_TYPES);
  assert.equal(result.plan.readyForExecution, true);
});

test("creates only a confirmed overall envelope", () => {
  const result = buildSketchUpCommandPlan(readyModel());
  assert.deepEqual(result.plan.commands[1], {
    type: "create_envelope",
    dimensions: { widthMm: 2400, heightMm: 2600, depthMm: 600 }
  });
});

test("keeps components as metadata without geometry", () => {
  const result = buildSketchUpCommandPlan(readyModel());
  const metadata = result.plan.commands[2];
  assert.deepEqual(metadata.components, ["doors", "shelves"]);
  assert.equal(JSON.stringify(metadata).includes("position"), false);
  assert.match(result.plan.warnings.at(-1), /metadata only/);
});

test("rejects an unsupported furniture model version", () => {
  const result = buildSketchUpCommandPlan({ ...readyModel(), modelVersion: "furniture-model/v2" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "unsupported_model_version");
  assert.deepEqual(result.plan, getDefaultSketchUpCommandPlan());
});

test("rejects a model that is not ready", () => {
  const result = buildSketchUpCommandPlan({ ...readyModel(), readyForSketchUp: false });
  assert.equal(result.ok, false);
  assert.equal(result.error, "model_not_ready");
});

test("rejects invalid overall dimensions even when readiness flag is true", () => {
  const result = buildSketchUpCommandPlan({
    ...readyModel(),
    overall: { width: 2400, height: 2600, depth: null }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_overall_dimensions");
});

test("requires traceable source audit", () => {
  const result = buildSketchUpCommandPlan({
    ...readyModel(),
    source: { orderId: 8, recognitionId: null }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "source_audit_required");
});

test("validator rejects arbitrary command types", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.commands[1] = { type: "execute_ruby", code: "dangerous" };
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "command_not_allowed" });
});

test("validator rejects extra executable metadata fields", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.commands[2].script = "dangerous";
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "invalid_metadata_command" });
});

test("validator rejects extra fields in geometry commands", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.commands[1].script = "dangerous";
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "invalid_envelope_command" });
});

test("validator requires source audit", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.source.recognitionId = null;
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "source_audit_required" });
});

test("validator rejects extra top-level executable fields", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.script = "dangerous";
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "invalid_plan_shape" });
});

test("validator rejects non-string metadata values", () => {
  const plan = buildSketchUpCommandPlan(readyModel()).plan;
  plan.commands[2].components = [{ code: "dangerous" }];
  assert.deepEqual(validateSketchUpCommandPlan(plan), { ok: false, error: "invalid_metadata_command" });
});

test("does not mutate the furniture model", () => {
  const model = readyModel();
  const snapshot = structuredClone(model);
  buildSketchUpCommandPlan(model);
  assert.deepEqual(model, snapshot);
});

function readyModel() {
  return {
    modelVersion: "furniture-model/v1",
    source: { orderId: 8, recognitionId: 1 },
    furnitureType: "wardrobe",
    overall: { width: 2400, height: 2600, depth: 600 },
    components: [
      { id: "component-1", label: "doors" },
      { id: "component-2", label: "shelves" }
    ],
    materials: ["MDF"],
    notes: ["Confirm interior layout"],
    warnings: ["Manager review complete"],
    readyForSketchUp: true
  };
}
