export const SUPPLIER_SCHEMA_VERSION = 1;
export const PRICE_LIST_STATUSES = Object.freeze(["draft", "approved", "superseded", "archived"]);

export function getDefaultSupplier() {
  return {
    schemaVersion: SUPPLIER_SCHEMA_VERSION,
    supplier: { id: null, name: "", sourceType: "manual", contactEmail: "" },
    priceList: { version: 1, status: "draft", currency: "KZT", validFrom: null, validUntil: null },
    items: []
  };
}

export function normalizeSupplierCatalog(input = {}) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "invalid_input", catalog: getDefaultSupplier() };
  }
  const errors = [];

  const supplier = normalizeSupplier(input.supplier);
  if (!supplier.name) errors.push("Supplier name is required.");
  if (!supplier.sourceType) errors.push("Supplier source type is required (manual, api, csv, xlsx).");

  const priceList = normalizePriceList(input.priceList);
  if (!priceList.currency) errors.push("Currency is required (e.g. KZT, USD).");

  const items = normalizeItems(input.items, errors);

  const missingPrices = items.filter((item) => item.unitPrice === null);
  if (missingPrices.length > 0) {
    errors.push(`${missingPrices.length} item(s) without unitPrice.`);
  }

  return {
    ok: errors.length === 0,
    error: errors.length ? errors.join("; ") : "",
    catalog: {
      schemaVersion: SUPPLIER_SCHEMA_VERSION,
      supplier,
      priceList,
      items
    }
  };
}

function normalizeSupplier(input) {
  if (!input || typeof input !== "object") return { id: null, name: "", sourceType: "manual", contactEmail: "" };
  return {
    id: normalizeInt(input.id),
    name: clean(input.name),
    sourceType: clean(input.sourceType) || "manual",
    contactEmail: clean(input.contactEmail)
  };
}

function normalizePriceList(input) {
  if (!input || typeof input !== "object") return { version: 1, status: "draft", currency: "KZT", validFrom: null, validUntil: null };
  return {
    version: Math.max(1, normalizeInt(input.version) || 1),
    status: normalizeEnum(input.status, PRICE_LIST_STATUSES, "draft"),
    currency: clean(input.currency) || "KZT",
    validFrom: clean(input.validFrom) || null,
    validUntil: clean(input.validUntil) || null
  };
}

function normalizeItems(input, errors) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizeItem(item, errors)).filter(Boolean);
}

function normalizeItem(input, errors) {
  if (!input || typeof input !== "object") return null;
  const sku = clean(input.sku);
  if (!sku) {
    errors.push("Item SKU is required.");
    return null;
  }
  const name = clean(input.name);
  if (!name) {
    errors.push("Item name is required.");
    return null;
  }

  return {
    sku,
    name,
    description: clean(input.description),
    category: clean(input.category),
    unit: clean(input.unit) || "pcs",
    unitPrice: normalizePositiveNumber(input.unitPrice),
    currency: clean(input.currency),
    material: clean(input.material),
    finish: clean(input.finish),
    dimensionsMm: normalizeDimensions(input.dimensionsMm),
    notes: clean(input.notes)
  };
}

function normalizeDimensions(input) {
  if (!input || typeof input !== "object") return null;
  return {
    widthMm: normalizePositiveNumber(input.widthMm),
    heightMm: normalizePositiveNumber(input.heightMm),
    depthMm: normalizePositiveNumber(input.depthMm)
  };
}

function normalizeEnum(value, allowed, fallback) {
  const n = clean(value).toLowerCase();
  return allowed.includes(n) ? n : fallback;
}

function normalizeInt(value) { const n = Number(value); return Number.isInteger(n) ? n : null; }
function normalizePositiveNumber(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
