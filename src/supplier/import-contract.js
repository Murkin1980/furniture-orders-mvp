export const ALLOWED_SOURCE_TYPES = Object.freeze(["manual", "csv", "xlsx", "api"]);
export const REQUIRED_FIELDS = Object.freeze(["sku", "name", "unitPrice"]);

export function validateImportSource(source = {}) {
  if (!source || typeof source !== "object") {
    return { ok: false, error: "import_source_required", message: "Import source configuration is required." };
  }
  if (!ALLOWED_SOURCE_TYPES.includes(source.type)) {
    return { ok: false, error: "unsupported_source", message: `Source type "${source.type}" is not supported. Allowed: ${ALLOWED_SOURCE_TYPES.join(", ")}.` };
  }
  if (!source.url && source.type !== "manual") {
    return { ok: false, error: "source_url_required", message: `URL is required for ${source.type} import.` };
  }
  if (source.credentials && typeof source.credentials !== "object") {
    return { ok: false, error: "invalid_credentials", message: "Credentials must be a plain object." };
  }
  return { ok: true, error: "" };
}

export function validateImportRow(row = {}, index) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!row[field] || String(row[field]).trim() === "") {
      errors.push(`Row ${index}: missing required field "${field}".`);
    }
  }
  if (row.unitPrice !== undefined && row.unitPrice !== null) {
    const price = Number(row.unitPrice);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`Row ${index}: unitPrice must be a positive number, got "${row.unitPrice}".`);
    }
  }
  if (row.currency && !/^[A-Z]{3}$/.test(String(row.currency).trim())) {
    errors.push(`Row ${index}: currency must be a 3-letter ISO code, got "${row.currency}".`);
  }
  return { ok: errors.length === 0, errors };
}

export function validateImportBatch(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "empty_batch", message: "Import batch must contain at least one row." };
  }
  const results = rows.map((row, i) => validateImportRow(row, i + 1));
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    total: rows.length,
    passed: rows.length - failed.length,
    failed: failed.length,
    errors: failed.flatMap((r) => r.errors)
  };
}
