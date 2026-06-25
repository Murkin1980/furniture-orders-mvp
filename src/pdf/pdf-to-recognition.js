export function mapPdfManifestToRecognition(manifest = {}) {
  if (!manifest || typeof manifest !== "object") return null;

  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  const rooms = Array.isArray(manifest.rooms) ? manifest.rooms : [];

  const allZones = [];
  const seenLabels = new Set();
  const allWarnings = [];

  for (const room of rooms) {
    const zones = Array.isArray(room.furnitureZones) ? room.furnitureZones : [];
    for (const zone of zones) {
      const label = zone.label || zone.name || room.name || "zone";
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      allZones.push({ ...zone, roomName: room.name });
    }
  }

  for (const page of pages) {
    const zones = Array.isArray(page.furnitureZones) ? page.furnitureZones : [];
    for (const zone of zones) {
      const label = zone.label || `page-${page.pageNumber}`;
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      allZones.push(zone);
    }
  }

  const dimensions = allZones.flatMap((zone) => {
    const dims = [];
    const raw = zone.dimensions || zone.overallDimensions || zone.overall_dimensions;
    if (!raw) return dims;

    for (const key of ["width", "height", "depth"]) {
      const val = raw[key] || raw[`${key}Mm`] || raw[`${key}mm`];
      if (val === undefined || val === null) {
        allWarnings.push(`Missing ${key} for "${zone.label || "zone"}".`);
        continue;
      }
      const label = key === "width" ? "width" : key === "height" ? "height" : "depth";
      dims.push({ label, value: Number(val), unit: "mm", confidence: 0.8, sourceText: `${key}: ${val} mm` });
    }
    return dims;
  });

  const furnitureTypes = new Set(allZones.map((z) => normalizeFurnitureType(z.furnitureType || z.type)));
  const primaryType = furnitureTypes.size === 1 ? [...furnitureTypes][0] : "other";

  return {
    documentType: extractDocumentType(pages),
    furnitureType: primaryType,
    rawText: `PDF analysis: ${allZones.length} zones, ${dimensions.length} dimensions`,
    dimensions,
    components: allZones.map((z) => z.label || "component").filter(Boolean),
    materials: ["Требует уточнения"],
    notes: allZones.map((z) => `${z.label || "zone"}: ${z.furnitureType || z.type || "other"}`),
    warnings: allWarnings,
    missingInfo: dimensions.length < 3 ? ["Нет полных размеров"] : [],
    confidence: dimensions.length > 0 ? Math.min(0.9, 0.5 + dimensions.length * 0.05) : 0.3
  };
}

function extractDocumentType(pages) {
  const types = pages.map((p) => p.pageType || "").filter(Boolean);
  if (types.some((t) => t === "floor_plan")) return "furniture_sketch";
  if (types.some((t) => t === "specification" || t === "elevation")) return "measurement_sheet";
  return "other";
}

function normalizeFurnitureType(type) {
  const t = String(type || "").trim().toLowerCase();
  const valid = ["kitchen", "wardrobe", "bedroom", "hallway", "cabinet", "bathroom", "children", "office", "tvzone", "commercial", "other"];
  return valid.includes(t) ? t : "other";
}
