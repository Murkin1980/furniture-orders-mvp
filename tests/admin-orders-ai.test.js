import test from "node:test";
import assert from "node:assert/strict";
import { getOrderAiViewModel, getOrderCrmViewModel, parseOrderAiMissingInfo } from "../public/admin-orders.js";

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

test("builds CRM view model for manual sync", () => {
  const view = getOrderCrmViewModel({
    crmSyncStatus: "success",
    crmPersonId: "person-1",
    crmSyncedAt: "2026-06-12T10:00:00.000Z"
  });

  assert.equal(view.hasSync, true);
  assert.equal(view.buttonLabel, "Повторить отправку в CRM");
  assert.equal(view.personId, "person-1");
});

test("builds safe empty CRM view model", () => {
  const view = getOrderCrmViewModel({});
  assert.equal(view.hasSync, false);
  assert.equal(view.buttonLabel, "Отправить в CRM");
});
