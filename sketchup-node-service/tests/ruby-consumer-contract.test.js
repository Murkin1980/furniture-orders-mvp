import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const SCRIPT = fileURLToPath(new URL("../ruby/queue_consumer_contract.rb", import.meta.url));
const SKETCHUP_CONSUMER = fileURLToPath(new URL("../ruby/sketchup_envelope_consumer.rb", import.meta.url));
const PACKAGE_DIR = path.dirname(path.dirname(SCRIPT));
const JOB_ID = "job-ruby-001";

test("Ruby queue consumer contract keeps fail-closed safety markers", async () => {
  const source = await readFile(SCRIPT, "utf8");

  assert.match(source, /furniture-sketchup-file-queue\/v1/);
  assert.match(source, /sketchup-command-plan\/v1/);
  assert.match(source, /ALLOWED_COMMANDS = %w\[set_units create_envelope attach_metadata\]/);
  assert.match(source, /Manager approval is required/);
  assert.match(source, /A generated model\.skp artifact is required/);
  assert.match(source, /At least one generated preview or render artifact is required/);
  assert.doesNotMatch(source, /Sketchup\.active_model|UI\.messagebox|system\(|Open3|`/);
});

test("SketchUp envelope consumer is manual and allowlist-bound", async () => {
  const source = await readFile(SKETCHUP_CONSUMER, "utf8");

  assert.match(source, /module FurniturePlatform/);
  assert.match(source, /module SketchUpEnvelopeConsumer/);
  assert.match(source, /SketchUp Ruby API is required/);
  assert.match(source, /ALLOWED_COMMANDS = %w\[set_units create_envelope attach_metadata\]/);
  assert.match(source, /Command plan must contain exactly three commands/);
  assert.match(source, /model\.save_copy/);
  assert.match(source, /active_view\.write_image/);
  assert.match(source, /artifacts\/#\{job_id\}\/model\.skp/);
  assert.match(source, /artifacts\/#\{job_id\}\/preview\.png/);
  assert.doesNotMatch(source, /system\(|Open3|eval\(|exec\(|spawn\(|`/);
  assert.doesNotMatch(source, /Net::HTTP|URI\.open|Faraday|HTTParty/);
});

test("Ruby queue consumer publishes outbox when Ruby is available", async (t) => {
  const ruby = spawnSync("ruby", ["--version"], { encoding: "utf8" });
  if (ruby.error || ruby.status !== 0) {
    t.skip("Ruby is not installed in this local Windows environment.");
    return;
  }

  const queueDir = await temporaryQueue(t);
  await mkdir(path.join(queueDir, "inbox"), { recursive: true });
  await mkdir(path.join(queueDir, "approvals"), { recursive: true });
  await mkdir(path.join(queueDir, "artifacts", JOB_ID), { recursive: true });
  await writeFile(path.join(queueDir, "inbox", `${JOB_ID}.json`), JSON.stringify({
    bridgeVersion: "furniture-sketchup-file-queue/v1",
    jobId: JOB_ID,
    requestedBy: "manager@example.com",
    commandPlan: {
      planVersion: "sketchup-command-plan/v1",
      commands: [{ type: "set_units", unit: "millimeter" }]
    }
  }));
  await writeFile(path.join(queueDir, "approvals", `${JOB_ID}.json`), JSON.stringify({
    approved: true,
    jobId: JOB_ID,
    requestedBy: "manager@example.com",
    approvedAt: "2026-06-24T12:00:00.000Z"
  }));
  await writeFile(path.join(queueDir, "artifacts", JOB_ID, "model.skp"), "skp");
  await writeFile(path.join(queueDir, "artifacts", JOB_ID, "preview.webp"), "webp");

  const result = spawnSync("ruby", [SCRIPT, queueDir, JOB_ID], {
    cwd: PACKAGE_DIR,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);

  const outbox = JSON.parse(await readFile(path.join(queueDir, "outbox", `${JOB_ID}.json`), "utf8"));
  assert.equal(outbox.executed, true);
  assert.deepEqual(outbox.artifacts, [
    { type: "skp", reference: `artifacts/${JOB_ID}/model.skp` },
    { type: "preview", reference: `artifacts/${JOB_ID}/preview.webp` }
  ]);
});

async function temporaryQueue(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "furniture-sketchup-ruby-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
