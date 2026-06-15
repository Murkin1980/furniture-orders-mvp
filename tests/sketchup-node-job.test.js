import test from "node:test";
import assert from "node:assert/strict";
import { buildSketchUpCommandPlan } from "../src/sketchup/command-plan.js";
import {
  MAX_SKETCHUP_JOB_TTL_MS,
  SKETCHUP_NODE_JOB_TYPE,
  SKETCHUP_NODE_JOB_VERSION,
  buildSketchUpNodeJob,
  canonicalizeSketchUpJob,
  validateSketchUpNodeJob
} from "../src/sketchup/node-job.js";

const NOW = "2026-06-15T12:00:00.000Z";

test("builds a versioned signature-ready node job", () => {
  const result = buildJob();
  assert.equal(result.ok, true);
  assert.equal(result.job.jobVersion, SKETCHUP_NODE_JOB_VERSION);
  assert.equal(result.job.jobType, SKETCHUP_NODE_JOB_TYPE);
  assert.deepEqual(result.job.signature, { algorithm: "hmac-sha256", value: "" });
  assert.equal(result.job.signatureInput.length > 100, true);
});

test("preserves source audit and plan versions", () => {
  const { job } = buildJob();
  assert.deepEqual(job.source, {
    orderId: 8,
    recognitionId: 1,
    planVersion: "sketchup-command-plan/v1",
    modelVersion: "furniture-model/v1"
  });
});

test("uses bounded explicit timing and deterministic idempotency key", () => {
  const { job } = buildJob();
  assert.equal(job.createdAt, NOW);
  assert.equal(job.expiresAt, "2026-06-15T12:05:00.000Z");
  assert.equal(job.idempotencyKey, "sketchup:8:1:job-test-001");
});

test("requires a safe explicit job ID", () => {
  const result = buildSketchUpNodeJob(commandPlan(), { now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_job_id");
});

test("rejects invalid or excessive TTL", () => {
  const result = buildSketchUpNodeJob(commandPlan(), {
    jobId: "job-test-001",
    now: NOW,
    ttlMs: MAX_SKETCHUP_JOB_TTL_MS + 1
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_job_timing");
});

test("rejects an invalid command plan", () => {
  const plan = commandPlan();
  plan.commands.push({ type: "execute_ruby" });
  const result = buildSketchUpNodeJob(plan, { jobId: "job-test-001", now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_command_plan");
});

test("validator detects payload tampering", () => {
  const { job } = buildJob();
  job.payload.commandPlan.commands[1].dimensions.widthMm = 9999;
  assert.deepEqual(validateSketchUpNodeJob(job, { now: NOW }), {
    ok: false,
    error: "signature_input_mismatch"
  });
});

test("validator detects source mismatch", () => {
  const { job } = buildJob();
  job.source.orderId = 9;
  assert.deepEqual(validateSketchUpNodeJob(job, { now: NOW }), {
    ok: false,
    error: "source_mismatch"
  });
});

test("validator rejects expired jobs", () => {
  const { job } = buildJob();
  assert.deepEqual(validateSketchUpNodeJob(job, { now: job.expiresAt }), {
    ok: false,
    error: "job_expired"
  });
});

test("validator rejects an unverified signature value", () => {
  const { job } = buildJob();
  job.signature.value = "not-verified";
  assert.deepEqual(validateSketchUpNodeJob(job, { now: NOW }), {
    ok: false,
    error: "invalid_signature_contract"
  });
});

test("validator rejects unsafe identity fields", () => {
  const { job } = buildJob();
  job.idempotencyKey = "<script>";
  assert.deepEqual(validateSketchUpNodeJob(job, { now: NOW }), {
    ok: false,
    error: "invalid_job_identity"
  });
});

test("canonicalization is stable across object key order", () => {
  assert.equal(
    canonicalizeSketchUpJob({ b: 2, a: { d: 4, c: 3 } }),
    canonicalizeSketchUpJob({ a: { c: 3, d: 4 }, b: 2 })
  );
});

test("does not mutate the command plan", () => {
  const plan = commandPlan();
  const snapshot = structuredClone(plan);
  buildSketchUpNodeJob(plan, { jobId: "job-test-001", now: NOW });
  assert.deepEqual(plan, snapshot);
});

function buildJob() {
  return buildSketchUpNodeJob(commandPlan(), {
    jobId: "job-test-001",
    now: NOW
  });
}

function commandPlan() {
  return buildSketchUpCommandPlan({
    modelVersion: "furniture-model/v1",
    source: { orderId: 8, recognitionId: 1 },
    furnitureType: "wardrobe",
    overall: { width: 2400, height: 2600, depth: 600 },
    components: [{ id: "component-1", label: "doors" }],
    materials: ["MDF"],
    notes: [],
    warnings: [],
    readyForSketchUp: true
  }).plan;
}
