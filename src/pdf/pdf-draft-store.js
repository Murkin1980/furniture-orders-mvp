export const PDF_DRAFT_STATUSES = Object.freeze(["draft", "processing", "reviewed", "approved", "rejected"]);

export function buildPdfDraftRecord(orderId, meta = {}) {
  const id = normalizePositiveInt(orderId);
  if (!id) return null;

  const safeMeta = isPlainObject(meta) ? meta : {};

  return {
    order_id: id,
    file_name: cleanText(safeMeta.fileName),
    file_size_bytes: normalizePositiveInt(safeMeta.fileSizeBytes),
    mime_type: cleanText(safeMeta.mimeType) || "application/pdf",
    page_count: normalizePositiveInt(safeMeta.pageCount),
    manifest_json: JSON.stringify(safeMeta.manifest || {}),
    status: "draft",
    error: null,
    created_by: cleanText(safeMeta.createdBy) || "manager"
  };
}

export function buildPdfDraftManifestUpdate(result, meta = {}) {
  const safeMeta = isPlainObject(meta) ? meta : {};
  const error = cleanText(safeMeta.error);
  return {
    status: error ? "failed" : normalizeStatus(safeMeta.status || "reviewed"),
    manifest_json: JSON.stringify(isPlainObject(result) ? result : {}),
    error,
    reviewed_by: error ? null : cleanText(safeMeta.reviewedBy),
    reviewed_at: error ? null : cleanText(safeMeta.reviewedAt)
  };
}

export function serializePdfManifest(manifest) {
  try {
    return JSON.stringify(isPlainObject(manifest) ? manifest : {});
  } catch {
    return "{}";
  }
}

export function parseStoredPdfManifest(value) {
  if (isPlainObject(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function normalizeStatus(status) {
  const normalized = cleanText(status)?.toLowerCase();
  return PDF_DRAFT_STATUSES.includes(normalized) ? normalized : "draft";
}

export function normalizeRow(row) {
  if (!isPlainObject(row)) return null;
  return {
    ...row,
    manifest: parseStoredPdfManifest(row.manifest_json)
  };
}

export function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeRow).filter(Boolean);
}

function normalizePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim() || "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
