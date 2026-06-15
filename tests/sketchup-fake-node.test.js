import test from "node:test";
import assert from "node:assert/strict";
import { buildSketchUpCommandPlan } from "../src/sketchup/command-plan.js";
import { buildDryRunSummary, handleFakeSketchUpNodeJob } from "../src/sketchup/fake-node.js";
import { signSketchUpNodeJob } from "../src/sketchup/node-auth.js";
import { buildSketchUpNodeJob } from "../src/sketchup/node-job.js";

const NOW = "2026-06-16T10:00:00.000Z";
const SECRET = "test-secret-with-at-least-32-characters";

test("accepts a signed job as dry-run without executing SketchUp", async () => {
  const store = idempotencyStore();
  const result = await handleFakeSketchUpNodeJob(await signedJob(), {
    signingSecret: SECRET, now: NOW, ...store
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.executed, false);
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.summary.dimensions, { widthMm: 2400, heightMm: 2600, depthMm: 600 });
  assert.deepEqual(result.summary.commandTypes, ["set_units", "create_envelope", "attach_metadata"]);
});

test("rejects wrong signature before idempotency access", async () => {
  let checks = 0;
  const result = await handleFakeSketchUpNodeJob(await signedJob(), {
    signingSecret: "another-secret-with-at-least-32-characters",
    now: NOW,
    hasIdempotencyKey: async () => { checks += 1; },
    markIdempotencyKey: async () => {}
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.error, "signature_mismatch");
  assert.equal(checks, 0);
});

test("rejects expired job before idempotency access", async () => {
  let checks = 0;
  const result = await handleFakeSketchUpNodeJob(await signedJob(), {
    signingSecret: SECRET,
    now: "2026-06-16T10:06:00.000Z",
    hasIdempotencyKey: async () => { checks += 1; },
    markIdempotencyKey: async () => {}
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.error, "invalid_signed_job");
  assert.equal(checks, 0);
});

test("requires an injected idempotency store", async () => {
  const result = await handleFakeSketchUpNodeJob(await signedJob(), {
    signingSecret: SECRET, now: NOW
  });
  assert.equal(result.error, "idempotency_store_required");
});

test("rejects replayed idempotency key", async () => {
  const store = idempotencyStore();
  const job = await signedJob();
  const first = await handleFakeSketchUpNodeJob(job, { signingSecret: SECRET, now: NOW, ...store });
  const second = await handleFakeSketchUpNodeJob(job, { signingSecret: SECRET, now: NOW, ...store });
  assert.equal(first.status, "accepted");
  assert.equal(second.status, "rejected");
  assert.equal(second.error, "duplicate_job");
});

test("marks idempotency only after successful validation", async () => {
  const store = idempotencyStore();
  const job = await signedJob();
  job.payload.commandPlan.commands[1].dimensions.widthMm = 9999;
  const result = await handleFakeSketchUpNodeJob(job, { signingSecret: SECRET, now: NOW, ...store });
  assert.equal(result.status, "rejected");
  assert.equal(store.values.size, 0);
});

test("dry-run summary contains no executable code", () => {
  const summary = buildDryRunSummary(commandPlan());
  assert.equal(JSON.stringify(summary).includes("script"), false);
  assert.equal(JSON.stringify(summary).includes("ruby"), false);
});

function idempotencyStore() {
  const values = new Map();
  return {
    values,
    hasIdempotencyKey: async (key) => values.has(key),
    markIdempotencyKey: async (key, value) => values.set(key, value)
  };
}

async function signedJob() {
  const job = buildSketchUpNodeJob(commandPlan(), { jobId: "job-test-001", now: NOW }).job;
  return (await signSketchUpNodeJob(job, SECRET, { now: NOW })).job;
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
