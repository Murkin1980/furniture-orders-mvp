import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOrderSketchUpJobCore } from "../src/sketchup/order-job-core.js";
import { onRequestPost } from "../functions/api/orders/[id]/sketchup/jobs.js";

const NOW = "2026-06-16T09:00:00.000Z";
const SECRET = "test-secret-with-at-least-32-characters";
const BASE_URL = "https://sketchup-node.example.test";

test("requires explicit manager confirmation and approved recognition", async () => {
  const db = createDb(approvedRecognition());
  const confirmation = await createOrderSketchUpJobCore({ db }, 8, {
    recognitionId: 1, requestedBy: "manager-1", jobId: "job-test-001"
  }, options());
  db.recognition.status = "draft";
  const approval = await createOrderSketchUpJobCore({ db }, 8, input(), options());
  assert.equal(confirmation.body.error, "execution_confirmation_required");
  assert.equal(approval.body.error, "recognition_not_approved");
  assert.equal(db.jobs.length, 0);
});

test("saves pending audit before sender and completes accepted job", async () => {
  const db = createDb(approvedRecognition());
  let pendingSeen = false;
  const result = await createOrderSketchUpJobCore({
    db,
    sendNodeRequest: async (request) => {
      pendingSeen = db.jobs[0]?.status === "pending";
      const job = JSON.parse(request.body);
      return { ok: true, response: { status: "accepted", jobId: job.jobId, nodeJobId: "node-1" } };
    }
  }, 8, input(), options());
  assert.equal(pendingSeen, true);
  assert.equal(result.status, 201);
  assert.equal(db.jobs[0].status, "accepted");
  assert.equal(db.jobs[0].node_job_id, "node-1");
  assert.equal(db.jobs[0].plan_json.includes("signature"), false);
});

test("failed sender is audited and does not break the order", async () => {
  const db = createDb(approvedRecognition());
  const result = await createOrderSketchUpJobCore({
    db,
    sendNodeRequest: async () => ({ ok: false, error: "rate_limited", message: "No retry." })
  }, 8, input(), options());
  assert.equal(result.status, 200);
  assert.equal(result.body.item.status, "failed");
  assert.equal(db.jobs[0].error, "No retry.");
  assert.equal(db.order.status, "new");
});

test("explicit node rejection is audited without retry", async () => {
  const db = createDb(approvedRecognition());
  let calls = 0;
  const result = await createOrderSketchUpJobCore({
    db,
    sendNodeRequest: async (request) => {
      calls += 1;
      const job = JSON.parse(request.body);
      return { ok: true, response: { status: "rejected", jobId: job.jobId, message: "Manual node review required" } };
    }
  }, 8, input(), options());
  assert.equal(calls, 1);
  assert.equal(result.body.item.status, "rejected");
  assert.equal(db.jobs[0].error, "Manual node review required");
});

test("missing signing config creates failed audit without calling sender", async () => {
  const db = createDb(approvedRecognition());
  let calls = 0;
  const result = await createOrderSketchUpJobCore({
    db,
    sendNodeRequest: async () => { calls += 1; }
  }, 8, input(), { now: NOW, baseURL: BASE_URL });
  assert.equal(calls, 0);
  assert.equal(result.body.item.status, "failed");
  assert.equal(db.jobs[0].status, "failed");
});

test("audit insert failure prevents sender access", async () => {
  const db = createDb(approvedRecognition(), { failInsert: true });
  let calls = 0;
  await assert.rejects(
    createOrderSketchUpJobCore({
      db,
      sendNodeRequest: async () => { calls += 1; }
    }, 8, input(), options()),
    /audit insert failed/
  );
  assert.equal(calls, 0);
});

