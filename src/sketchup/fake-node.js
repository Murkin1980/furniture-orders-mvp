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
  const commands = Array.isArray(plan.commands) ? plan.commands : [];

  // Kitchen command plan
  if (plan.planVersion === "kitchen-command-plan/v1") {
    const room = commands.find((c) => c.type === "create_room_envelope");
    const baseModules = commands.filter((c) => c.type === "place_block_module" && c.zone === "base");
    const wallModules = commands.filter((c) => c.type === "place_block_module" && c.zone === "wall");
    const appliances = commands.filter((c) => c.type === "place_block_appliance");
    return {
      planVersion: "kitchen-command-plan/v1",
      commandTypes: commands.map((c) => c.type),
      dimensions: room ? { widthMm: room.wallAmm, heightMm: room.ceilingHeightMm } : null,
      furnitureType: "kitchen",
      componentCount: baseModules.length + wallModules.length,
      materialCount: 0,
      kitchenSummary: {
        layout: room?.layout || "",
        baseModuleCount: baseModules.length,
        wallModuleCount: wallModules.length,
        applianceCount: appliances.length
      }
    };
  }

  // Standard command plan
  const envelope = commands.find((command) => command.type === "create_envelope");
  const metadata = commands.find((command) => command.type === "attach_metadata");
  return {
    planVersion: clean(plan.planVersion),
    commandTypes: commands.map((command) => clean(command.type)),
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
