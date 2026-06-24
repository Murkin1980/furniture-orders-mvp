import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  listOrderRenderArtifactsCore,
  saveOrderRenderArtifactCore
} from "../src/sketchup/render-core.js";
import {
  onRequestGet,
  onRequestPost
} from "../functions/api/orders/[id]/sketchup/render-artifacts.js";

const HASH = "b".repeat(64);
const NOW = "2026-06-20T09:00:00.000Z";

test("saves a render artifact for an accepted SketchUp job", async () => {
  const db = createDb({ jobStatus: "accepted" });
  const result = await saveOrderRenderArtifactCore({ db }, 8, input(), { now: NOW, reportedBy: "node-service" });

  assert.equal(result.status, 201);
  assert.equal(result.body.item.orderId, 8);
  assert.equal(result.body.item.jobId, "job-render-001");
  assert.equal(result.body.item.primaryStorageKey, "orders/8/render/main.webp");
  assert.equal(result.body.item.modelStorageKey, "orders/8/model/design.skp");
  assert.equal(result.body.item.reportedBy, "node-service");
  assert.equal(db.renderArtifacts.length, 1);
});

test("updates an existing artifact for the same job id", async () => {
  const db = createDb({ jobStatus: "accepted" });
  await saveOrderRenderArtifactCore({ db }, 8, input(), { now: NOW });
  const updated = await saveOrderRenderArtifactCore({ db }, 8, {
    ...input(),
    files: [
      modelFile(),
      { ...renderFile(), storageKey: "orders/8/render/updated.webp", bytes: 9000 }
    ]
  }, { now: NOW });

  assert.equal(updated.status, 200);
  assert.equal(db.renderArtifacts.length, 1);
  assert.equal(updated.body.item.primaryStorageKey, "orders/8/render/updated.webp");
});

test("lists render artifacts for an order without mutating stored manifests", async () => {
  const db = createDb({ jobStatus: "accepted" });
  await saveOrderRenderArtifactCore({ db }, 8, input(), { now: NOW });
  const result = await listOrderRenderArtifactsCore({ db }, 8);

  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 1);
  assert.equal(result.body.items[0].jobId, "job-render-001");
  assert.equal(result.body.items[0].manifest.files[1].role, "render");
  assert.equal(db.renderArtifacts.length, 1);
});

test("list rejects invalid order id", async () => {
  const result = await listOrderRenderArtifactsCore({ db: createDb({ jobStatus: "accepted" }) }, "bad");

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid_render_artifact_request");
});

test("rejects missing, failed, or mismatched SketchUp jobs", async () => {
  const missing = await saveOrderRenderArtifactCore({ db: createDb({ jobStatus: "" }) }, 8, input(), { now: NOW });
  const failed = await saveOrderRenderArtifactCore({ db: createDb({ jobStatus: "failed" }) }, 8, input(), { now: NOW });
  const invalidOrder = await saveOrderRenderArtifactCore({ db: createDb({ jobStatus: "accepted" }) }, "bad", input(), { now: NOW });

  assert.equal(missing.status, 404);
  assert.equal(failed.body.error, "sketchup_job_not_accepted");
  assert.equal(invalidOrder.body.error, "invalid_render_artifact_request");
});

test("rejects invalid artifact payloads before saving", async () => {
  const db = createDb({ jobStatus: "accepted" });
  const result = await saveOrderRenderArtifactCore({ db }, 8, {
    ...input(),
    files: [modelFile()]
  }, { now: NOW });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "render_or_preview_required");
  assert.equal(db.renderArtifacts.length, 0);
});

