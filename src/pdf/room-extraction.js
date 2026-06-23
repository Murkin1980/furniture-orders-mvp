import { PDF_FURNITURE_ZONE_TYPES } from "./project-pdf-manifest.js";

export const PDF_ROOM_EXTRACTION_VERSION = "project-pdf-room-extraction/v1";

const FURNITURE_ZONE_SET = new Set(PDF_FURNITURE_ZONE_TYPES);

export function getDefaultPdfRoomExtractionResult() {
  return {
    schemaVersion: PDF_ROOM_EXTRACTION_VERSION,
    rooms: [],
    furnitureZones: [],
    missingInfo: [],
    warnings: []
  };
}

export function buildPdfRoomExtractionPrompt(manifest = {}, pageInputs = [], options = {}) {
  const language = cleanText(options.language, "ru");
  const projectContext = cleanText(options.projectContext || options.context);

  return [
    "You analyze an interior designer PDF for a furniture workshop.",
    "Task: furniture-zone extraction and room extraction.",
    "Assume the document is about an apartment, house, office, or commercial furniture project.",
    "Extract only rooms and furniture zones that are visible or explicitly described.",
    "Do not invent dimensions, materials, quantities, prices, rooms, or furniture zones.",
    "If a value is unclear, leave it empty and add missingInfo or warnings.",
    "Return only valid JSON. Do not include markdown or explanations.",
    "",
    "Allowed furniture zone types:",
    ...PDF_FURNITURE_ZONE_TYPES.map((type) => `- ${type}`),
    "",
    "Required JSON schema:",
    JSON.stringify(buildPromptSchema(), null, 2),
    "",
    `Language for short room labels and notes: ${language}`,
    `Project context: ${projectContext || "Not specified"}`,
    "",
    "Classified manifest:",
    JSON.stringify(buildPromptManifest(manifest), null, 2),
    "",
    "Page inputs:",
    JSON.stringify(normalizePageInputs(pageInputs), null, 2)
  ].join("\n");
}

export function parsePdfRoomExtractionResponse(rawContent, manifest = {}) {
  const fallback = getDefaultPdfRoomExtractionResult();
  const source = stripCodeFence(rawContent);
  if (!source) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;

  const expectedPages = getExpectedPageNumbers(manifest);
  const rooms = normalizeRooms(parsed.rooms, expectedPages);
  const furnitureZones = normalizeFurnitureZones(parsed.furnitureZones ?? parsed.furniture_zones, expectedPages);

  if (rooms.length === 0 && furnitureZones.length === 0) return fallback;

  return {
    schemaVersion: PDF_ROOM_EXTRACTION_VERSION,
    rooms,
    furnitureZones,
    missingInfo: normalizeStringArray(parsed.missingInfo ?? parsed.missing_info),
    warnings: normalizeStringArray(parsed.warnings)
  };
}

export function mergePdfRoomExtractionIntoManifest(manifest = {}, extraction = {}) {
  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  const zonesByPage = groupZonesByPage(extraction.furnitureZones);

  return {
    ...manifest,
    rooms: normalizeRooms(extraction.rooms, getExpectedPageNumbers(manifest)),
    pages: pages.map((page, index) => {
      const pageNumber = Number(page.pageNumber) || index + 1;
      const extractedZones = zonesByPage.get(pageNumber) || [];
      return {
        ...page,
        furnitureZones: mergePageZones(page.furnitureZones, extractedZones),
        missingInfo: uniqueStrings([...(page.missingInfo || []), ...collectZoneInfo(extractedZones, "missingInfo")]),
        warnings: uniqueStrings([...(page.warnings || []), ...collectZoneInfo(extractedZones, "warnings")])
      };
    }),
    missingInfo: uniqueStrings([...(manifest.missingInfo || []), ...(extraction.missingInfo || [])]),
    warnings: uniqueStrings([...(manifest.warnings || []), ...(extraction.warnings || [])])
  };
}

function buildPromptSchema() {
  return {
    schemaVersion: PDF_ROOM_EXTRACTION_VERSION,
    rooms: [
      {
        id: "string",
        label: "string",
        sourcePages: ["number"],
        confidence: "number 0..1",
        missingInfo: ["string"],
        warnings: ["string"]
      }
    ],
    furnitureZones: [
      {
        id: "string",
        zoneType: PDF_FURNITURE_ZONE_TYPES.join("|"),
        label: "string",
        roomId: "string",
        roomLabel: "string",
        sourcePage: "number",
        confidence: "number 0..1",
        dimensions: {
          widthMm: "number or omitted",
          heightMm: "number or omitted",
          depthMm: "number or omitted",
          lengthMm: "number or omitted",
          note: "string"
        },
        materials: ["string"],
        missingInfo: ["string"],
        warnings: ["string"]
      }
    ],
    missingInfo: ["string"],
    warnings: ["string"]
  };
}

function buildPromptManifest(manifest) {
  return omitEmpty({
    manifestVersion: cleanText(manifest?.manifestVersion),
    pageCount: Number(manifest?.pageCount) || 0,
    pages: Array.isArray(manifest?.pages)
      ? manifest.pages.map((page, index) => omitEmpty({
        pageNumber: Number(page.pageNumber) || index + 1,
        pageType: cleanText(page.pageType, "unknown"),
        roomLabel: cleanText(page.roomLabel),
        confidence: normalizeConfidence(page.confidence),
        missingInfo: normalizeStringArray(page.missingInfo),
        warnings: normalizeStringArray(page.warnings)
      }))
      : []
  });
}

