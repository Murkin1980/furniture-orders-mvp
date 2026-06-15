import test from "node:test";
import assert from "node:assert/strict";
import {
  getOcrRecognitionViewModel, getOrderAiViewModel, getOrderCrmViewModel,
  parseOcrReviewJson, parseOrderAiMissingInfo
} from "../public/admin-orders.js";

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

test("builds OCR review view model with preview and explicit draft state", () => {
  const view = getOcrRecognitionViewModel({
    id: 4, status: "draft", imageSource: "/media/sketch.webp",
    result: { furnitureType: "wardrobe", documentType: "furniture_sketch", rawText: "2400", warnings: ["Check depth"], missingInfo: ["depth"], confidence: 0.8 }
  });
  assert.equal(view.canPreviewImage, true);
  assert.equal(view.status, "draft");
  assert.equal(view.canDelete, true);
  assert.deepEqual(view.warnings, ["Check depth"]);
  assert.match(view.editableJson, /wardrobe/);
});

test("deleted OCR record no longer exposes deletion action", () => {
  assert.equal(getOcrRecognitionViewModel({ status: "deleted" }).canDelete, false);
});

test("OCR review JSON parser rejects invalid and array input", () => {
  assert.equal(parseOcrReviewJson('{"furnitureType":"kitchen"}').furnitureType, "kitchen");
  assert.throws(() => parseOcrReviewJson("{bad"), /valid JSON object/);
  assert.throws(() => parseOcrReviewJson("[]"), /valid JSON object/);
});
