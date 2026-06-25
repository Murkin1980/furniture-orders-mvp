import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeHermesResult, getDefaultHermesResult } from "../src/agents/hermes-result.js";

describe("normalizeHermesResult", () => {
  it("returns default for nullish input", () => {
    assert.deepEqual(normalizeHermesResult(null), getDefaultHermesResult());
    assert.deepEqual(normalizeHermesResult(undefined), getDefaultHermesResult());
  });

  it("returns default for non-object input", () => {
    assert.deepEqual(normalizeHermesResult("invalid"), getDefaultHermesResult());
    assert.deepEqual(normalizeHermesResult(123), getDefaultHermesResult());
    assert.deepEqual(normalizeHermesResult([]), getDefaultHermesResult());
  });

  it("returns default when schemaVersion is not 1", () => {
    assert.deepEqual(normalizeHermesResult({ schemaVersion: 2 }), getDefaultHermesResult());
    assert.deepEqual(normalizeHermesResult({ schemaVersion: 0 }), getDefaultHermesResult());
  });

  it("returns default when schemaVersion is missing", () => {
    assert.deepEqual(normalizeHermesResult({}), getDefaultHermesResult());
  });

  it("forces requiresHumanApproval to true even if false", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      requiresHumanApproval: false
    });
    assert.equal(result.requiresHumanApproval, true);
  });

  it("normalizes a valid complete response", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      requiresHumanApproval: true,
      summary: "Клиент хочет кухню",
      furnitureType: "kitchen",
      leadTemperature: "warm",
      missingInfo: ["ширина стены", "высота потолка"],
      nextQuestion: "Пришлите ширину стены",
      replyDraft: "Здравствуйте! Пришлите ширину стены.",
      warnings: []
    });

    assert.equal(result.schemaVersion, 1);
    assert.equal(result.requiresHumanApproval, true);
    assert.equal(result.summary, "Клиент хочет кухню");
    assert.equal(result.furnitureType, "kitchen");
    assert.equal(result.leadTemperature, "warm");
    assert.deepEqual(result.missingInfo, ["ширина стены", "высота потолка"]);
    assert.equal(result.nextQuestion, "Пришлите ширину стены");
    assert.equal(result.replyDraft, "Здравствуйте! Пришлите ширину стены.");
    assert.deepEqual(result.warnings, []);
  });

  it("ignores unknown fields", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      unknownField: "should be ignored",
      anotherUnknown: 42
    });
    assert.equal(result.unknownField, undefined);
    assert.equal(result.anotherUnknown, undefined);
    assert.equal(result.schemaVersion, 1);
  });

  it("normalizes furnitureType to fallback when unknown", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      furnitureType: "spaceship"
    });
    assert.equal(result.furnitureType, "other");
  });

  it("normalizes leadTemperature to fallback when unknown", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      leadTemperature: "unknown"
    });
    assert.equal(result.leadTemperature, "neutral");
  });

  it("normalizes missingInfo as array", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      missingInfo: ["info1", "", "info2"]
    });
    assert.deepEqual(result.missingInfo, ["info1", "info2"]);
  });

  it("normalizes missingInfo string into array", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      missingInfo: "single info"
    });
    assert.deepEqual(result.missingInfo, ["single info"]);
  });

  it("handles empty missingInfo", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      missingInfo: []
    });
    assert.deepEqual(result.missingInfo, []);
  });

  it("handles warnings array", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1,
      warnings: ["low confidence", "check budget"]
    });
    assert.deepEqual(result.warnings, ["low confidence", "check budget"]);
  });

  it("provides safe defaults for missing optional fields", () => {
    const result = normalizeHermesResult({
      schemaVersion: 1
    });
    assert.equal(result.summary, "");
    assert.equal(result.furnitureType, "other");
    assert.equal(result.leadTemperature, "neutral");
    assert.deepEqual(result.missingInfo, []);
    assert.equal(result.nextQuestion, "");
    assert.equal(result.replyDraft, "");
    assert.deepEqual(result.warnings, []);
  });

  it("does not mutate input", () => {
    const input = { schemaVersion: 1, furnitureType: "kitchen" };
    const frozen = Object.freeze({ ...input });
    normalizeHermesResult(frozen);
  });
});
