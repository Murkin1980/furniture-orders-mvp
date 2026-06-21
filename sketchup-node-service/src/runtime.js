import { createFileApprovalResolver, createFileQueueExecutor } from "./file-queue-executor.js";

export function createRuntimeOptions(env = process.env) {
  if (String(env.SKETCHUP_NODE_EXECUTION_ENABLED || "").trim().toLowerCase() !== "true") {
    return {};
  }
  const queueDir = String(env.SKETCHUP_NODE_QUEUE_DIR || "").trim();
  return {
    executePlan: createFileQueueExecutor({
      queueDir,
      timeoutMs: env.SKETCHUP_NODE_QUEUE_TIMEOUT_MS,
      pollMs: env.SKETCHUP_NODE_QUEUE_POLL_MS
    }),
    getManagerApproval: createFileApprovalResolver({ queueDir })
  };
}