test("endpoint requires ops scope and stays disabled without explicit sender or flag", async () => {
  const unauthorized = await onRequestPost({
    request: request("write-token"),
    env: { ADMIN_WRITE_TOKEN: "write-token", OPS_TOKEN: "ops-token", DB: createDb(approvedRecognition()) },
    params: { id: "8" },
    data: { jobId: "job-test-001", now: NOW }
  });
  assert.equal(unauthorized.status, 401);

  const db = createDb(approvedRecognition());
  const disabled = await onRequestPost({
    request: request("ops-token"),
    env: {
      OPS_TOKEN: "ops-token",
      DB: db,
      SKETCHUP_NODE_SIGNING_SECRET: SECRET,
      SKETCHUP_NODE_BASE_URL: BASE_URL
    },
    params: { id: "8" },
    data: { jobId: "job-test-001", now: NOW }
  });
  assert.equal(disabled.status, 200);
  assert.equal(db.jobs[0].status, "failed");
  assert.match(db.jobs[0].error, /sender is not configured/i);
});

test("endpoint uses injected sender and never calls global fetch", async () => {
  const db = createDb(approvedRecognition());
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls += 1; };
  try {
    const response = await onRequestPost({
      request: request("ops-token"),
      env: {
        OPS_TOKEN: "ops-token",
        DB: db,
        SKETCHUP_NODE_SIGNING_SECRET: SECRET,
        SKETCHUP_NODE_BASE_URL: BASE_URL
      },
      params: { id: "8" },
      data: {
        jobId: "job-test-001",
        now: NOW,
        sendNodeRequest: async (nodeRequest) => {
          const job = JSON.parse(nodeRequest.body);
          return { ok: true, response: { status: "accepted", jobId: job.jobId } };
        }
      }
    });
    assert.equal(response.status, 201);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("migration stores audit data without signature or secret columns", async () => {
  const sql = await readFile(new URL("../migrations/0020_sketchup_jobs.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sketchup_jobs/);
  assert.match(sql, /plan_json TEXT NOT NULL/);
  assert.equal(/\bsignature\b/i.test(sql), false);
  assert.equal(/\bsecret\b/i.test(sql), false);
});

function input() {
  return { recognitionId: 1, requestedBy: "manager-1", confirmExecution: true, jobId: "job-test-001" };
}
function options() {
  return { now: NOW, signingSecret: SECRET, baseURL: BASE_URL };
}
function request(token) {
  return new Request("https://example.test/api/orders/8/sketchup/jobs", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input())
  });
}
function approvedRecognition() {
  return {
    id: 1,
    orderId: 8,
    status: "approved",
    reviewedBy: "manager-1",
    reviewedAt: NOW,
    resultJson: JSON.stringify({
      documentType: "furniture_sketch",
      furnitureType: "wardrobe",
      rawText: "Wardrobe 2400 x 2600 x 600 mm",
      dimensions: [
        { label: "width", value: 2400, unit: "mm", confidence: 1, sourceText: "2400" },
        { label: "height", value: 2600, unit: "mm", confidence: 1, sourceText: "2600" },
        { label: "depth", value: 600, unit: "mm", confidence: 1, sourceText: "600" }
      ],
      components: [], materials: [], notes: [], warnings: [], missingInfo: [], confidence: 1
    })
  };
}
function createDb(recognition, config = {}) {
  const state = {
    recognition,
    jobs: [],
    order: { id: 8, status: "new" },
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes("FROM ocr_recognitions")) {
                return state.recognition && values[0] === state.recognition.id && values[1] === state.recognition.orderId
                  ? { ...state.recognition }
                  : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO sketchup_jobs")) {
                if (config.failInsert) throw new Error("audit insert failed");
                const keys = [
                  "order_id", "recognition_id", "job_id", "idempotency_key", "status",
                  "model_version", "plan_version", "plan_json", "requested_by", "requested_at"
                ];
                state.jobs.push(Object.fromEntries(keys.map((key, index) => [key, values[index]])));
                return { meta: { last_row_id: state.jobs.length } };
              }
              if (sql.includes("UPDATE sketchup_jobs")) {
                const job = state.jobs.find((item) => item.job_id === values[4]);
                Object.assign(job, {
                  status: values[0], node_job_id: values[1], error: values[2], completed_at: values[3]
                });
              }
              return { success: true };
            }
          };
        }
      };
    }
  };
  return state;
}
