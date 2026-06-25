export const PDF_ESTIMATE_VERSION = "pdf-estimate/v1";

const DEFAULT_PRICES = {
  kitchen: { basePrice: 150000, unitPrice: 120000, label: "Кухня" },
  wardrobe: { basePrice: 100000, unitPrice: 80000, label: "Шкаф-купе" },
  bedroom: { basePrice: 120000, unitPrice: 100000, label: "Спальня" },
  hallway: { basePrice: 70000, unitPrice: 60000, label: "Прихожая" },
  cabinet: { basePrice: 60000, unitPrice: 50000, label: "Шкаф" },
  bathroom: { basePrice: 80000, unitPrice: 70000, label: "Ванная" },
  children: { basePrice: 90000, unitPrice: 80000, label: "Детская" },
  office: { basePrice: 100000, unitPrice: 90000, label: "Офис" },
  tvzone: { basePrice: 50000, unitPrice: 40000, label: "ТВ-зона" },
  commercial: { basePrice: 200000, unitPrice: 150000, label: "Коммерция" },
  other: { basePrice: 50000, unitPrice: 50000, label: "Прочее" }
};

export function getDefaultPdfEstimate() {
  return {
    estimateVersion: PDF_ESTIMATE_VERSION,
    source: { draftId: null, orderId: null },
    items: [],
    totals: { itemCount: 0, subtotal: 0, discount: 0, total: 0 },
    warnings: [],
    notes: []
  };
}

export function generatePdfEstimate(manifest = {}, options = {}) {
  const estimate = getDefaultPdfEstimate();
  if (!isPlainObject(manifest)) return estimate;

  estimate.source.draftId = normalizeInt(options.draftId);
  estimate.source.orderId = normalizeInt(manifest.document?.orderId);

  const rooms = Array.isArray(manifest.rooms) ? manifest.rooms : [];
  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  const furnitureZones = rooms.flatMap((room) =>
    Array.isArray(room.furnitureZones) ? room.furnitureZones : []
  ).concat(
    pages.flatMap((page) =>
      Array.isArray(page.furnitureZones) ? page.furnitureZones : []
    )
  );

  const seen = new Set();
  for (const zone of furnitureZones) {
    const type = normalizeZoneType(zone.furnitureType || zone.furniture_type || zone.type || "other");
    const price = DEFAULT_PRICES[type] || DEFAULT_PRICES.other;
    const label = zone.label || zone.name || zone.roomName || price.label;

    if (seen.has(label)) continue;
    seen.add(label);

    const width = extractDimension(zone, "width");
    const units = width ? Math.ceil(width / 1000) : 1;

    estimate.items.push({
      line: estimate.items.length + 1,
      label,
      furnitureType: type,
      units: Math.max(1, units),
      basePrice: price.basePrice,
      unitPrice: price.unitPrice,
      subtotal: price.basePrice + price.unitPrice * Math.max(1, units)
    });
  }

  if (estimate.items.length === 0) {
    estimate.notes.push("No furniture zones found in the PDF manifest.");
  }

  updateTotals(estimate, options);
  return estimate;
}

function updateTotals(estimate, options) {
  const discountPercent = Math.min(95, Math.max(0, Number(options.discountPercent) || 0));
  estimate.totals.itemCount = estimate.items.length;
  estimate.totals.subtotal = estimate.items.reduce((sum, item) => sum + item.subtotal, 0);
  estimate.totals.discount = Math.round(estimate.totals.subtotal * discountPercent / 100);
  estimate.totals.total = estimate.totals.subtotal - estimate.totals.discount;
}

function normalizeZoneType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (DEFAULT_PRICES[normalized]) return normalized;
  return "other";
}

function extractDimension(zone, key) {
  for (const dim of [zone.dimensions, zone.overallDimensions, zone.overall_dimensions]) {
    if (!dim) continue;
    if (typeof dim === "object") {
      const val = dim[key] || dim[`${key}Mm`] || dim[`${key}mm`];
      if (val !== undefined && val !== null) return Number(val);
    }
  }
  return null;
}

function normalizeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
