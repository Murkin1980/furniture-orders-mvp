import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { buildSketchUpCommandPlan } from "../../src/sketchup/command-plan.js";
import { signSketchUpNodeJob } from "../../src/sketchup/node-auth.js";
import { buildSketchUpNodeJob } from "../../src/sketchup/node-job.js";
import { createConfig } from "../src/config.js";
import { createApp } from "../src/server.js";

const NOW = "2026-06-16T10:00:00.000Z";
const SECRET = "test-secret-with-at-least-32-characters";

test("requires a safe signing secret", () => {
  assert.throws(() => createConfig({}, {}), /at least 32 characters/);
});

test("execution mode requires an explicit true value", () => {
  assert.equal(createConfig({ signingSecret: SECRET }, {}).executionEnabled, false);
  assert.equal(createConfig({ signingSecret: SECRET }, {
    SKETCHUP_NODE_EXECUTION_ENABLED: "true"
  }).executionEnabled, true);
  assert.equal(createConfig({ signingSecret: SECRET }, {
    SKETCHUP_NODE_EXECUTION_ENABLED: "1"
  }).executionEnabled, false);
});

test("health reports dry-run mode with execution disabled", async (t) => {
  const app = await runningApp(t);
  const response = await call(app, "GET", "/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.mode, "dry-run");
  assert.equal(response.body.data.executionEnabled, false);
});

test("accepts a valid signed job without executing SketchUp", async (t) => {
  const app = await runningApp(t);
  const job = await signedJob();
  const response = await sendJob(app, job);
  assert.equal(response.status, 202);
  assert.equal(response.body.data.status, "accepted");
  assert.equal(response.body.data.executed, false);
});

test("execution mode fails closed without manager approval", async (t) => {
  let calls = 0;
  const app = await runningApp(t, { executionEnabled: true }, {
    executePlan: async () => {
      calls += 1;
      return { executed: true };
    }
  });
  const response = await sendJob(app, await signedJob());
  assert.equal(response.status, 400);
  assert.equal(response.body.data.error, "manager_approval_required");
  assert.equal(response.body.data.executed, false);
  assert.equal(calls, 0);
});

test("executes only with gated mode, matching approval, and injected executor", async (t) => {
  let receivedPlan;
  const app = await runningApp(t, { executionEnabled: true }, {
    getManagerApproval: async (job) => ({
      approved: true,
      jobId: job.jobId,
      requestedBy: "manager@example.com",
      approvedAt: NOW
    }),
    executePlan: async (plan) => {
      receivedPlan = plan;
      return {
        executed: true,
        artifact: { type: "skp", reference: "render/job-service-001/model.skp" }
      };
    }
  });
  const response = await sendJob(app, await signedJob());
  assert.equal(response.status, 202);
  assert.equal(response.body.data.status, "accepted");
  assert.equal(response.body.data.executed, true);
  assert.equal(response.body.data.dryRun, false);
  assert.deepEqual(response.body.data.artifact, {
    type: "skp",
    reference: "render/job-service-001/model.skp"
  });
  assert.equal(receivedPlan.planVersion, "sketchup-command-plan/v1");
});

test("rejects a replayed idempotency key", async (t) => {
  const app = await runningApp(t);
  const job = await signedJob();
  assert.equal((await sendJob(app, job)).status, 202);
  const replay = await sendJob(app, job);
  assert.equal(replay.status, 409);
  assert.equal(replay.body.data.error, "duplicate_job");
});

test("rejects mismatched transport headers before job handling", async (t) => {
  const app = await runningApp(t);
  const job = await signedJob();
  const response = await call(app, "POST", "/v1/jobs", job, {
    "x-sketchup-signature": job.signature.value,
    "x-idempotency-key": "different-safe-key"
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "transport_mismatch");
  assert.equal(app.acceptedJobs.size, 0);
});

test("rejects invalid JSON and oversized requests", async (t) => {
  const app = await runningApp(t, { maxBodyBytes: 1024 });
  const invalid = await call(app, "POST", "/v1/jobs", "{", {});
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "invalid_json");
  const large = await call(app, "POST", "/v1/jobs", "x".repeat(1025), {});
  assert.equal(large.status, 413);
  assert.equal(large.body.error, "payload_too_large");
});

async function runningApp(t, overrides = {}, options = {}) {
  const app = createApp(
    { signingSecret: SECRET, host: "127.0.0.1", port: 0, ...overrides },
    { env: {}, now: NOW, ...options }
  );
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => app.server.close(resolve)));
  return app;
}

async function sendJob(app, job) {
  return call(app, "POST", "/v1/jobs", job, {
    "x-sketchup-signature": job.signature.value,
    "x-idempotency-key": job.idempotencyKey
  });
}

function call(app, method, path, body, headers = {}) {
  const raw = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  const address = app.server.address();
  return new Promise((resolve, reject) => {
    const req = request({
      host: "127.0.0.1",
      port: address.port,
      path,
      method,
      headers: { ...headers, "content-type": "application/json", "content-length": Buffer.byteLength(raw) }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8"))
      }));
    });
    req.on("error", reject);
    req.end(raw);
  });
}

async function signedJob() {
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
  const job = buildSketchUpNodeJob(plan, { jobId: "job-service-001", now: NOW }).job;
  return (await signSketchUpNodeJob(job, SECRET, { now: NOW })).job;
}
