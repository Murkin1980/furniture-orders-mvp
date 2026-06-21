import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{5,127}$/;

export function createFileQueueExecutor(options = {}) {
  const queueDir = requireAbsoluteDirectory(options.queueDir);
  const timeoutMs = boundedInteger(options.timeoutMs, 120000, 1000, 10 * 60 * 1000);
  const pollMs = boundedInteger(options.pollMs, 500, 50, 5000);
  const fsImpl = options.fsImpl ?? { mkdir, readFile, rename, writeFile };
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? (() => new Date());

  return async function executePlan(commandPlan, context = {}) {
    const jobId = safeJobId(context.jobId);
    const requestedBy = clean(context.requestedBy);
    if (!requestedBy) throw new Error("Manager identity is required for the SketchUp queue.");

    const inbox = path.join(queueDir, "inbox");
    const outbox = path.join(queueDir, "outbox");
    await fsImpl.mkdir(inbox, { recursive: true });
    await fsImpl.mkdir(outbox, { recursive: true });

    const requestPath = path.join(inbox, `${jobId}.json`);
    const temporaryPath = `${requestPath}.${process.pid}.tmp`;
    const responsePath = path.join(outbox, `${jobId}.json`);
    const request = {
      bridgeVersion: "furniture-sketchup-file-queue/v1",
      jobId,
      requestedBy,
      createdAt: isoTime(now()),
      commandPlan: structuredClone(commandPlan)
    };
    await fsImpl.writeFile(temporaryPath, `${JSON.stringify(request)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    await fsImpl.rename(temporaryPath, requestPath);

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await readResponse(fsImpl, responsePath);
      if (response) return normalizeResponse(response, jobId);
      await sleep(pollMs);
    }
    throw new Error(`SketchUp queue timed out after ${timeoutMs} ms.`);
  };
}

export function createFileApprovalResolver(options = {}) {
  const queueDir = requireAbsoluteDirectory(options.queueDir);
  const fsImpl = options.fsImpl ?? { readFile };

  return async function getManagerApproval(job = {}) {
    const jobId = safeJobId(job.jobId);
    const approvalPath = path.join(queueDir, "approvals", `${jobId}.json`);
    let raw;
    try {
      raw = await fsImpl.readFile(approvalPath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    let approval;
    try {
      approval = JSON.parse(raw);
    } catch {
      throw new Error("SketchUp approval file must contain valid JSON.");
    }
    return {
      approved: approval?.approved === true,
      jobId: clean(approval?.jobId),
      requestedBy: clean(approval?.requestedBy),
      approvedAt: clean(approval?.approvedAt)
    };
  };
}

async function readResponse(fsImpl, responsePath) {
  try {
    const raw = await fsImpl.readFile(responsePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) throw new Error("SketchUp queue response must contain valid JSON.");
    throw error;
  }
}

function normalizeResponse(response, jobId) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("SketchUp queue response must be an object.");
  }
  if (clean(response.jobId) !== jobId) throw new Error("SketchUp queue response jobId mismatch.");
  if (response.status !== "executed" || response.executed !== true) {
    throw new Error(clean(response.message) || "SketchUp queue execution failed.");
  }
  const artifact = response.artifact;
  if (!artifact || artifact.type !== "skp" || !safeRelativeReference(artifact.reference)) {
    throw new Error("SketchUp queue response must contain a safe SKP artifact reference.");
  }
  return {
    executed: true,
    artifact: { type: "skp", reference: artifact.reference },
    message: clean(response.message) || "SketchUp file queue completed execution."
  };
}

function requireAbsoluteDirectory(value) {
  const directory = clean(value);
  if (!directory || !path.isAbsolute(directory)) {
    throw new Error("An absolute SKETCHUP_NODE_QUEUE_DIR is required.");
  }
  return path.resolve(directory);
}

function safeJobId(value) {
  const jobId = clean(value);
  if (!SAFE_ID.test(jobId)) throw new Error("A safe SketchUp queue jobId is required.");
  return jobId;
}

function safeRelativeReference(value) {
  const reference = clean(value).replaceAll("\\", "/");
  return reference.startsWith("artifacts/")
    && !reference.startsWith("/")
    && !reference.split("/").includes("..")
    && !reference.includes(":");
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Value must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function isoTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("A valid queue timestamp is required.");
  return date.toISOString();
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
