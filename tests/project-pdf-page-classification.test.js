import test from "node:test";
import assert from "node:assert/strict";

import { buildProjectPdfManifest } from "../src/pdf/project-pdf-manifest.js";
import {
  buildPdfPageClassificationPrompt,
  getDefaultPdfPageClassificationResult,
  mergePageClassificationsIntoManifest,
  parsePdfPageClassificationResponse
} from "../src/pdf/page-classification.js";

const manifest = buildProjectPdfManifest({
  fileName: "designer.pdf",
  pages: [
    { pageNumber: 1, pageType: "unknown" },
    { pageNumber: 2, pageType: "unknown" }
  ]
});

test("builds a furniture-first page classification prompt", () => {
  const prompt = buildPdfPageClassificationPrompt(manifest, [
    { pageNumber: 1, textExcerpt: "План кухни и шкафов" }
  ], { projectContext: "Apartment furniture", language: "ru" });

  assert.match(prompt, /PDF дизайн-проекта/);
  assert.match(prompt, /классифицировать страницы/);
  assert.match(prompt, /floor_plan/);
  assert.match(prompt, /kitchens/);
  assert.match(prompt, /wardrobes/);
  assert.match(prompt, /Project context: Apartment furniture/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("prompt supports empty inputs without undefined or null text", () => {
  const prompt = buildPdfPageClassificationPrompt({}, [], {});

  assert.match(prompt, /Не указано/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("parses clean classification JSON", () => {
  const result = parsePdfPageClassificationResponse(JSON.stringify({
    documentSummary: "Furniture project",
    pages: [
      {
        pageNumber: 1,
        pageType: "floor_plan",
        confidence: 0.75,
        roomLabel: "Kitchen",
        furnitureEvidence: ["kitchen cabinets"],
        missingInfo: ["dimensions"],
        warnings: ["low text quality"]
      }
    ]
  }), manifest);

  assert.equal(result.schemaVersion, "project-pdf-page-classification/v1");
  assert.equal(result.pages[0].pageType, "floor_plan");
  assert.equal(result.pages[0].confidence, 0.75);
  assert.deepEqual(result.pages[0].missingInfo, ["dimensions"]);
});

test("parses JSON inside markdown code fence", () => {
  const result = parsePdfPageClassificationResponse(`\`\`\`json
{"pages":[{"pageNumber":2,"pageType":"visualization","confidence":0.8}]}
\`\`\``, manifest);

  assert.equal(result.pages[0].pageNumber, 2);
  assert.equal(result.pages[0].pageType, "visualization");
});

test("normalizes unknown page type and clamps confidence", () => {
  const result = parsePdfPageClassificationResponse(JSON.stringify({
    pages: [{ pageNumber: 1, pageType: "render", confidence: 4 }]
  }), manifest);

  assert.equal(result.pages[0].pageType, "unknown");
  assert.equal(result.pages[0].confidence, 1);
});

test("invalid JSON and missing pages return default", () => {
  assert.deepEqual(parsePdfPageClassificationResponse("{bad", manifest), getDefaultPdfPageClassificationResult());
  assert.deepEqual(parsePdfPageClassificationResponse(JSON.stringify({ documentSummary: "x" }), manifest), getDefaultPdfPageClassificationResult());
});

test("ignores pages outside the manifest page set", () => {
  const result = parsePdfPageClassificationResponse(JSON.stringify({
    pages: [
      { pageNumber: 99, pageType: "floor_plan", confidence: 1 },
      { pageNumber: 1, pageType: "text", confidence: 0.5 }
    ]
  }), manifest);

  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].pageNumber, 1);
});

test("merges classifications into manifest without mutating input", () => {
  const before = structuredClone(manifest);
  const classification = parsePdfPageClassificationResponse(JSON.stringify({
    pages: [{ pageNumber: 1, pageType: "elevation", confidence: 0.7, roomLabel: "Wardrobe", missingInfo: "height" }],
    warnings: ["review manually"]
  }), manifest);
  const merged = mergePageClassificationsIntoManifest(manifest, classification);

  assert.deepEqual(manifest, before);
  assert.equal(merged.pages[0].pageType, "elevation");
  assert.equal(merged.pages[0].roomLabel, "Wardrobe");
  assert.deepEqual(merged.pages[0].missingInfo, ["height"]);
  assert.deepEqual(merged.warnings, ["review manually"]);
});
