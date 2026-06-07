import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultAiResult, parseAiResponse } from "../src/ai/parse-ai-response.js";

const validResult = {
  furnitureType: "kitchen",
  isQualified: true,
  leadScore: 82,
  leadTemperature: "hot",
  missingInfo: ["dimensions"],
  nextQuestion: "What are the wall dimensions?",
  urgency: "high",
  potentialValue: "high",
  recommendedStatus: "qualified",
  ownerSummary: "Ready for measurement."
};

test("parses clean AI JSON", () => {
  assert.deepEqual(parseAiResponse(JSON.stringify(validResult)), validResult);
});

test("parses AI JSON inside json code fence", () => {
  assert.deepEqual(parseAiResponse(`\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\``), validResult);
});

test("parses AI JSON inside plain code fence", () => {
  assert.deepEqual(parseAiResponse(`\`\`\`\n${JSON.stringify(validResult)}\n\`\`\``), validResult);
});

test("clamps leadScore below 1", () => {
  assert.equal(parseAiResponse(JSON.stringify({ ...validResult, leadScore: -20 })).leadScore, 1);
});

test("clamps leadScore above 100", () => {
  assert.equal(parseAiResponse(JSON.stringify({ ...validResult, leadScore: 140 })).leadScore, 100);
});

test("normalizes unknown enum values to safe fallbacks", () => {
  const result = parseAiResponse(JSON.stringify({
    ...validResult,
    furnitureType: "spaceship",
    leadTemperature: "boiling",
    urgency: "now",
    potentialValue: "huge",
    recommendedStatus: "won"
  }));

  assert.equal(result.furnitureType, "other");
  assert.equal(result.leadTemperature, "neutral");
  assert.equal(result.urgency, "low");
  assert.equal(result.potentialValue, "low");
  assert.equal(result.recommendedStatus, "new");
});

test("converts missingInfo string to array", () => {
  const result = parseAiResponse(JSON.stringify({ ...validResult, missingInfo: "budget" }));
  assert.deepEqual(result.missingInfo, ["budget"]);
});

test("returns default for invalid JSON", () => {
  assert.deepEqual(parseAiResponse("{invalid"), getDefaultAiResult());
});

test("returns default for empty content", () => {
  assert.deepEqual(parseAiResponse(""), getDefaultAiResult());
});

test("returns default when a required field is missing", () => {
  const { ownerSummary, ...incomplete } = validResult;
  assert.deepEqual(parseAiResponse(JSON.stringify(incomplete)), getDefaultAiResult());
});

test("returns default when required field format is invalid", () => {
  const invalid = { ...validResult, isQualified: "yes" };
  assert.deepEqual(parseAiResponse(JSON.stringify(invalid)), getDefaultAiResult());
});
