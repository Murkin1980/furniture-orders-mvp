import test from "node:test";
import assert from "node:assert/strict";

import {
  createRenderStorageKey,
  normalizeRenderFile,
  uploadSketchUpRenderFile
} from "../src/sketchup/render-file.js";
import { onRequestPost } from "../functions/api/orders/[id]/sketchup/render-files.js";

const HASH = "74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0";

test("uploads a render file for an accepted SketchUp job", async () => {
  const bucket = createBucket();
  const result = await uploadSketchUpRenderFile({
    db: createDb("accepted"),
    bucket
  }, 8, file("image/webp", "render"), {
    jobId: "job-render-001",
    role: "render"
  }, {
    fileId: "file-1"
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.file.storageKey, "sketchup/orders/8/job-render-001/render/file-1.webp");
  assert.equal(result.body.file.sha256, HASH);
  assert.equal(bucket.objects[0].metadata.customMetadata.jobId, "job-render-001");
});

test("rejects missing bucket before reading file", async () => {
  let read = false;
  const result = await uploadSketchUpRenderFile({
    db: createDb("accepted"),
    bucket: null
  }, 8, {
    type: "image/webp",
    size: 5,
    async arrayBuffer() {
      read = true;
      return new ArrayBuffer(5);
    }
  }, {
    jobId: "job-render-001",
    role: "render"
  });

  assert.equal(result.status, 503);
  assert.equal(read, false);
});

test("rejects non-accepted jobs and invalid role/type combinations", async () => {
  const failed = await uploadSketchUpRenderFile({
    db: createDb("failed"),
    bucket: createBucket()
  }, 8, file("image/webp", "render"), {
    jobId: "job-render-001",
    role: "render"
  });
  const wrongType = await uploadSketchUpRenderFile({
    db: createDb("accepted"),
    bucket: createBucket()
  }, 8, file("application/vnd.sketchup.skp", "design"), {
    jobId: "job-render-001",
    role: "render"
  });

  assert.equal(failed.body.error, "sketchup_job_not_accepted");
  assert.equal(wrongType.body.error, "validation_error");
});

test("normalizes files and storage keys safely", async () => {
  const normalized = await normalizeRenderFile(file("application/vnd.sketchup.skp", "design"), "model");
  assert.equal(normalized.ok, true);
  assert.equal(normalized.extension, "skp");
  assert.equal(createRenderStorageKey(8, "job bad/id", "model", "skp", { fileId: "fixed" }), "sketchup/orders/8/job-bad-id/model/fixed.skp");
});

test("endpoint requires ops token and uploads through configured bucket", async () => {
  const unauthorized = await onRequestPost({
    request: request("write-token"),
    env: { ADMIN_WRITE_TOKEN: "write-token", OPS_TOKEN: "ops-token", DB: createDb("accepted"), SKETCHUP_RENDER_BUCKET: createBucket() },
    params: { id: "8" },
    data: { fileId: "file-1" }
  });
  assert.equal(unauthorized.status, 401);

  const bucket = createBucket();
  const response = await onRequestPost({
    request: request("ops-token"),
    env: { OPS_TOKEN: "ops-token", DB: createDb("accepted"), SKETCHUP_RENDER_BUCKET: bucket },
    params: { id: "8" },
    data: { fileId: "file-1" }
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.file.storageKey, "sketchup/orders/8/job-render-001/render/file-1.webp");
  assert.equal(bucket.objects.length, 1);
});

test("endpoint does not call global fetch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls += 1; };
  try {
    const response = await onRequestPost({
      request: request("ops-token"),
      env: { OPS_TOKEN: "ops-token", DB: createDb("accepted"), SKETCHUP_RENDER_BUCKET: createBucket() },
      params: { id: "8" },
      data: { fileId: "file-1" }
    });
    assert.equal(response.status, 201);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function request(token) {
  const form = new FormData();
  form.set("jobId", "job-render-001");
  form.set("role", "render");
  form.set("file", file("image/webp", "render"));
  return new Request("https://example.test/api/orders/8/sketchup/render-files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
}

function file(type, name) {
  return new File([new Uint8Array([1, 2, 3, 4, 5])], `${name}.bin`, { type });
}

function createBucket() {
  return {
    objects: [],
    async put(key, value, metadata) {
      this.objects.push({ key, value, metadata });
    }
  };
}

function createDb(jobStatus) {
  return {
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
              return null;
            }
          };
        }
      };
    }
  };
}
