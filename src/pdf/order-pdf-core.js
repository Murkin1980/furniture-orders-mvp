import { analyzeProjectPdf } from "./analyze-project-pdf.js";
import { buildPdfDraftRecord, buildPdfDraftManifestUpdate, normalizeRow } from "./pdf-draft-store.js";

export async function analyzeOrderPdfCore({ db }, orderId, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");

  const id = Number(orderId);
  if (!Number.isInteger(id) || id < 1) {
    return result(400, { success: false, error: "invalid_order_id", message: "orderId must be a positive integer." });
  }

  const order = await db.prepare(
    `SELECT id FROM orders WHERE id = ?`
  ).bind(id).first();
  if (!order) {
    return result(404, { success: false, error: "order_not_found", message: "Order was not found." });
  }

  const record = buildPdfDraftRecord(id, {
    fileName: input.fileName || input.file_name,
    fileSizeBytes: input.fileSizeBytes || input.file_size_bytes,
    pageCount: input.pageCount || input.page_count,
    mimeType: input.mimeType || input.mime_type,
    manifest: input.manifest || {},
    createdBy: input.createdBy || options.createdBy || "manager"
  });
  if (!record) {
    return result(400, { success: false, error: "invalid_pdf_draft", message: "Could not build PDF draft record." });
  }

  const insert = await db.prepare(
    `INSERT INTO project_pdf_drafts
      (order_id, file_name, file_size_bytes, mime_type, page_count, manifest_json, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(record.order_id, record.file_name, record.file_size_bytes, record.mime_type,
    record.page_count, record.manifest_json, record.status, record.created_by).run();

  const draftId = insert?.meta?.last_row_id;
  if (!draftId) {
    return result(500, { success: false, error: "draft_not_created", message: "PDF draft could not be created." });
  }

  const sendPdfAiRequest = options.sendPdfAiRequest;
  if (typeof sendPdfAiRequest !== "function") {
    return result(200, {
      success: true,
      orderId: id,
      draft: { id: draftId, status: "draft" },
      analysis: null
    });
  }

  const analysis = await analyzeProjectPdf({
    manifest: input.manifest || {},
    pageInputs: input.pageInputs || input.page_inputs || []
  }, {
    sendPdfAiRequest,
    providerName: options.providerName,
    model: options.model,
    env: options.env
  });

  const update = buildPdfDraftManifestUpdate(analysis.manifest, {
    status: analysis.meta?.error ? "failed" : "reviewed",
    error: analysis.meta?.error,
    reviewedBy: options.createdBy || "manager",
    reviewedAt: analysis.meta?.error ? null : new Date().toISOString()
  });

  await db.prepare(
    `UPDATE project_pdf_drafts SET status = ?, manifest_json = ?, error = ?,
       reviewed_by = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(update.status, update.manifest_json, update.error,
    update.reviewed_by, update.reviewed_at, draftId).run();

  const saved = await db.prepare(
    `SELECT id, order_id AS orderId, file_name AS fileName, file_size_bytes AS fileSizeBytes,
            mime_type AS mimeType, page_count AS pageCount, manifest_json AS manifestJson,
            status, error, created_by AS createdBy, reviewed_by AS reviewedBy,
            reviewed_at AS reviewedAt, created_at AS createdAt, updated_at AS updatedAt
     FROM project_pdf_drafts WHERE id = ?`
  ).bind(draftId).first();

  return result(201, {
    success: true,
    orderId: id,
    draft: normalizeRow(saved),
    analysis: {
      version: analysis.analysisVersion,
      classification: analysis.classification,
      extraction: analysis.extraction,
      meta: analysis.meta
    }
  });
}

function result(status, body) {
  return { ok: status >= 200 && status < 300, status, body };
}
