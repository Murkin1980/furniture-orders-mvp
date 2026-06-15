import { validateSketchUpNodeJob } from "./node-job.js";

export async function sendSketchUpNodeJob(job = {}, options = {}) {
  const validation = validateSketchUpNodeJob(job, { now: options.now });
  if (!validation.ok) {
    return failure(job, "invalid_job", `SketchUp node job is invalid: ${validation.error}.`, 0);
  }
  if (typeof options.sendNodeRequest !== "function") {
    return failure(job, "sender_required", "Injected sendNodeRequest is required.", 0);
  }

  try {
    const response = await options.sendNodeRequest(structuredClone(job));
    const normalized = normalizeNodeResponse(response, job.jobId);
    if (!normalized.ok) return failure(job, normalized.error, normalized.message, 1);
    return {
      ok: normalized.status === "accepted",
      status: normalized.status,
      jobId: job.jobId,
      nodeJobId: normalized.nodeJobId,
      message: normalized.message,
      error: normalized.status === "accepted" ? "" : "node_rejected",
      meta: { attempts: 1 }
    };
  } catch (error) {
    return failure(job, "node_request_failed", safeError(error), 1);
  }
}

function normalizeNodeResponse(response, expectedJobId) {
  if (!isPlainObject(response)) {
    return invalid("invalid_node_response", "SketchUp node returned an invalid response.");
  }
  const status = clean(response.status).toLowerCase();
  if (!["accepted", "rejected"].includes(status)) {
    return invalid("invalid_node_response", "SketchUp node response status must be accepted or rejected.");
  }
  if (clean(response.jobId) !== expectedJobId) {
    return invalid("job_id_mismatch", "SketchUp node response jobId does not match the request.");
  }
  return {
    ok: true,
    status,
    nodeJobId: clean(response.nodeJobId),
    message: clean(response.message)
  };
}

function failure(job, error, message, attempts) {
  return {
    ok: false,
    status: "failed",
    jobId: clean(job?.jobId),
    nodeJobId: "",
    message,
    error,
    meta: { attempts }
  };
}

function invalid(error, message) {
  return { ok: false, error, message };
}

function safeError(error) {
  return error instanceof Error && clean(error.message)
    ? clean(error.message)
    : "SketchUp node request failed.";
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
