import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectPdfManifest,
  getDefaultProjectPdfManifest,
  isSupportedPdfFile,
  validateProjectPdfManifest
} from "../src/pdf/project-pdf-manifest.js";

test("builds a PDF manifest from metadata and pages", () => {
  const manifest = buildProjectPdfManifest({
    orderId: 12,
    fileName: "designer-project.pdf",
    fileSizeBytes: 2048,
    pages: [
      {
        pageNumber: 1,
        pageType: "floor_plan",
        confidence: 0.8,
        furnitureZones: [{ type: "kitchen", label: "Kitchen zone", sourcePage: 1 }]
      }
    ]
  });

  assert.equal(manifest.manifestVersion, "project-pdf-manifest/v1");
  assert.equal(manifest.document.orderId, 12);
  assert.equal(manifest.pageCount, 1);
  assert.equal(manifest.pages[0].pageType, "floor_plan");
  assert.equal(manifest.pages[0].furnitureZones[0].zoneType, "kitchen");
});

test("generates unknown page records from pageCount", () => {
  const manifest = buildProjectPdfManifest({ fileName: "room.pdf", pageCount: 2 });

  assert.equal(manifest.pageCount, 2);
  assert.deepEqual(manifest.pages.map((page) => page.pageNumber), [1, 2]);
  assert.deepEqual(manifest.pages.map((page) => page.pageType), ["unknown", "unknown"]);
});

test("validates PDF file name and page count", () => {
  const invalid = validateProjectPdfManifest({ fileName: "project.png", pageCount: 0 });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.field === "document.fileName"));
  assert.ok(invalid.errors.some((error) => error.field === "pageCount"));

  const valid = validateProjectPdfManifest({ fileName: "project.pdf", pageCount: 1 });
  assert.equal(valid.ok, true);
});

test("normalizes page type, confidence, rotation and dimensions safely", () => {
  const manifest = buildProjectPdfManifest({
    fileName: "project.pdf",
    pages: [{
      pageType: "mystery",
      confidence: 3,
      rotation: 17,
      widthMm: "900",
      heightMm: "-1"
    }]
  });

  assert.equal(manifest.pages[0].pageType, "unknown");
  assert.equal(manifest.pages[0].confidence, 1);
  assert.equal(manifest.pages[0].rotation, 0);
  assert.equal(manifest.pages[0].widthMm, 900);
  assert.equal(manifest.pages[0].heightMm, null);
});

test("normalizes furniture zones without inventing missing dimensions", () => {
  const manifest = buildProjectPdfManifest({
    fileName: "project.pdf",
    pages: [{
      pageType: "elevation",
      furnitureZones: [{
        type: "wardrobe",
        dimensions: { widthMm: 2400 },
        materials: "MDF",
        missingInfo: "depth"
      }]
    }]
  });

  const zone = manifest.pages[0].furnitureZones[0];
  assert.equal(zone.zoneType, "wardrobe");
  assert.equal(zone.dimensions.widthMm, 2400);
  assert.equal(zone.dimensions.heightMm, null);
  assert.deepEqual(zone.materials, ["MDF"]);
  assert.deepEqual(zone.missingInfo, ["depth"]);
});

test("handles empty or malformed input without undefined payload values", () => {
  const input = { fileName: null, pages: ["bad"] };
  const before = structuredClone(input);
  const manifest = buildProjectPdfManifest(input);

  assert.deepEqual(input, before);
  assert.equal(JSON.stringify(manifest).includes("undefined"), false);
  assert.equal(manifest.document.fileName, "");
  assert.equal(manifest.pages[0].pageType, "unknown");
});

test("default manifest and supported file helper are safe", () => {
  const manifest = getDefaultProjectPdfManifest();

  assert.equal(manifest.document.mimeType, "application/pdf");
  assert.equal(isSupportedPdfFile("test.pdf"), true);
  assert.equal(isSupportedPdfFile("test.PDF", "application/pdf"), true);
  assert.equal(isSupportedPdfFile("test.jpg", "image/jpeg"), false);
});
