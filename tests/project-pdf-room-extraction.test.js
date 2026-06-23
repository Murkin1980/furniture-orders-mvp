import test from "node:test";
import assert from "node:assert/strict";

import { buildProjectPdfManifest } from "../src/pdf/project-pdf-manifest.js";
import {
  buildPdfRoomExtractionPrompt,
  getDefaultPdfRoomExtractionResult,
  mergePdfRoomExtractionIntoManifest,
  parsePdfRoomExtractionResponse
} from "../src/pdf/room-extraction.js";

const manifest = buildProjectPdfManifest({
  fileName: "designer.pdf",
  pages: [
    { pageNumber: 1, pageType: "floor_plan", roomLabel: "Kitchen" },
    { pageNumber: 2, pageType: "elevation", roomLabel: "Bedroom" }
  ]
});

test("builds a furniture-first room extraction prompt", () => {
  const prompt = buildPdfRoomExtractionPrompt(manifest, [
    { pageNumber: 1, textExcerpt: "Kitchen cabinets 3200 x 600 mm" }
  ], { projectContext: "Apartment furniture", language: "ru" });

  assert.match(prompt, /interior designer PDF/);
  assert.match(prompt, /furniture workshop/);
  assert.match(prompt, /Allowed furniture zone types/);
  assert.match(prompt, /kitchen/);
  assert.match(prompt, /wardrobe/);
  assert.match(prompt, /Project context: Apartment furniture/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("prompt supports empty inputs without undefined or null text", () => {
  const prompt = buildPdfRoomExtractionPrompt({}, [], {});

  assert.match(prompt, /Not specified/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("parses rooms and furniture zones from clean JSON", () => {
  const result = parsePdfRoomExtractionResponse(JSON.stringify({
    rooms: [{ id: "r1", label: "Kitchen", sourcePages: [1], confidence: 0.8 }],
    furnitureZones: [
      {
        id: "z1",
        zoneType: "kitchen",
        label: "Kitchen cabinets",
        roomId: "r1",
        roomLabel: "Kitchen",
        sourcePage: 1,
        confidence: 0.7,
        dimensions: { widthMm: 3200, depthMm: 600 },
        materials: ["MDF"],
        missingInfo: ["height"]
      }
    ]
  }), manifest);

  assert.equal(result.schemaVersion, "project-pdf-room-extraction/v1");
  assert.equal(result.rooms[0].label, "Kitchen");
  assert.equal(result.furnitureZones[0].zoneType, "kitchen");
  assert.equal(result.furnitureZones[0].dimensions.widthMm, 3200);
  assert.deepEqual(result.furnitureZones[0].materials, ["MDF"]);
});

test("parses JSON inside markdown code fence", () => {
  const result = parsePdfRoomExtractionResponse(`\`\`\`json
{"rooms":[{"label":"Wardrobe","sourcePages":[2]}],"furnitureZones":[{"zoneType":"wardrobe","sourcePage":2}]}
\`\`\``, manifest);

  assert.equal(result.rooms[0].label, "Wardrobe");
  assert.equal(result.furnitureZones[0].sourcePage, 2);
});

test("normalizes unknown zone type and clamps confidence", () => {
  const result = parsePdfRoomExtractionResponse(JSON.stringify({
    furnitureZones: [{ zoneType: "sofa", sourcePage: 1, confidence: 5 }]
  }), manifest);

  assert.equal(result.furnitureZones[0].zoneType, "other");
  assert.equal(result.furnitureZones[0].confidence, 1);
});

test("ignores furniture zones outside the manifest page set", () => {
  const result = parsePdfRoomExtractionResponse(JSON.stringify({
    furnitureZones: [
      { zoneType: "kitchen", sourcePage: 99 },
      { zoneType: "wardrobe", sourcePage: 2 }
    ]
  }), manifest);

  assert.equal(result.furnitureZones.length, 1);
  assert.equal(result.furnitureZones[0].sourcePage, 2);
});

test("invalid JSON and empty extraction return default", () => {
  assert.deepEqual(parsePdfRoomExtractionResponse("{bad", manifest), getDefaultPdfRoomExtractionResult());
  assert.deepEqual(parsePdfRoomExtractionResponse(JSON.stringify({ warnings: ["empty"] }), manifest), getDefaultPdfRoomExtractionResult());
});

test("supports snake_case fields", () => {
  const result = parsePdfRoomExtractionResponse(JSON.stringify({
    rooms: [{ room_label: "Hallway", source_pages: [1] }],
    furniture_zones: [{ zone_type: "hallway", source_page: 1, room_label: "Hallway" }]
  }), manifest);

  assert.equal(result.rooms[0].label, "Hallway");
  assert.equal(result.furnitureZones[0].zoneType, "hallway");
});

test("merges room extraction into manifest without mutating input", () => {
  const before = structuredClone(manifest);
  const extraction = parsePdfRoomExtractionResponse(JSON.stringify({
    rooms: [{ id: "r1", label: "Kitchen", sourcePages: [1] }],
    furnitureZones: [{ id: "z1", zoneType: "kitchen", sourcePage: 1, missingInfo: "height" }],
    warnings: ["review dimensions"]
  }), manifest);
  const merged = mergePdfRoomExtractionIntoManifest(manifest, extraction);

  assert.deepEqual(manifest, before);
  assert.equal(merged.rooms[0].label, "Kitchen");
  assert.equal(merged.pages[0].furnitureZones[0].zoneType, "kitchen");
  assert.deepEqual(merged.pages[0].missingInfo, ["height"]);
  assert.deepEqual(merged.warnings, ["review dimensions"]);
});

test("merged zones replace same id and keep existing different zones", () => {
  const source = buildProjectPdfManifest({
    fileName: "designer.pdf",
    pages: [{
      pageNumber: 1,
      furnitureZones: [
        { id: "keep", zoneType: "storage", sourcePage: 1 },
        { id: "replace", zoneType: "other", sourcePage: 1 }
      ]
    }]
  });
  const extraction = parsePdfRoomExtractionResponse(JSON.stringify({
    furnitureZones: [{ id: "replace", zoneType: "wardrobe", sourcePage: 1 }]
  }), source);
  const merged = mergePdfRoomExtractionIntoManifest(source, extraction);

  assert.equal(merged.pages[0].furnitureZones.length, 2);
  assert.equal(merged.pages[0].furnitureZones.find((zone) => zone.id === "replace").zoneType, "wardrobe");
});
