export async function runSketchUpExecutionAdapter(job = {}, options = {}) {
  const base = {
    jobId: clean(job.jobId),
    executed: false,
    adapter: "injected-sketchup-executor/v1"
  };
  if (options.executionEnabled !== true) {
    return { ...base, status: "disabled", error: "execution_disabled", message: "SketchUp execution is disabled." };
  }

  const approvalError = validateManagerApproval(job, options.managerApproval);
  if (approvalError) {
    return { ...base, status: "rejected", error: "manager_approval_required", message: approvalError };
  }
  if (typeof options.executePlan !== "function") {
    return { ...base, status: "failed", error: "executor_required", message: "Injected SketchUp executor is required." };
  }

  try {
    const result = await options.executePlan(structuredClone(job.payload.commandPlan), {
      jobId: job.jobId,
      requestedBy: options.managerApproval.requestedBy
    });
    if (result?.executed !== true) {
      return { ...base, status: "failed", error: "execution_not_confirmed", message: "Executor did not confirm execution." };
    }
    return {
      ...base,
      status: "executed",
      executed: true,
      artifact: normalizeArtifact(result.artifact),
      artifacts: normalizeArtifacts(result.artifacts, result.artifact),
      message: clean(result.message) || "Injected SketchUp executor confirmed execution."
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      error: "executor_failed",
      message: clean(error?.message) || "Injected SketchUp executor failed."
    };
  }
}

export function validateManagerApproval(job = {}, approval = {}) {
  if (approval?.approved !== true) return "Explicit manager approval is required.";
  if (clean(approval.jobId) !== clean(job.jobId)) return "Manager approval must match the job.";
  if (!clean(approval.requestedBy)) return "Manager identity is required.";
  if (!validTime(approval.approvedAt)) return "Manager approval time is required.";
  return "";
}

function normalizeArtifact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    type: clean(value.type),
    reference: clean(value.reference)
  };
}

function normalizeArtifacts(values, fallback) {
  const source = Array.isArray(values) ? values : [fallback];
  return source.map(normalizeArtifact).filter((artifact) => artifact?.type && artifact?.reference);
}

function validTime(value) {
  return Number.isFinite(new Date(value).getTime());
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
