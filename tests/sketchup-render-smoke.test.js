import { describe, it } from "node:test";
import assert from "node:assert/strict";

function makeSmokeDb() {
  const state = { orders: [], ocrRecognitions: [], sketchupJobs: [], renderArtifacts: [] };
  let nextOrderId = 1, nextOcrId = 1, nextJobAuditId = 1, nextRenderId = 1;

  function stmt(sql) {
    let values = [];
    const run = async () => {
      if (sql.startsWith("CREATE") || sql.startsWith("ALTER TABLE")) return { success: true };
      if (sql.includes("SELECT id FROM orders WHERE id")) {
        return { meta: { last_row_id: 1 } };
      }
      if (sql.includes("SELECT orders.id, orders.source, orders.city, orders.furniture_type")) {
        const o = state.orders.find((ord) => ord.id === Number(values[0]));
        return o ? { id: o.id, source: o.source, city: o.city, furnitureType: o.furniture_type, budget: o.budget, description: o.description, raw_payload: "{}", createdAt: o.created_at } : null;
      }
      if (sql.includes("SELECT id, order_id AS orderId, job_id AS jobId, status FROM sketchup_jobs")) {
        const job = state.sketchupJobs.find((j) => j.job_id === values[0] && j.order_id === Number(values[1]));
        if (!job) return null;
        return { id: job.id, orderId: job.order_id, jobId: job.job_id, status: job.status };
      }
      if (sql.includes("INSERT INTO ocr_recognitions")) {
        const rec = { id: nextOcrId++, order_id: Number(values[0]), result_json: values[1], created_by: values[2] || "manager", status: "draft" };
        state.ocrRecognitions.push(rec);
        return { meta: { last_row_id: rec.id } };
      }
      if (sql.includes("UPDATE ocr_recognitions")) {
        const rec = state.ocrRecognitions.find((r) => r.id === Number(values[3]));
        if (rec) { rec.status = values[0]; rec.reviewed_by = values[1]; rec.reviewed_at = values[2]; }
        return { meta: { last_row_id: Number(values[3]) } };
      }
      if (sql.includes("INSERT INTO sketchup_jobs")) {
        const job = { id: nextJobAuditId++, order_id: Number(values[0]), recognition_id: Number(values[1]), job_id: values[2], idempotency_key: values[3], status: "pending", plan_json: values[7], requested_by: values[9], requested_at: values[10] };
        state.sketchupJobs.push(job);
        return { meta: { last_row_id: job.id } };
      }
      if (sql.includes("UPDATE sketchup_jobs SET status")) {
        const job = state.sketchupJobs.find((j) => j.job_id === values[4]);
        if (job) job.status = values[0];
        return {};
      }
      if (sql.includes("INSERT INTO sketchup_render_artifacts")) {
        const art = { id: nextRenderId++, order_id: Number(values[0]), job_id: values[1], artifact_version: values[2], status: values[3], primary_storage_key: values[4], model_storage_key: values[5], manifest_json: values[6], reported_by: values[7] };
        state.renderArtifacts.push(art);
        return { meta: { last_row_id: art.id } };
      }
      if (sql.includes("FROM sketchup_render_artifacts")) {
        const orderFilter = values.length > 0 ? Number(values[0]) : null;
        const items = state.renderArtifacts
          .filter((a) => orderFilter === null || a.order_id === orderFilter)
          .map((a) => ({ id: a.id, orderId: a.order_id, jobId: a.job_id, artifactVersion: a.artifact_version, status: a.status, primaryStorageKey: a.primary_storage_key, modelStorageKey: a.model_storage_key, manifestJson: a.manifest_json, reportedBy: a.reported_by }));
        return { results: items };
      }
      return { results: [] };
    };
    const all = async () => {
      if (sql.includes("PRAGMA")) return { results: [{ name: "updated_at" }, { name: "notes" }] };
      return { results: [] };
    };
    const first = async () => {
      if (sql.includes("SELECT id FROM orders WHERE id")) {
        return state.orders.find((o) => o.id === Number(values[0])) || null;
      }
      if (sql.includes("FROM ocr_recognitions WHERE id")) {
        const rec = state.ocrRecognitions.find((r) => r.id === Number(values[0]) && r.order_id === Number(values[1]));
        if (!rec) return null;
        return { id: rec.id, orderId: rec.order_id, status: rec.status, resultJson: rec.result_json, reviewedBy: rec.reviewed_by, reviewedAt: rec.reviewed_at };
      }
      if (sql.includes("FROM sketchup_jobs WHERE job_id")) {
        const job = state.sketchupJobs.find((j) => j.job_id === values[0] && j.order_id === Number(values[1]));
        if (!job) return null;
        return { id: job.id, orderId: job.order_id, jobId: job.job_id, status: job.status };
      }
      if (sql.includes("FROM sketchup_render_artifacts")) {
        const art = state.renderArtifacts.find((a) => a.job_id === values[0]);
        if (!art) return null;
        return { id: art.id, orderId: art.order_id, jobId: art.job_id, artifactVersion: art.artifact_version, status: art.status, primaryStorageKey: art.primary_storage_key, modelStorageKey: art.model_storage_key, manifestJson: art.manifest_json, reportedBy: art.reported_by, createdAt: "", updatedAt: "" };
      }
      return null;
    };
    return { run, all, first, bind: (...v) => { values = v; return { run, all, first, bind: () => ({ run, all, first }) }; } };
  }

  function insertOrder(overrides = {}) {
    const order = {
      id: nextOrderId++, client_id: 1, source: "site", city: "Алматы",
      furniture_type: "wardrobe", budget: 500000, description: "Тестовый шкаф",
      status: "new", raw_payload: "{}", created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), ...overrides
    };
    state.orders.push(order);
    return order;
  }

  return { state, insertOrder, prepare: (sql) => stmt(sql) };
}

