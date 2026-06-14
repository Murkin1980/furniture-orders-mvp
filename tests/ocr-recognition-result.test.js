import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultRecognitionResult, parseRecognitionResult } from "../src/ocr/recognition-result.js";

const validResult = {
  documentType: "furniture_sketch", furnitureType: "kitchen",
  rawText: "Kitchen width 3200 mm",
  dimensions: [{ label: "overall_width", value: 3200, unit: "mm", confidence: 0.91, sourceText: "3200" }],
  components: ["base cabinets"], materials: ["MDF"], notes: ["Check wall angle"],
  warnings: [], missingInfo: ["ceiling height"], confidence: 0.72
};

test("parses valid and fenced recognition JSON", () => {
  assert.deepEqual(parseRecognitionResult(JSON.stringify(validResult)), validResult);
  assert.deepEqual(parseRecognitionResult(`\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``), validResult);
});

test("returns fresh safe defaults for empty, invalid, and incomplete input", () => {
  const first = parseRecognitionResult("");
  const second = parseRecognitionResult("{invalid");
  const { dimensions, ...incomplete } = validResult;
  assert.deepEqual(first, getDefaultRecognitionResult());
  assert.deepEqual(second, getDefaultRecognitionResult());
  assert.deepEqual(parseRecognitionResult(JSON.stringify(incomplete)), getDefaultRecognitionResult());
  assert.notEqual(first.dimensions, second.dimensions);
});

test("normalizes unknown document and furniture types", () => {
  const result = parseRecognitionResult(JSON.stringify({ ...validResult, documentType: "blueprint", furnitureType: "spaceship" }));
  assert.equal(result.documentType, "other");
  assert.equal(result.furnitureType, "other");
});

test("clamps result and dimension confidence", () => {
  const result = parseRecognitionResult(JSON.stringify({
    ...validResult, confidence: 4,
    dimensions: [{ ...validResult.dimensions[0], confidence: -2 }]
  }));
  assert.equal(result.confidence, 1);
  assert.equal(result.dimensions[0].confidence, 0);
});

test("does not guess an unknown dimension unit", () => {
  const result = parseRecognitionResult(JSON.stringify({
    ...validResult, dimensions: [{ ...validResult.dimensions[0], unit: "pixels" }]
  }));
  assert.equal(result.dimensions[0].unit, "unknown");
  assert.match(result.warnings[0], /unknown unit/);
});

test("ignores invalid dimensions and records a warning", () => {
  const result = parseRecognitionResult(JSON.stringify({
    ...validResult, dimensions: [
      { label: "height", value: "not-a-number", unit: "mm" },
      { label: "depth", value: "", unit: "mm" }
    ]
  }));
  assert.deepEqual(result.dimensions, []);
  assert.match(result.warnings[0], /ignored/);
  assert.match(result.warnings[1], /ignored/);
});

test("accepts numeric dimension strings without changing their unit", () => {
  const result = parseRecognitionResult(JSON.stringify({
    ...validResult, dimensions: [{ ...validResult.dimensions[0], value: "3200", unit: "mm" }]
  }));
  assert.equal(result.dimensions[0].value, 3200);
  assert.equal(result.dimensions[0].unit, "mm");
});

test("normalizes list values to non-empty strings", () => {
  const result = parseRecognitionResult(JSON.stringify({
    ...validResult, components: [" cabinet ", "", null, 42],
    materials: [" MDF ", null], notes: [" note ", ""], missingInfo: [" size ", null]
  }));
  assert.deepEqual(result.components, ["cabinet", "42"]);
  assert.deepEqual(result.materials, ["MDF"]);
  assert.deepEqual(result.notes, ["note"]);
  assert.deepEqual(result.missingInfo, ["size"]);
});

test("does not mutate input data", () => {
  const input = structuredClone(validResult);
  const snapshot = structuredClone(input);
  parseRecognitionResult(JSON.stringify(input));
  assert.deepEqual(input, snapshot);
});
