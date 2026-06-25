import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeOrderPdfCore } from "../src/pdf/order-pdf-core.js";

function makeDb(orders = []) {
  const state = { pdfDrafts: [] };
  const store = [...orders];
  let nextDraftId = 1;

  function stmt(sql) {
    let values = [];
    const run = async () => {
      if (sql.startsWith("CREATE") || sql.startsWith("ALTER TABLE") || sql.includes("CREATE INDEX")) return { success: true };
      if (sql.includes("INSERT INTO project_pdf_drafts")) {
        const draft = { id: nextDraftId++, order_id: values[0], file_name: values[1], file_size_bytes: values[2], mime_type: values[3], page_count: values[4], manifest_json: values[5], status: values[6], created_by: values[7] };
        state.pdfDrafts.push(draft);
        return { meta: { last_row_id: draft.id } };
      }
      if (sql.includes("UPDATE project_pdf_drafts")) {
        const draft = state.pdfDrafts.find((d) => d.id === values[6]);
        if (draft) { draft.status = values[0]; draft.manifest_json = values[1]; draft.error = values[2]; draft.reviewed_by = values[3]; draft.reviewed_at = values[4]; }
        return {};
      }
      return { meta: { last_row_id: 0 } };
    };
    const all = async () => ({ results: [] });
    const first = async () => {
      if (sql.includes("SELECT id FROM orders")) return store.find((o) => o.id === values[0]) || null;
      if (sql.includes("FROM project_pdf_drafts")) {
        const d = state.pdfDrafts.find((d) => d.id === values[0]);
        if (!d) return null;
        return { id: d.id, orderId: d.order_id, fileName: d.file_name, fileSizeBytes: d.file_size_bytes, mimeType: d.mime_type, pageCount: d.page_count, manifestJson: d.manifest_json, status: d.status, error: d.error, createdBy: d.created_by, reviewedBy: d.reviewed_by, reviewedAt: d.reviewed_at, createdAt: "", updatedAt: "" };
      }
      return null;
    };
    return { run, all, first, bind: (...v) => { values = v; return { run, all, first }; } };
  }

  return { state, prepare: (sql) => stmt(sql) };
}

describe("analyzeOrderPdfCore", () => {
  it("returns 400 for invalid order id", async () => {
    const result = await analyzeOrderPdfCore({ db: makeDb() }, -1, {});
    assert.equal(result.status, 400);
    assert.equal(result.body.error, "invalid_order_id");
  });

  it("returns 404 when order is not found", async () => {
    const result = await analyzeOrderPdfCore({ db: makeDb() }, 999, {});
    assert.equal(result.status, 404);
    assert.equal(result.body.error, "order_not_found");
  });

  it("creates draft and returns analysis with injected sender", async () => {
    const db = makeDb([{ id: 1 }]);
    const result = await analyzeOrderPdfCore(
      { db },
      1,
      {
        fileName: "design.pdf",
        fileSizeBytes: 2048000,
        pageCount: 3,
        manifest: { pages: [] }
      },
      {
        sendPdfAiRequest: async () => ({
          choices: [{ message: { content: JSON.stringify({
            documentType: "furniture_sketch",
            pages: [{ index: 1, pageType: "floor_plan", confidence: 0.95 }]
          }) } }]
        }),
        providerName: "openai",
        model: "gpt-4o"
      }
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.draft.status, "draft");
    assert.ok(result.body.draft.id > 0);
    assert.ok(result.body.analysis);
    assert.equal(db.state.pdfDrafts.length, 1);
  });

  it("saves draft without sender (no analysis)", async () => {
    const db = makeDb([{ id: 1 }]);
    const result = await analyzeOrderPdfCore(
      { db },
      1,
      { fileName: "test.pdf", fileSizeBytes: 1024, pageCount: 1 }
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.draft.status, "draft");
    assert.equal(result.body.analysis, null);
  });

  it("updates draft as failed when sender returns error", async () => {
    const db = makeDb([{ id: 1 }]);
    const result = await analyzeOrderPdfCore(
      { db },
      1,
      { fileName: "bad.pdf", pageCount: 1 },
      {
        sendPdfAiRequest: async () => { throw new Error("AI provider error"); },
        providerName: "openai",
        model: "gpt-4o"
      }
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.analysis.meta.error, "AI provider error");
  });
});