test("endpoint requires ops scope and saves with authorized token", async () => {
  const unauthorized = await onRequestPost({
    request: request("write-token"),
    env: { ADMIN_WRITE_TOKEN: "write-token", OPS_TOKEN: "ops-token", DB: createDb({ jobStatus: "accepted" }) },
    params: { id: "8" },
    data: { now: NOW }
  });
  assert.equal(unauthorized.status, 401);

  const db = createDb({ jobStatus: "accepted" });
  const response = await onRequestPost({
    request: request("ops-token"),
    env: { OPS_TOKEN: "ops-token", DB: db },
    params: { id: "8" },
    data: { now: NOW }
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.item.jobId, "job-render-001");
  assert.equal(db.renderArtifacts[0].job_id, "job-render-001");
});

test("GET endpoint lists render artifacts with read token", async () => {
  const db = createDb({ jobStatus: "accepted" });
  await saveOrderRenderArtifactCore({ db }, 8, input(), { now: NOW });

  const unauthorized = await onRequestGet({
    request: getRequest("bad-token"),
    env: { ADMIN_READ_TOKEN: "read-token", DB: db },
    params: { id: "8" }
  });
  assert.equal(unauthorized.status, 401);

  const response = await onRequestGet({
    request: getRequest("read-token"),
    env: { ADMIN_READ_TOKEN: "read-token", DB: db },
    params: { id: "8" }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].primaryStorageKey, "orders/8/render/main.webp");
});

test("endpoint rejects invalid JSON without saving", async () => {
  const db = createDb({ jobStatus: "accepted" });
  const response = await onRequestPost({
    request: new Request("https://example.test/api/orders/8/sketchup/render-artifacts", {
      method: "POST",
      headers: { Authorization: "Bearer ops-token", "Content-Type": "application/json" },
      body: "{"
    }),
    env: { OPS_TOKEN: "ops-token", DB: db },
    params: { id: "8" },
    data: { now: NOW }
  });

  assert.equal(response.status, 400);
  assert.equal(db.renderArtifacts.length, 0);
});

test("migration creates render artifact table without binary blobs", async () => {
  const sql = await readFile(new URL("../migrations/0021_sketchup_render_artifacts.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sketchup_render_artifacts/);
  assert.match(sql, /manifest_json TEXT NOT NULL/);
  assert.equal(/\bBLOB\b/i.test(sql), false);
});

function input() {
  return {
    jobId: "job-render-001",
    reportedBy: "node-service",
    files: [modelFile(), renderFile()]
  };
}

function modelFile() {
  return {
    role: "model",
    mediaType: "application/vnd.sketchup.skp",
    storageKey: "orders/8/model/design.skp",
    bytes: 12000,
    sha256: HASH
  };
}

function renderFile() {
  return {
    role: "render",
    mediaType: "image/webp",
    storageKey: "orders/8/render/main.webp",
    bytes: 8000,
    sha256: HASH
  };
}

function request(token) {
  return new Request("https://example.test/api/orders/8/sketchup/render-artifacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input())
  });
}

function getRequest(token) {
  return new Request("https://example.test/api/orders/8/sketchup/render-artifacts", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function createDb({ jobStatus }) {
  const state = {
    renderArtifacts: [],
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes("FROM sketchup_jobs")) {
                return jobStatus
                  ? { id: 1, orderId: values[1], jobId: values[0], status: jobStatus }
                  : null;
              }
              if (sql.includes("FROM sketchup_render_artifacts")) {
                const item = state.renderArtifacts.find((artifact) => artifact.job_id === values[0]);
                return item ? toRow(item) : null;
              }
              return null;
            },
            async all() {
              if (sql.includes("FROM sketchup_render_artifacts") && sql.includes("WHERE order_id = ?")) {
                return {
                  results: state.renderArtifacts
                    .filter((artifact) => artifact.order_id === values[0])
                    .map(toRow)
                };
              }
              return { results: [] };
            },
            async run() {
              if (sql.includes("INSERT INTO sketchup_render_artifacts")) {
                const keys = [
                  "order_id", "job_id", "artifact_version", "status",
                  "primary_storage_key", "model_storage_key", "manifest_json", "reported_by"
                ];
                state.renderArtifacts.push({
                  id: state.renderArtifacts.length + 1,
                  ...Object.fromEntries(keys.map((key, index) => [key, values[index]])),
                  created_at: NOW,
                  updated_at: NOW
                });
              }
              if (sql.includes("UPDATE sketchup_render_artifacts")) {
                const item = state.renderArtifacts.find((artifact) => artifact.job_id === values[6]);
                Object.assign(item, {
                  artifact_version: values[0],
                  status: values[1],
                  primary_storage_key: values[2],
                  model_storage_key: values[3],
                  manifest_json: values[4],
                  reported_by: values[5],
                  updated_at: NOW
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

function toRow(item) {
  return {
    id: item.id,
    orderId: item.order_id,
    jobId: item.job_id,
    artifactVersion: item.artifact_version,
    status: item.status,
    primaryStorageKey: item.primary_storage_key,
    modelStorageKey: item.model_storage_key,
    manifestJson: item.manifest_json,
    reportedBy: item.reported_by,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}
