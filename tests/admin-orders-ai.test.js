import test from "node:test";
import assert from "node:assert/strict";
import {
  getOcrRecognitionViewModel, getOrderAiViewModel, getOrderCrmViewModel,
  getOrderRenderArtifactsSummary, getOrderRenderArtifactViewModel,
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

test("builds render artifact view model for admin order surface", () => {
  const view = getOrderRenderArtifactViewModel({
    id: 3,
    jobId: "job-render-001",
    status: "ready",
    primaryStorageKey: "sketchup/orders/8/job-render-001/render/file-1.webp",
    modelStorageKey: "sketchup/orders/8/job-render-001/model/file-1.skp",
    reportedBy: "node-service",
    updatedAt: "2026-06-24T12:00:00.000Z",
    manifest: {
      summary: { modelIncluded: true, renderCount: 1, previewCount: 0 },
      files: [
        { role: "render", mediaType: "image/webp", storageKey: "sketchup/orders/8/job-render-001/render/file-1.webp", bytes: 2048 }
      ]
    }
  });

  assert.equal(view.hasArtifact, true);
  assert.equal(view.summary.modelIncluded, true);
  assert.equal(view.summary.renderCount, 1);
  assert.equal(view.files[0].role, "render");
});

test("summarizes render artifacts safely", () => {
  const summary = getOrderRenderArtifactsSummary([
    { jobId: "job-render-001", primaryStorageKey: "render.webp", manifest: { summary: { renderCount: 2 } } },
    { jobId: "job-render-002", modelStorageKey: "model.skp", manifest: { summary: { modelIncluded: true, previewCount: 1 } } },
    {}
  ]);

  assert.equal(summary.hasArtifacts, true);
  assert.equal(summary.count, 2);
  assert.equal(summary.renderCount, 2);
  assert.equal(summary.previewCount, 1);
  assert.equal(summary.modelIncluded, true);
});
