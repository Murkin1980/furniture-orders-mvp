import test from "node:test";
import assert from "node:assert/strict";
import { getOrderAiViewModel, parseOrderAiMissingInfo } from "../public/admin-orders.js";

test("builds AI view model for analyzed order", () => {
  const view = getOrderAiViewModel({
    aiStatus: "success",
    aiScore: 91,
    aiTemperature: "hot",
    aiFurnitureType: "kitchen",
    aiQualified: 1,
    aiSummary: "Ready for measurement",
    aiNextQuestion: "Confirm dimensions",
    aiMissingInfoJson: '["dimensions","materials"]',
    aiUrgency: "high",
    aiPotentialValue: "high",
    aiRecommendedStatus: "qualified"
  });

  assert.equal(view.buttonLabel, "Повторить AI-анализ");
  assert.equal(view.qualified, true);
  assert.deepEqual(view.missingInfo, ["dimensions", "materials"]);
  assert.equal(view.score, 91);
});

test("builds safe empty AI view model", () => {
  const view = getOrderAiViewModel({});

  assert.equal(view.hasAnalysis, false);
  assert.equal(view.buttonLabel, "AI-анализ");
  assert.deepEqual(view.missingInfo, []);
  assert.equal(view.qualified, false);
});

test("handles malformed missing info without throwing", () => {
  assert.deepEqual(parseOrderAiMissingInfo("dimensions"), ["dimensions"]);
  assert.deepEqual(parseOrderAiMissingInfo(null), []);
});
