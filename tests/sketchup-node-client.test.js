import test from "node:test";
import assert from "node:assert/strict";
import { buildSketchUpCommandPlan } from "../src/sketchup/command-plan.js";
import { sendSketchUpNodeJob } from "../src/sketchup/node-client.js";
import { buildSketchUpNodeJob } from "../src/sketchup/node-job.js";

const NOW = "2026-06-15T12:00:00.000Z";

test("local fake-node smoke accepts a valid job", async () => {
  const result = await sendSketchUpNodeJob(nodeJob(), {
    now: NOW,
    sendNodeRequest: async (job) => ({
      status: "accepted",
      jobId: job.jobId,
      nodeJobId: "fake-node-job-1",
      message: "Queued by fake node"
    })
  });
  assert.deepEqual(result, {
    ok: true,
    status: "accepted",
    jobId: "job-test-001",
    nodeJobId: "fake-node-job-1",
    message: "Queued by fake node",
    error: "",
    meta: { attempts: 1 }
  });
});

test("calls injected sender exactly once with a cloned job", async () => {
  const job = nodeJob();
  let received;
  let calls = 0;
  await sendSketchUpNodeJob(job, {
    now: NOW,
    sendNodeRequest: async (value) => {
      calls += 1;
      received = value;
      value.jobId = "mutated";
      return { status: "accepted", jobId: "job-test-001" };
    }
  });
  assert.equal(calls, 1);
  assert.equal(received.jobVersion, "sketchup-node-job/v1");
  assert.equal(job.jobId, "job-test-001");
});

test("requires injected sender and never falls back to fetch", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("must not run");
  };
  try {
    const result = await sendSketchUpNodeJob(nodeJob(), { now: NOW });
    assert.equal(result.error, "sender_required");
    assert.equal(result.meta.attempts, 0);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid job before calling sender", async () => {
  const job = nodeJob();
  job.payload.commandPlan.commands.push({ type: "execute_ruby" });
  let calls = 0;
  const result = await sendSketchUpNodeJob(job, {
    now: NOW,
    sendNodeRequest: async () => {
      calls += 1;
    }
  });
  assert.equal(result.error, "invalid_job");
  assert.equal(result.meta.attempts, 0);
  assert.equal(calls, 0);
});

test("rejects expired job before calling sender", async () => {
  let calls = 0;
  const result = await sendSketchUpNodeJob(nodeJob(), {
    now: "2026-06-15T12:06:00.000Z",
    sendNodeRequest: async () => {
      calls += 1;
    }
  });
  assert.equal(result.error, "invalid_job");
  assert.match(result.message, /job_expired/);
  assert.equal(calls, 0);
});

test("normalizes explicit node rejection", async () => {
  const result = await sendSketchUpNodeJob(nodeJob(), {
    now: NOW,
    sendNodeRequest: async (job) => ({
      status: "rejected",
      jobId: job.jobId,
      message: "Node is in maintenance"
    })
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "rejected");
  assert.equal(result.error, "node_rejected");
  assert.equal(result.meta.attempts, 1);
});

test("fails safely on sender error without retry", async () => {
  let calls = 0;
  const result = await sendSketchUpNodeJob(nodeJob(), {
    now: NOW,
    sendNodeRequest: async () => {
      calls += 1;
      throw new Error("fake node unavailable");
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.error, "node_request_failed");
  assert.equal(result.message, "fake node unavailable");
  assert.equal(result.meta.attempts, 1);
});

test("rejects invalid response and job ID mismatch", async () => {
  const invalid = await sendSketchUpNodeJob(nodeJob(), {
    now: NOW,
    sendNodeRequest: async () => ({ status: "queued", jobId: "job-test-001" })
  });
  const mismatch = await sendSketchUpNodeJob(nodeJob(), {
    now: NOW,
    sendNodeRequest: async () => ({ status: "accepted", jobId: "another-job" })
  });
  assert.equal(invalid.error, "invalid_node_response");
  assert.equal(mismatch.error, "job_id_mismatch");
});

function nodeJob() {
  const plan = buildSketchUpCommandPlan({
    modelVersion: "furniture-model/v1",
    source: { orderId: 8, recognitionId: 1 },
    furnitureType: "wardrobe",
    overall: { width: 2400, height: 2600, depth: 600 },
    components: [],
    materials: [],
    notes: [],
    warnings: [],
    readyForSketchUp: true
  }).plan;
  return buildSketchUpNodeJob(plan, { jobId: "job-test-001", now: NOW }).job;
}
