import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createFileApprovalResolver,
  createFileQueueExecutor
} from "../src/file-queue-executor.js";
import { createRuntimeOptions } from "../src/runtime.js";

const JOB_ID = "job-queue-001";
const PLAN = {
  planVersion: "sketchup-command-plan/v1",
  commands: [{ type: "set_units", unit: "millimeter" }]
};

test("writes a versioned request and accepts a safe SKP response", async (t) => {
  const queueDir = await temporaryQueue(t);
  await writeResponse(queueDir, {
    jobId: JOB_ID,
    status: "executed",
    executed: true,
    artifact: { type: "skp", reference: `artifacts/${JOB_ID}/model.skp` }
  });
  const executePlan = createFileQueueExecutor({ queueDir, pollMs: 50, timeoutMs: 1000 });
  const result = await executePlan(PLAN, { jobId: JOB_ID, requestedBy: "manager@example.com" });

  assert.equal(result.executed, true);
  assert.equal(result.artifact.reference, `artifacts/${JOB_ID}/model.skp`);
  const request = JSON.parse(await readFile(path.join(queueDir, "inbox", `${JOB_ID}.json`), "utf8"));
  assert.equal(request.bridgeVersion, "furniture-sketchup-file-queue/v1");
  assert.equal(request.requestedBy, "manager@example.com");
  assert.deepEqual(request.commandPlan, PLAN);
});

test("rejects unsafe artifact references", async (t) => {
  const queueDir = await temporaryQueue(t);
  await writeResponse(queueDir, {
    jobId: JOB_ID,
    status: "executed",
    executed: true,
    artifact: { type: "skp", reference: "../../outside.skp" }
  });
  const executePlan = createFileQueueExecutor({ queueDir, pollMs: 50, timeoutMs: 1000 });
  await assert.rejects(
    executePlan(PLAN, { jobId: JOB_ID, requestedBy: "manager@example.com" }),
    /safe SKP artifact/
  );
});

test("requires an absolute queue directory and safe job identity", async (t) => {
  assert.throws(() => createFileQueueExecutor({ queueDir: "relative" }), /absolute/);
  const queueDir = await temporaryQueue(t);
  const executePlan = createFileQueueExecutor({ queueDir });
  await assert.rejects(executePlan(PLAN, { jobId: "../bad", requestedBy: "manager" }), /safe/);
});

test("reads matching manager approval from the queue", async (t) => {
  const queueDir = await temporaryQueue(t);
  const approvals = path.join(queueDir, "approvals");
  await mkdir(approvals, { recursive: true });
  await writeFile(path.join(approvals, `${JOB_ID}.json`), JSON.stringify({
    approved: true,
    jobId: JOB_ID,
    requestedBy: "manager@example.com",
    approvedAt: "2026-06-20T12:00:00.000Z",
    ignored: "value"
  }));
  const resolveApproval = createFileApprovalResolver({ queueDir });
  assert.deepEqual(await resolveApproval({ jobId: JOB_ID }), {
    approved: true,
    jobId: JOB_ID,
    requestedBy: "manager@example.com",
    approvedAt: "2026-06-20T12:00:00.000Z"
  });
});

test("missing approval fails closed and disabled runtime needs no queue", async (t) => {
  const queueDir = await temporaryQueue(t);
  const resolveApproval = createFileApprovalResolver({ queueDir });
  assert.equal(await resolveApproval({ jobId: JOB_ID }), null);
  assert.deepEqual(createRuntimeOptions({}), {});
  assert.throws(
    () => createRuntimeOptions({ SKETCHUP_NODE_EXECUTION_ENABLED: "true" }),
    /absolute SKETCHUP_NODE_QUEUE_DIR/
  );
});

test("enabled runtime creates file queue executor and approval resolver", async (t) => {
  const queueDir = await temporaryQueue(t);
  const options = createRuntimeOptions({
    SKETCHUP_NODE_EXECUTION_ENABLED: "true",
    SKETCHUP_NODE_QUEUE_DIR: queueDir,
    SKETCHUP_NODE_QUEUE_TIMEOUT_MS: "1000",
    SKETCHUP_NODE_QUEUE_POLL_MS: "50"
  });

  assert.equal(typeof options.executePlan, "function");
  assert.equal(typeof options.getManagerApproval, "function");
});

async function temporaryQueue(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "furniture-sketchup-queue-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function writeResponse(queueDir, response) {
  const outbox = path.join(queueDir, "outbox");
  await mkdir(outbox, { recursive: true });
  await writeFile(path.join(outbox, `${JOB_ID}.json`), JSON.stringify(response));
}
