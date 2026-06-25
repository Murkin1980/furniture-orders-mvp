import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPdfDraftRecord,
  buildPdfDraftManifestUpdate,
  serializePdfManifest,
  parseStoredPdfManifest,
  normalizeStatus,
  normalizeRow,
  normalizeRows
} from "../src/pdf/pdf-draft-store.js";

describe("buildPdfDraftRecord", () => {
  it("returns null for missing orderId", () => {
    assert.equal(buildPdfDraftRecord(null), null);
    assert.equal(buildPdfDraftRecord(0), null);
  });

  it("creates draft record with minimal fields", () => {
    const record = buildPdfDraftRecord(1);
    assert.equal(record.order_id, 1);
    assert.equal(record.status, "draft");
    assert.equal(record.mime_type, "application/pdf");
    assert.equal(record.created_by, "manager");
  });

  it("includes meta fields when provided", () => {
    const record = buildPdfDraftRecord(1, {
      fileName: "design.pdf",
      fileSizeBytes: 2048000,
      pageCount: 5,
      manifest: { pageCount: 5, pages: [] },
      createdBy: "admin"
    });
    assert.equal(record.file_name, "design.pdf");
    assert.equal(record.file_size_bytes, 2048000);
    assert.equal(record.page_count, 5);
    assert.equal(record.created_by, "admin");
    assert.ok(typeof record.manifest_json === "string");
  });
});

describe("buildPdfDraftManifestUpdate", () => {
  it("sets failed status when error is present", () => {
    const update = buildPdfDraftManifestUpdate({}, { error: "processing error" });
    assert.equal(update.status, "failed");
    assert.equal(update.error, "processing error");
  });

  it("sets reviewed status by default", () => {
    const update = buildPdfDraftManifestUpdate({ pages: [] }, { reviewedBy: "manager" });
    assert.equal(update.status, "reviewed");
    assert.equal(update.reviewed_by, "manager");
  });

  it("serializes manifest as JSON string", () => {
    const update = buildPdfDraftManifestUpdate({ pageCount: 3, pages: [{ index: 1 }] });
    const parsed = JSON.parse(update.manifest_json);
    assert.equal(parsed.pageCount, 3);
    assert.equal(parsed.pages[0].index, 1);
  });
});

describe("serializePdfManifest", () => {
  it("serializes a valid manifest", () => {
    const result = serializePdfManifest({ pageCount: 2 });
    assert.equal(result, '{"pageCount":2}');
  });

  it("returns empty object for non-object input", () => {
    assert.equal(serializePdfManifest(null), "{}");
    assert.equal(serializePdfManifest("string"), "{}");
  });
});

describe("parseStoredPdfManifest", () => {
  it("parses JSON string", () => {
    const result = parseStoredPdfManifest('{"pageCount":2}');
    assert.equal(result.pageCount, 2);
  });

  it("returns empty object for invalid JSON", () => {
    const result = parseStoredPdfManifest("invalid");
    assert.deepEqual(result, {});
  });

  it("returns object as-is", () => {
    const result = parseStoredPdfManifest({ pageCount: 3 });
    assert.equal(result.pageCount, 3);
  });
});

describe("normalizeStatus", () => {
  it("normalizes known statuses", () => {
    assert.equal(normalizeStatus("draft"), "draft");
    assert.equal(normalizeStatus("processing"), "processing");
    assert.equal(normalizeStatus("reviewed"), "reviewed");
    assert.equal(normalizeStatus("approved"), "approved");
    assert.equal(normalizeStatus("rejected"), "rejected");
  });

  it("falls back to draft for unknown statuses", () => {
    assert.equal(normalizeStatus("unknown"), "draft");
    assert.equal(normalizeStatus(""), "draft");
  });
});

describe("normalizeRow", () => {
  it("parses manifest_json into manifest", () => {
    const row = normalizeRow({
      id: 1,
      manifest_json: '{"pageCount":2}',
      status: "draft"
    });
    assert.equal(row.id, 1);
    assert.equal(row.manifest.pageCount, 2);
    assert.equal(row.status, "draft");
  });

  it("returns null for non-object input", () => {
    assert.equal(normalizeRow(null), null);
  });
});

describe("normalizeRows", () => {
  it("normalizes an array of rows", () => {
    const rows = normalizeRows([
      { id: 1, manifest_json: "{}", status: "draft" },
      { id: 2, manifest_json: "{}", status: "reviewed" }
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[1].id, 2);
  });

  it("filters out null rows", () => {
    const rows = normalizeRows([null, { id: 1, manifest_json: "{}", status: "draft" }]);
    assert.equal(rows.length, 1);
  });
});
