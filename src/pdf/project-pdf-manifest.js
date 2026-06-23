export const PDF_MANIFEST_VERSION = "project-pdf-manifest/v1";

export const PDF_PAGE_TYPES = Object.freeze([
  "floor_plan",
  "elevation",
  "visualization",
  "specification",
  "text",
  "mixed",
  "unknown"
]);

export const PDF_FURNITURE_ZONE_TYPES = Object.freeze([
  "kitchen",
  "wardrobe",
  "walk_in_closet",
  "bathroom",
  "hallway",
  "kids",
  "office",
  "tvzone",
  "commercial",
  "storage",
  "other"
]);

const PAGE_TYPE_SET = new Set(PDF_PAGE_TYPES);
const FURNITURE_ZONE_SET = new Set(PDF_FURNITURE_ZONE_TYPES);

export function getDefaultProjectPdfManifest() {
  return {
    manifestVersion: PDF_MANIFEST_VERSION,
    document: {
      orderId: null,
      fileName: "",
      fileSizeBytes: null,
      mimeType: "application/pdf",
      checksum: "",
      source: "order_admin",
      uploadedBy: "manager"
    },
    pageCount: 0,
    pages: [],
    warnings: []
  };
}

export function buildProjectPdfManifest(input = {}, options = {}) {
  const source = isPlainObject(input) ? input : {};
  const documentInput = isPlainObject(source.document) ? source.document : source;
  const pageCount = normalizePageCount(source.pageCount ?? source.page_count ?? documentInput.pageCount ?? documentInput.page_count);
  const rawPages = Array.isArray(source.pages) ? source.pages : [];
  const pages = rawPages.length > 0
    ? rawPages.map((page, index) => normalizePage(page, index))
    : buildUnknownPages(pageCount);
  const normalizedPages = pages.map((page, index) => ({
    ...page,
    pageNumber: normalizePositiveInteger(page.pageNumber, index + 1)
  }));
  const warnings = normalizeStringArray(source.warnings ?? options.warnings);

  return removeUndefined({
    manifestVersion: PDF_MANIFEST_VERSION,
    document: {
      orderId: normalizeOptionalId(documentInput.orderId ?? documentInput.order_id),
      fileName: cleanText(documentInput.fileName ?? documentInput.file_name),
      fileSizeBytes: normalizeOptionalPositiveInteger(documentInput.fileSizeBytes ?? documentInput.file_size_bytes),
      mimeType: cleanText(documentInput.mimeType ?? documentInput.mime_type, "application/pdf"),
      checksum: cleanText(documentInput.checksum ?? documentInput.sha256),
      source: cleanText(documentInput.source, "order_admin"),
      uploadedBy: cleanText(documentInput.uploadedBy ?? documentInput.uploaded_by, "manager")
    },
    pageCount: normalizedPages.length || pageCount,
    pages: normalizedPages,
    warnings
  });
}

export function validateProjectPdfManifest(manifest) {
  const normalized = buildProjectPdfManifest(manifest);
  const errors = [];
  const warnings = [...normalized.warnings];

  if (!normalized.document.fileName) {
    errors.push({ field: "document.fileName", message: "PDF file name is required." });
  } else if (!isSupportedPdfFile(normalized.document.fileName, normalized.document.mimeType)) {
    errors.push({ field: "document.fileName", message: "Only PDF documents are supported." });
  }

  if (normalized.pageCount < 1) {
    errors.push({ field: "pageCount", message: "PDF must contain at least one page." });
  }

  for (const page of normalized.pages) {
    if (!PAGE_TYPE_SET.has(page.pageType)) {
      errors.push({ field: `pages.${page.pageNumber}.pageType`, message: "Unsupported page type." });
    }
    if (page.furnitureZones.length === 0 && page.pageType !== "unknown" && page.pageType !== "text") {
      warnings.push(`Page ${page.pageNumber} has no furniture zones yet.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    manifest: normalized
  };
}

export function isSupportedPdfFile(fileName, mimeType = "application/pdf") {
  const name = cleanText(fileName).toLowerCase();
  const type = cleanText(mimeType).toLowerCase();
  return name.endsWith(".pdf") && (!type || type === "application/pdf");
}

function buildUnknownPages(pageCount) {
  return Array.from({ length: pageCount }, (_, index) => normalizePage({ pageNumber: index + 1 }, index));
}

function normalizePage(input, index) {
  const page = isPlainObject(input) ? input : {};
  return removeUndefined({
    pageNumber: normalizePositiveInteger(page.pageNumber ?? page.page_number, index + 1),
    widthMm: normalizeOptionalNumber(page.widthMm ?? page.width_mm),
    heightMm: normalizeOptionalNumber(page.heightMm ?? page.height_mm),
    rotation: normalizeRotation(page.rotation),
    pageType: normalizePageType(page.pageType ?? page.page_type),
    confidence: normalizeConfidence(page.confidence),
    roomLabel: cleanText(page.roomLabel ?? page.room_label),
    furnitureZones: normalizeFurnitureZones(page.furnitureZones ?? page.furniture_zones),
    missingInfo: normalizeStringArray(page.missingInfo ?? page.missing_info),
    warnings: normalizeStringArray(page.warnings)
  });
}

function normalizeFurnitureZones(value) {
  const zones = Array.isArray(value) ? value : [];
  return zones.map((zone, index) => normalizeFurnitureZone(zone, index)).filter(Boolean);
}

function normalizeFurnitureZone(input, index) {
  const zone = isPlainObject(input) ? input : {};
  const zoneType = normalizeFurnitureZoneType(zone.zoneType ?? zone.zone_type ?? zone.type);
  return removeUndefined({
    id: cleanText(zone.id, `zone-${index + 1}`),
    zoneType,
    label: cleanText(zone.label, furnitureZoneLabel(zoneType)),
    roomLabel: cleanText(zone.roomLabel ?? zone.room_label),
    sourcePage: normalizeOptionalPositiveInteger(zone.sourcePage ?? zone.source_page),
    confidence: normalizeConfidence(zone.confidence),
    dimensions: normalizeDimensions(zone.dimensions),
    materials: normalizeStringArray(zone.materials),
    missingInfo: normalizeStringArray(zone.missingInfo ?? zone.missing_info),
    warnings: normalizeStringArray(zone.warnings)
  });
}

function normalizeDimensions(value) {
  const dimensions = isPlainObject(value) ? value : {};
  return removeUndefined({
    widthMm: normalizeOptionalNumber(dimensions.widthMm ?? dimensions.width_mm),
    heightMm: normalizeOptionalNumber(dimensions.heightMm ?? dimensions.height_mm),
    depthMm: normalizeOptionalNumber(dimensions.depthMm ?? dimensions.depth_mm),
    lengthMm: normalizeOptionalNumber(dimensions.lengthMm ?? dimensions.length_mm),
    note: cleanText(dimensions.note)
  });
}

function normalizePageType(value) {
  const type = cleanText(value).toLowerCase();
  return PAGE_TYPE_SET.has(type) ? type : "unknown";
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

function normalizeRotation(value) {
  const parsed = Number(value);
  return [0, 90, 180, 270].includes(parsed) ? parsed : 0;
}

function normalizePageCount(value) {
  return normalizeOptionalPositiveInteger(value) || 0;
}

function normalizeOptionalId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOptionalPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  const single = cleanText(value);
  return single ? [single] : [];
}

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, removeUndefined(item)])
  );
}
