import { parseStoredRecognitionResult } from "../ocr/recognition-record.js";
import { buildFurnitureModelFromRecognition } from "./furniture-model.js";
import { buildSketchUpCommandPlan } from "./command-plan.js";
import { buildSketchUpNodeJob } from "./node-job.js";
import { buildSketchUpNodeRequest, signSketchUpNodeJob } from "./node-auth.js";

export async function createOrderSketchUpJobCore({ db, sendNodeRequest }, orderId, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = positiveInteger(orderId);
  const recognitionId = positiveInteger(input.recognitionId);
  if (!id || !recognitionId) return errorResult(400, "invalid_job_request", "Order and recognition IDs must be positive integers.");
  if (input.confirmExecution !== true) {
    return errorResult(400, "execution_confirmation_required", "Explicit manager execution confirmation is required.");
  }
  if (!clean(input.requestedBy)) {
    return errorResult(400, "requested_by_required", "Manager identity is required.");
  }

  const recognition = await db.prepare(
    `SELECT id, order_id AS orderId, status, result_json AS resultJson,
            reviewed_by AS reviewedBy, reviewed_at AS reviewedAt
     FROM ocr_recognitions WHERE id = ? AND order_id = ?`
  ).bind(recognitionId, id).first();
  if (!recognition) return errorResult(404, "recognition_not_found", "Approved recognition was not found for this order.");

  const modelResult = buildFurnitureModelFromRecognition({
    ...recognition,
    result: parseStoredRecognitionResult(recognition.resultJson)
  });
  if (!modelResult.ok) return errorResult(409, modelResult.error, modelResult.message);
  const planResult = buildSketchUpCommandPlan(modelResult.model);
  if (!planResult.ok) return errorResult(409, planResult.error, planResult.message);

  const requestedAt = isoTime(options.now);
  const jobResult = buildSketchUpNodeJob(planResult.plan, {
    jobId: input.jobId,
    now: requestedAt,
    ttlMs: options.ttlMs
  });
  if (!jobResult.ok) return errorResult(400, jobResult.error, jobResult.message);

  const audit = {
    order_id: id,
    recognition_id: recognitionId,
    job_id: jobResult.job.jobId,
    idempotency_key: jobResult.job.idempotencyKey,
    status: "pending",
    model_version: jobResult.job.source.modelVersion,
    plan_version: jobResult.job.source.planVersion,
    plan_json: JSON.stringify(planResult.plan),
    requested_by: clean(input.requestedBy),
    requested_at: requestedAt
  };
  const insert = await db.prepare(
    `INSERT INTO sketchup_jobs
      (order_id, recognition_id, job_id, idempotency_key, status, model_version,
       plan_version, plan_json, requested_by, requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(...Object.values(audit)).run();

  let outcome;
  const signed = await signSketchUpNodeJob(jobResult.job, options.signingSecret, { now: requestedAt });
  if (!signed.ok) {
    outcome = failed(signed.error, signed.message);
  } else {
    const request = buildSketchUpNodeRequest(signed.job, { baseURL: options.baseURL, now: requestedAt });
    if (!request.ok) {
      outcome = failed(request.error, request.message);
    } else if (typeof sendNodeRequest !== "function") {
      outcome = failed("sender_required", "SketchUp node sender is not configured.");
    } else {
      outcome = normalizeSenderResult(await sendSafely(sendNodeRequest, request.request), jobResult.job.jobId);
    }
  }

  const completedAt = isoTime(options.completedAt ?? options.now);
  await db.prepare(
    `UPDATE sketchup_jobs SET status = ?, node_job_id = ?, error = ?,
       completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?`
  ).bind(outcome.status, outcome.nodeJobId, outcome.error, completedAt, jobResult.job.jobId).run();

  return okResult({
    item: {
      id: insert?.meta?.last_row_id ?? null,
      orderId: id,
      recognitionId,
      jobId: jobResult.job.jobId,
      status: outcome.status,
      nodeJobId: outcome.nodeJobId,
      error: outcome.error,
      requestedBy: audit.requested_by,
      requestedAt,
      completedAt
    }
  }, outcome.status === "accepted" ? 201 : 200);
}

function normalizeSenderResult(result, expectedJobId) {
  if (!result?.ok) return failed(result?.error || "node_request_failed", result?.message || "SketchUp node request failed.");
  const response = result.response;
  if (!response || clean(response.jobId) !== expectedJobId) return failed("job_id_mismatch", "SketchUp node response jobId does not match.");
  const status = clean(response.status).toLowerCase();
  if (status === "accepted") return { status, nodeJobId: clean(response.nodeJobId), error: "" };
  if (status === "rejected") return { status, nodeJobId: clean(response.nodeJobId), error: clean(response.message) || "SketchUp node rejected the job." };
  return failed("invalid_node_response", "SketchUp node response status is invalid.");
}

async function sendSafely(sender, request) {
  try { return await sender(request); }
  catch (error) { return { ok: false, error: "node_request_failed", message: clean(error?.message) || "SketchUp node request failed." }; }
}

function failed(error, message) {
  return { status: "failed", nodeJobId: "", error: clean(message) || clean(error) };
}
function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function isoTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}
function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function okResult(body, status = 200) { return { ok: true, status, body: { success: true, ...body } }; }
function errorResult(status, error, message) { return { ok: false, status, body: { success: false, error, message } }; }