describe("SketchUp render pipeline — synthetic smoke", () => {
  it("full pipeline: order → OCR → SketchUp job → render artifact → admin view", async () => {
    const db = makeSmokeDb();
    const order = db.insertOrder();

    // Create OCR recognition
    const ocrInsert = await db.prepare(
      `INSERT INTO ocr_recognitions (order_id, result_json, created_by) VALUES (?, ?, ?)`
    ).bind(order.id, JSON.stringify({
      documentType: "furniture_sketch", furnitureType: "wardrobe",
      dimensions: [
        { label: "width", value: 2400, unit: "mm" },
        { label: "height", value: 2600, unit: "mm" },
        { label: "depth", value: 600, unit: "mm" }
      ],
      components: ["сдвижная дверь", "полка", "штанга"],
      materials: ["ЛДСП"],
      notes: [],
      confidence: 0.95, warnings: [], missingInfo: [], rawText: "Wardrobe 2400x2600x600"
    }), "manager").run();
    const recId = ocrInsert?.meta?.last_row_id || 1;

    // Approve the OCR recognition
    await db.prepare(
      `UPDATE ocr_recognitions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`
    ).bind("approved", "manager", "2026-06-25T12:00:00.000Z", recId).run();

    const rec = db.state.ocrRecognitions.find((r) => r.id === recId);
    assert.equal(rec.status, "approved");

    // Create SketchUp job with fake node sender
    const { createOrderSketchUpJobCore } = await import("../src/sketchup/order-job-core.js");
    const jobResult = await createOrderSketchUpJobCore(
      { db,       sendNodeRequest: async (req) => {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        return {
          ok: true,
          response: { jobId: body.jobId || "smoke-job", status: "accepted", nodeJobId: "node-smoke-1" }
        };
      } },
      order.id,
      {
        recognitionId: recId,
        confirmExecution: true,
        requestedBy: "manager",
        jobId: "smoke-sketchup-job-001"
      },
      {
        signingSecret: "test-secret-that-is-long-enough-for-hmac",
        baseURL: "https://sketchup-test.local",
        ttlMs: 300000
      }
    );

    assert.ok(jobResult.ok, `SketchUp job failed: ${JSON.stringify(jobResult.body)}`);
    assert.equal(jobResult.body.item.status, "accepted");
    assert.equal(jobResult.body.item.jobId, "smoke-sketchup-job-001");

    // Save render artifact
    const { saveOrderRenderArtifactCore } = await import("../src/sketchup/render-core.js");
    const renderResult = await saveOrderRenderArtifactCore(
      { db },
      order.id,
      {
        jobId: "smoke-sketchup-job-001",
        summary: { modelIncluded: true, renderCount: 2, previewCount: 1 },
        files: [
          { role: "model", mediaType: "application/vnd.sketchup.skp", storageKey: "renders/smoke/model.skp", bytes: 2048000, sha256: "a".repeat(64) },
          { role: "render", mediaType: "image/png", storageKey: "renders/smoke/render.png", bytes: 1024000, sha256: "b".repeat(64) },
          { role: "render", mediaType: "image/png", storageKey: "renders/smoke/render2.png", bytes: 512000, sha256: "c".repeat(64) },
          { role: "preview", mediaType: "image/jpeg", storageKey: "renders/smoke/preview.jpg", bytes: 256000, sha256: "d".repeat(64) }
        ]
      },
      { reportedBy: "sketchup-smoke" }
    );

    assert.ok(renderResult.ok, `Render artifact save failed: ${renderResult.body?.error}`);
    assert.equal(renderResult.body.item.jobId, "smoke-sketchup-job-001");
    assert.equal(renderResult.body.item.status, "ready");

    // Verify stored render artifact
    assert.equal(db.state.renderArtifacts.length, 1);
    const stored = db.state.renderArtifacts[0];
    assert.equal(stored.job_id, "smoke-sketchup-job-001");
    assert.equal(stored.status, "ready");
    assert.equal(stored.primary_storage_key, "renders/smoke/render.png");

    // Admin view model from stored data
    const { getOrderRenderArtifactViewModel, getOrderRenderArtifactsSummary } = await import("../public/admin-orders.js");
    const fakeItem = {
      id: stored.id, orderId: stored.order_id, jobId: stored.job_id,
      artifactVersion: stored.artifact_version, status: stored.status,
      primaryStorageKey: stored.primary_storage_key,
      modelStorageKey: stored.model_storage_key,
      manifest: JSON.parse(stored.manifest_json),
      reportedBy: stored.reported_by
    };
    const vm = getOrderRenderArtifactViewModel(fakeItem);
    assert.equal(vm.hasArtifact, true);
    assert.equal(vm.jobId, "smoke-sketchup-job-001");

    const summary = getOrderRenderArtifactsSummary([fakeItem]);
    assert.equal(summary.hasArtifacts, true);
    assert.equal(summary.renderCount, 2);
    assert.equal(summary.previewCount, 1);
    assert.equal(summary.modelIncluded, true);

    console.log(`  ✓ Order #${order.id} → OCR #${recId} → Job accepted → Render artifact #${stored.id} saved`);
  });
});
