import test from "node:test";
import assert from "node:assert/strict";
import { buildSketchUpCommandPlan } from "../src/sketchup/command-plan.js";
import { buildComponentPlacementPlan, normalizeComponentCatalog } from "../src/sketchup/component-catalog.js";
import {
  SKETCHUP_EXECUTION_PACKAGE_VERSION,
  buildSketchUpExecutionPackage,
  validateSketchUpExecutionPackage
} from "../src/sketchup/execution-package.js";

test("builds a versioned execution package", () => {
  const commandPlan = readyCommandPlan();
  const componentPlacement = readyPlacement(commandPlan);
  const result = buildSketchUpExecutionPackage(commandPlan, { componentPlacement });

  assert.equal(result.ok, true);
  assert.equal(result.package.packageVersion, SKETCHUP_EXECUTION_PACKAGE_VERSION);
  assert.deepEqual(result.package.source, {
    orderId: 8,
    recognitionId: 1,
    planVersion: "sketchup-command-plan/v1",
    modelVersion: "furniture-model/v1"
  });
  assert.equal(result.package.readyForLocalAdapter, true);
  assert.deepEqual(validateSketchUpExecutionPackage(result.package), { ok: true, error: "" });
});

test("rejects invalid command plans", () => {
  const commandPlan = readyCommandPlan();
  commandPlan.commands.push({ type: "execute_ruby" });

  const result = buildSketchUpExecutionPackage(commandPlan, {});

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_command_plan");
});

test("validates source mismatch between package and command plan", () => {
  const result = buildSketchUpExecutionPackage(readyCommandPlan(), {
    componentPlacement: readyPlacement(readyCommandPlan())
  });
  result.package.source.orderId = 9;

  assert.deepEqual(validateSketchUpExecutionPackage(result.package), {
    ok: false,
    error: "source_mismatch"
  });
});

test("validates component placement source mismatch", () => {
  const commandPlan = readyCommandPlan();
  const componentPlacement = readyPlacement(commandPlan);
  componentPlacement.source.recognitionId = 2;

  const result = buildSketchUpExecutionPackage(commandPlan, { componentPlacement });

  assert.equal(result.package.componentPlacement.source.recognitionId, 1);
  assert.match(result.package.componentPlacement.warnings.join("\n"), /No catalog component matched/);
});

test("builds placement from catalog when explicit placement is absent", () => {
  const result = buildSketchUpExecutionPackage(readyCommandPlan(), {
    componentCatalog: {
      components: [
        { id: "door-001", label: "Door", aliases: ["doors"], source: "easykitchen", adapterKey: "easykitchen/door" }
      ]
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.package.componentPlacement.placements[0].componentId, "door-001");
  assert.equal(result.package.componentPlacement.readyForSketchUpAdapter, true);
});

test("does not mutate command plan or placement", () => {
  const commandPlan = readyCommandPlan();
  const componentPlacement = readyPlacement(commandPlan);
  const commandSnapshot = structuredClone(commandPlan);
  const placementSnapshot = structuredClone(componentPlacement);

  buildSketchUpExecutionPackage(commandPlan, { componentPlacement });

  assert.deepEqual(commandPlan, commandSnapshot);
  assert.deepEqual(componentPlacement, placementSnapshot);
});

function readyCommandPlan() {
  return buildSketchUpCommandPlan({
    modelVersion: "furniture-model/v1",
    source: { orderId: 8, recognitionId: 1 },
    furnitureType: "wardrobe",
    overall: { width: 2400, height: 2600, depth: 600 },
    components: [{ id: "component-1", label: "doors" }],
    materials: ["MDF"],
    notes: [],
    warnings: [],
    readyForSketchUp: true
  }).plan;
}

function readyPlacement(commandPlan) {
  const catalog = normalizeComponentCatalog({
    components: [
      { id: "door-001", label: "Door", aliases: ["doors"], source: "easykitchen", adapterKey: "easykitchen/door" }
    ]
  });
  return buildComponentPlacementPlan({
    modelVersion: commandPlan.sourceModelVersion,
    source: commandPlan.source,
    components: commandPlan.commands.find((command) => command.type === "attach_metadata").components
  }, catalog);
}
