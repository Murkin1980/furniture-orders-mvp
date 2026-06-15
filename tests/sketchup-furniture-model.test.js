import test from "node:test";
import assert from "node:assert/strict";
import {
  FURNITURE_MODEL_VERSION,
  buildFurnitureModelFromRecognition,
  getDefaultFurnitureModel
} from "../src/sketchup/furniture-model.js";

test("rejects recognition that is not manager approved", () => {
  const result = buildFurnitureModelFromRecognition({ status: "draft", result: recognitionResult() });
  assert.equal(result.ok, false);
  assert.equal(result.error, "recognition_not_approved");
  assert.deepEqual(result.model, getDefaultFurnitureModel());
});

test("requires reviewer audit on approved recognition", () => {
  const result = buildFurnitureModelFromRecognition({
    status: "approved",
    result: recognitionResult()
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "approval_audit_required");
});

test("requires traceable order and recognition IDs", () => {
  const record = approvedRecord();
  delete record.id;
  const result = buildFurnitureModelFromRecognition(record);
  assert.equal(result.ok, false);
  assert.equal(result.error, "source_audit_required");
});

test("maps approved overall dimensions into millimeters", () => {
  const result = buildFurnitureModelFromRecognition(approvedRecord());
  assert.equal(result.ok, true);
  assert.equal(result.model.modelVersion, FURNITURE_MODEL_VERSION);
  assert.deepEqual(result.model.overall, { width: 2400, height: 2600, depth: 600 });
  assert.equal(result.model.readyForSketchUp, true);
});

test("supports known aliases and unit conversion without guessing", () => {
  const record = approvedRecord({
    dimensions: [
      dimension("total_width", 2.4, "m", 0.9),
      dimension("overall_height", 260, "cm", 0.8),
      dimension("overall_depth", 23.62, "in", 0.7),
      dimension("shelf_gap", 40, "pixels", 1)
    ]
  });
  const result = buildFurnitureModelFromRecognition(record);
  assert.deepEqual(result.model.overall, { width: 2400, height: 2600, depth: 599.95 });
  assert.equal(result.model.measurements.length, 3);
  assert.equal(result.model.warnings.some((warning) => warning.includes("unknown")), true);
});

test("unknown unit on overall dimension creates warning and blocks readiness", () => {
  const record = approvedRecord({
    dimensions: [
      dimension("width", 2400, "unknown", 1),
      dimension("height", 2600, "mm", 1),
      dimension("depth", 600, "mm", 1)
    ]
  });
  const result = buildFurnitureModelFromRecognition(record);
  assert.equal(result.model.overall.width, null);
  assert.equal(result.model.readyForSketchUp, false);
  assert.match(result.model.warnings.at(-1), /unit is unknown/);
});

test("higher-confidence duplicate dimension wins", () => {
  const record = approvedRecord({
    dimensions: [
      dimension("width", 2300, "mm", 0.4),
      dimension("overall_width", 2400, "mm", 0.9),
      dimension("height", 2600, "mm", 1),
      dimension("depth", 600, "mm", 1)
    ]
  });
  const result = buildFurnitureModelFromRecognition(record);
  assert.equal(result.model.overall.width, 2400);
  assert.match(result.model.warnings.at(-1), /replaced/);
});

test("components remain semantic labels and do not invent geometry", () => {
  const result = buildFurnitureModelFromRecognition(approvedRecord());
  assert.deepEqual(result.model.components, [
    { id: "component-1", label: "sliding doors" },
    { id: "component-2", label: "shelves" }
  ]);
  assert.equal(JSON.stringify(result.model.components).includes("position"), false);
});

test("unknown furniture type is normalized without inventing a model type", () => {
  const result = buildFurnitureModelFromRecognition(approvedRecord({ furnitureType: "spaceship" }));
  assert.equal(result.model.furnitureType, "other");
  assert.match(result.model.warnings.at(-1), /normalized to other/);
});

test("preserves source approval audit and does not mutate input", () => {
  const record = approvedRecord();
  const snapshot = structuredClone(record);
  const result = buildFurnitureModelFromRecognition(record);
  assert.deepEqual(result.model.source, {
    orderId: 8,
    recognitionId: 1,
    approvedBy: "manager-1",
    approvedAt: "2026-06-15T12:00:00Z"
  });
  assert.deepEqual(record, snapshot);
});

function approvedRecord(overrides = {}) {
  return {
    id: 1,
    orderId: 8,
    status: "approved",
    reviewedBy: "manager-1",
    reviewedAt: "2026-06-15T12:00:00Z",
    result: { ...recognitionResult(), ...overrides }
  };
}

function recognitionResult() {
  return {
    furnitureType: "wardrobe",
    dimensions: [
      dimension("overall_width", 2400, "mm", 0.9),
      dimension("overall_height", 2600, "mm", 0.9),
      dimension("overall_depth", 600, "mm", 0.9)
    ],
    components: ["sliding doors", "shelves"],
    materials: ["MDF"],
    notes: ["Confirm interior layout"],
    warnings: [],
    missingInfo: []
  };
}

function dimension(label, value, unit, confidence) {
  return { label, value, unit, confidence, sourceText: String(value) };
}
