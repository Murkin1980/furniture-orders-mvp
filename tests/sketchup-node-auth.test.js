import test from "node:test";
import assert from "node:assert/strict";
import { buildSketchUpCommandPlan } from "../src/sketchup/command-plan.js";
import {
  buildSketchUpNodeRequest,
  signSketchUpNodeJob,
  verifySketchUpNodeJobSignature
} from "../src/sketchup/node-auth.js";
import { buildSketchUpNodeJob, validateSketchUpNodeJob } from "../src/sketchup/node-job.js";

const NOW = "2026-06-15T12:00:00.000Z";
const SECRET = "test-secret-with-at-least-32-characters";

test("signs canonical input without mutating or exposing the secret", async () => {
  const job = unsignedJob();
  const snapshot = structuredClone(job);
  const result = await signSketchUpNodeJob(job, SECRET, { now: NOW });
  assert.equal(result.ok, true);
  assert.match(result.job.signature.value, /^[a-f0-9]{64}$/);
  assert.deepEqual(job, snapshot);
  assert.equal(JSON.stringify(result).includes(SECRET), false);
});

test("verifies a valid HMAC signature", async () => {
  const signed = await signedJob();
  const result = await verifySketchUpNodeJobSignature(signed, SECRET, { now: NOW });
  assert.equal(result.ok, true);
});

test("rejects a wrong signing secret", async () => {
  const signed = await signedJob();
  const result = await verifySketchUpNodeJobSignature(
    signed,
    "another-secret-with-at-least-32-characters",
    { now: NOW }
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, "signature_mismatch");
});

test("detects payload tampering before signature verification", async () => {
  const signed = await signedJob();
  signed.payload.commandPlan.commands[1].dimensions.widthMm = 9999;
  const result = await verifySketchUpNodeJobSignature(signed, SECRET, { now: NOW });
  assert.equal(result.error, "invalid_signed_job");
  assert.equal(result.message, "signature_input_mismatch");
});

test("requires a sufficiently long secret", async () => {
  const result = await signSketchUpNodeJob(unsignedJob(), "short", { now: NOW });
  assert.equal(result.error, "invalid_signing_secret");
});

test("unsigned validator remains fail closed for signed jobs by default", async () => {
  const signed = await signedJob();
  assert.equal(validateSketchUpNodeJob(signed, { now: NOW }).error, "invalid_signature_contract");
  assert.equal(validateSketchUpNodeJob(signed, { now: NOW, allowSigned: true }).ok, true);
});

test("builds an HTTPS request object without calling fetch", async () => {
  const signed = await signedJob();
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
  };
  try {
    const result = buildSketchUpNodeRequest(signed, {
      baseURL: "https://sketchup-node.example.test/",
      now: NOW
    });
    assert.equal(result.ok, true);
    assert.equal(result.request.url, "https://sketchup-node.example.test/v1/jobs");
    assert.equal(result.request.method, "POST");
    assert.equal(result.request.headers["x-sketchup-signature"], signed.signature.value);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request builder rejects unsigned jobs and insecure URLs", async () => {
  const unsigned = buildSketchUpNodeRequest(unsignedJob(), {
    baseURL: "https://sketchup-node.example.test",
    now: NOW
  });
  const insecure = buildSketchUpNodeRequest(await signedJob(), {
    baseURL: "http://127.0.0.1:3000",
    now: NOW
  });
  assert.equal(unsigned.error, "signature_required");
  assert.equal(insecure.error, "invalid_node_url");
});

test("request body does not contain the signing secret", async () => {
  const result = buildSketchUpNodeRequest(await signedJob(), {
    baseURL: "https://sketchup-node.example.test",
    now: NOW
  });
  assert.equal(result.request.body.includes(SECRET), false);
});

async function signedJob() {
  return (await signSketchUpNodeJob(unsignedJob(), SECRET, { now: NOW })).job;
}

function unsignedJob() {
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
