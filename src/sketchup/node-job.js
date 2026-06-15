import {
  SKETCHUP_COMMAND_PLAN_VERSION,
  validateSketchUpCommandPlan
} from "./command-plan.js";

export const SKETCHUP_NODE_JOB_VERSION = "sketchup-node-job/v1";
export const SKETCHUP_NODE_JOB_TYPE = "sketchup.execute_plan";
export const MAX_SKETCHUP_JOB_TTL_MS = 15 * 60 * 1000;

export function buildSketchUpNodeJob(plan = {}, options = {}) {
  const validation = validateSketchUpCommandPlan(plan);
  if (!validation.ok) {
    return failure("invalid_command_plan", `Command plan is invalid: ${validation.error}.`);
  }

  const jobId = clean(options.jobId);
  if (!isSafeIdentifier(jobId)) {
    return failure("invalid_job_id", "A safe explicit jobId is required.");
  }

  const createdAtMs = parseTime(options.now ?? Date.now());
  const ttlMs = Number(options.ttlMs ?? 5 * 60 * 1000);
  if (!createdAtMs || !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > MAX_SKETCHUP_JOB_TTL_MS) {
    return failure("invalid_job_timing", "Job time and TTL must be valid and TTL must not exceed 15 minutes.");
  }

  const signable = {
    jobVersion: SKETCHUP_NODE_JOB_VERSION,
    jobType: SKETCHUP_NODE_JOB_TYPE,
    jobId,
    idempotencyKey: clean(options.idempotencyKey) || defaultIdempotencyKey(plan, jobId),
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
    source: {
      orderId: plan.source.orderId,
      recognitionId: plan.source.recognitionId,
      planVersion: SKETCHUP_COMMAND_PLAN_VERSION,
      modelVersion: plan.sourceModelVersion
    },
    payload: {
      commandPlan: structuredClone(plan)
    }
  };
  const job = {
    ...signable,
    signature: {
      algorithm: "hmac-sha256",
      value: ""
    },
    signatureInput: canonicalizeSketchUpJob(signable)
  };
  const jobValidation = validateSketchUpNodeJob(job, { now: createdAtMs });

  return jobValidation.ok ? { ok: true, job } : failure(jobValidation.error, "Built SketchUp node job is invalid.");
}

export function validateSketchUpNodeJob(job = {}, options = {}) {
  if (!hasOnlyKeys(job, [
    "jobVersion",
    "jobType",
    "jobId",
    "idempotencyKey",
    "createdAt",
    "expiresAt",
    "source",
    "payload",
    "signature",
    "signatureInput"
  ])) return invalid("invalid_job_shape");
  if (job.jobVersion !== SKETCHUP_NODE_JOB_VERSION || job.jobType !== SKETCHUP_NODE_JOB_TYPE) {
    return invalid("unsupported_job_contract");
  }
  if (!isSafeIdentifier(job.jobId) || !isSafeIdentifier(job.idempotencyKey, 255)) {
    return invalid("invalid_job_identity");
  }
  if (!hasOnlyKeys(job.source, ["orderId", "recognitionId", "planVersion", "modelVersion"])
    || !hasOnlyKeys(job.payload, ["commandPlan"])
    || !hasOnlyKeys(job.signature, ["algorithm", "value"])) {
    return invalid("invalid_job_shape");
  }
  if (job.signature.algorithm !== "hmac-sha256" || job.signature.value !== "") {
    return invalid("invalid_signature_contract");
  }

  const planValidation = validateSketchUpCommandPlan(job.payload.commandPlan);
  if (!planValidation.ok) return invalid("invalid_command_plan");
  if (job.source.orderId !== job.payload.commandPlan.source.orderId
    || job.source.recognitionId !== job.payload.commandPlan.source.recognitionId
    || job.source.planVersion !== job.payload.commandPlan.planVersion
    || job.source.modelVersion !== job.payload.commandPlan.sourceModelVersion) {
    return invalid("source_mismatch");
  }

  const createdAt = parseTime(job.createdAt);
  const expiresAt = parseTime(job.expiresAt);
  const now = parseTime(options.now ?? Date.now());
  if (!createdAt || !expiresAt || !now || expiresAt <= createdAt
    || expiresAt - createdAt > MAX_SKETCHUP_JOB_TTL_MS) {
    return invalid("invalid_job_timing");
  }
  if (now >= expiresAt) return invalid("job_expired");

  const signable = { ...job };
  delete signable.signature;
  delete signable.signatureInput;
  if (job.signatureInput !== canonicalizeSketchUpJob(signable)) {
    return invalid("signature_input_mismatch");
  }

  return { ok: true, error: "" };
}

export function canonicalizeSketchUpJob(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortValue(value[key])])
  );
}

function defaultIdempotencyKey(plan, jobId) {
  return `sketchup:${plan.source.orderId}:${plan.source.recognitionId}:${jobId}`;
}

function isSafeIdentifier(value, maxLength = 128) {
  const text = clean(value);
  return text.length >= 6
    && text.length <= maxLength
    && /^[a-zA-Z0-9][a-zA-Z0-9._:-]+$/.test(text);
}

function parseTime(value) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function hasOnlyKeys(value, allowedKeys) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function failure(error, message) {
  return { ok: false, error, message, job: null };
}

function invalid(error) {
  return { ok: false, error };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
