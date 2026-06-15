import { verifySketchUpNodeJobSignature } from "./node-auth.js";

export async function handleFakeSketchUpNodeJob(job = {}, options = {}) {
  const verification = await verifySketchUpNodeJobSignature(job, options.signingSecret, {
    now: options.now,
    cryptoImpl: options.cryptoImpl
  });
  if (!verification.ok) return rejected(job, verification.error, verification.message);
  if (typeof options.hasIdempotencyKey !== "function" || typeof options.markIdempotencyKey !== "function") {
    return rejected(job, "idempotency_store_required", "Injected idempotency store is required.");
  }
  if (await options.hasIdempotencyKey(job.idempotencyKey)) {
    return rejected(job, "duplicate_job", "SketchUp node job was already accepted.");
  }

  const summary = buildDryRunSummary(job.payload.commandPlan);
  await options.markIdempotencyKey(job.idempotencyKey, {
    jobId: job.jobId,
    acceptedAt: isoTime(options.now)
  });
  return {
    status: "accepted",
    jobId: job.jobId,
    nodeJobId: clean(options.nodeJobId) || `fake-${job.jobId}`,
    message: "Validated by fake SketchUp node. No SketchUp commands were executed.",
    executed: false,
    dryRun: true,
    summary
  };
}

export function buildDryRunSummary(plan = {}) {
  const envelope = plan.commands?.find((command) => command.type === "create_envelope");
  const metadata = plan.commands?.find((command) => command.type === "attach_metadata");
  return {
    planVersion: clean(plan.planVersion),
    commandTypes: Array.isArray(plan.commands) ? plan.commands.map((command) => clean(command.type)) : [],
    dimensions: envelope?.dimensions ? { ...envelope.dimensions } : null,
    furnitureType: clean(metadata?.furnitureType) || "other",
    componentCount: Array.isArray(metadata?.components) ? metadata.components.length : 0,
    materialCount: Array.isArray(metadata?.materials) ? metadata.materials.length : 0
  };
}

function rejected(job, error, message) {
  return {
    status: "rejected",
    jobId: clean(job?.jobId),
    nodeJobId: "",
    message: clean(message) || clean(error),
    error,
    executed: false,
    dryRun: true,
    summary: null
  };
}

function isoTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