function normalizePageInputs(pageInputs) {
  const inputs = Array.isArray(pageInputs) ? pageInputs : [];
  return inputs.map((page, index) => omitEmpty({
    pageNumber: Number(page?.pageNumber ?? page?.page_number) || index + 1,
    textExcerpt: limitText(page?.textExcerpt ?? page?.text_excerpt ?? page?.text),
    imageDescription: limitText(page?.imageDescription ?? page?.image_description),
    notes: normalizeStringArray(page?.notes)
  }));
}

function normalizeRooms(value, expectedPages = []) {
  const rooms = Array.isArray(value) ? value : [];
  return rooms.map((room, index) => normalizeRoom(room, index, expectedPages)).filter(Boolean);
}

function normalizeRoom(input, index, expectedPages) {
  if (!isPlainObject(input)) return null;
  const label = cleanText(input.label ?? input.name ?? input.roomLabel ?? input.room_label);
  const sourcePages = normalizeSourcePages(input.sourcePages ?? input.source_pages ?? input.pages, expectedPages);
  if (!label && sourcePages.length === 0) return null;

  return {
    id: cleanText(input.id, `room-${index + 1}`),
    label,
    sourcePages,
    confidence: normalizeConfidence(input.confidence),
    missingInfo: normalizeStringArray(input.missingInfo ?? input.missing_info),
    warnings: normalizeStringArray(input.warnings)
  };
}

function normalizeFurnitureZones(value, expectedPages = []) {
  const zones = Array.isArray(value) ? value : [];
  return zones.map((zone, index) => normalizeFurnitureZone(zone, index, expectedPages)).filter(Boolean);
}

function normalizeFurnitureZone(input, index, expectedPages) {
  if (!isPlainObject(input)) return null;
  const sourcePage = normalizeSourcePage(input.sourcePage ?? input.source_page, expectedPages);
  if (!sourcePage) return null;
  const zoneType = normalizeFurnitureZoneType(input.zoneType ?? input.zone_type ?? input.type);

  return omitEmpty({
    id: cleanText(input.id, `zone-${index + 1}`),
    zoneType,
    label: cleanText(input.label, furnitureZoneLabel(zoneType)),
    roomId: cleanText(input.roomId ?? input.room_id),
    roomLabel: cleanText(input.roomLabel ?? input.room_label),
    sourcePage,
    confidence: normalizeConfidence(input.confidence),
    dimensions: normalizeDimensions(input.dimensions),
    materials: normalizeStringArray(input.materials),
    missingInfo: normalizeStringArray(input.missingInfo ?? input.missing_info),
    warnings: normalizeStringArray(input.warnings)
  });
}

function normalizeDimensions(value) {
  const dimensions = isPlainObject(value) ? value : {};
  return omitEmpty({
    widthMm: normalizeOptionalNumber(dimensions.widthMm ?? dimensions.width_mm),
    heightMm: normalizeOptionalNumber(dimensions.heightMm ?? dimensions.height_mm),
    depthMm: normalizeOptionalNumber(dimensions.depthMm ?? dimensions.depth_mm),
    lengthMm: normalizeOptionalNumber(dimensions.lengthMm ?? dimensions.length_mm),
    note: cleanText(dimensions.note)
  });
}

function groupZonesByPage(value) {
  const zones = Array.isArray(value) ? value : [];
  const grouped = new Map();
  for (const zone of zones) {
    const sourcePage = Number(zone.sourcePage);
    if (!Number.isInteger(sourcePage) || sourcePage < 1) continue;
    grouped.set(sourcePage, [...(grouped.get(sourcePage) || []), zone]);
  }
  return grouped;
}

function mergePageZones(existing, extracted) {
  const byId = new Map();
  for (const zone of Array.isArray(existing) ? existing : []) {
    byId.set(cleanText(zone.id, `existing-${byId.size + 1}`), { ...zone });
  }
  for (const zone of Array.isArray(extracted) ? extracted : []) {
    byId.set(cleanText(zone.id, `zone-${byId.size + 1}`), { ...zone });
  }
  return [...byId.values()];
}

function collectZoneInfo(zones, key) {
  return zones.flatMap((zone) => normalizeStringArray(zone?.[key]));
}

function normalizeSourcePages(value, expectedPages) {
  const source = Array.isArray(value) ? value : [value];
  return uniqueNumbers(source.map((page) => normalizeSourcePage(page, expectedPages)).filter(Boolean));
}

function normalizeSourcePage(value, expectedPages) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  if (expectedPages.length > 0 && !expectedPages.includes(parsed)) return null;
  return parsed;
}

function getExpectedPageNumbers(manifest) {
  if (!Array.isArray(manifest?.pages)) return [];
  return manifest.pages.map((page, index) => Number(page.pageNumber) || index + 1);
}

function normalizeFurnitureZoneType(value) {
  const type = cleanText(value).toLowerCase();
  return FURNITURE_ZONE_SET.has(type) ? type : "other";
}

function furnitureZoneLabel(type) {
  const labels = {
    kitchen: "Kitchen",
    wardrobe: "Wardrobe",
    walk_in_closet: "Walk-in closet",
    bathroom: "Bathroom furniture",
    hallway: "Hallway furniture",
    kids: "Kids furniture",
    office: "Office furniture",
    tvzone: "TV zone",
    commercial: "Commercial furniture",
    storage: "Storage furniture",
    other: "Custom furniture"
  };
  return labels[type] || labels.other;
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(0, parsed));
}

function normalizeOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
  const single = cleanText(value);
  return single ? [single] : [];
}

function uniqueStrings(values) {
  return [...new Set(normalizeStringArray(values))];
}

function uniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function stripCodeFence(value) {
  const text = cleanText(value);
  if (!text) return "";
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

function limitText(value, maxLength = 1400) {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function omitEmpty(value) {
  if (Array.isArray(value)) return value.map(omitEmpty);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, omitEmpty(item)])
  );
}
