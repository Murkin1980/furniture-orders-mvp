import {
  buildOrderRenderAttachment,
  buildSketchUpRenderArtifact
} from "./render-artifact.js";

export async function saveOrderRenderArtifactCore({ db }, orderId, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = positiveInteger(orderId);
  const jobId = clean(input.jobId);
  if (!id || !jobId) {
    return errorResult(400, "invalid_render_artifact_request", "Order ID and SketchUp job ID are required.");
  }

  const job = await db.prepare(
    `SELECT id, order_id AS orderId, job_id AS jobId, status
     FROM sketchup_jobs WHERE job_id = ? AND order_id = ?`
  ).bind(jobId, id).first();
  if (!job) return errorResult(404, "sketchup_job_not_found", "SketchUp job was not found for this order.");
  if (clean(job.status) !== "accepted") {
    return errorResult(409, "sketchup_job_not_accepted", "Render artifacts can be attached only to accepted SketchUp jobs.");
  }

  const artifactResult = buildSketchUpRenderArtifact(input, {
    orderId: id,
    jobId,
    now: options.now ?? input.createdAt
  });
  if (!artifactResult.ok) {
    return errorResult(400, artifactResult.error, artifactResult.message);
  }
  const attachmentResult = buildOrderRenderAttachment(artifactResult.artifact);
  if (!attachmentResult.ok) {
    return errorResult(400, attachmentResult.error, attachmentResult.message);
  }

  const attachment = attachmentResult.attachment;
  const reportedBy = clean(input.reportedBy ?? options.reportedBy);
  const existing = await db.prepare(
    "SELECT id FROM sketchup_render_artifacts WHERE job_id = ?"
  ).bind(jobId).first();

  if (existing?.id) {
    await db.prepare(
      `UPDATE sketchup_render_artifacts
       SET artifact_version = ?, status = ?, primary_storage_key = ?,
           model_storage_key = ?, manifest_json = ?, reported_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE job_id = ?`
    ).bind(
      attachment.artifactVersion,
      attachment.status,
      attachment.primaryStorageKey,
      attachment.modelStorageKey,
      attachment.manifestJson,
      reportedBy,
      jobId
    ).run();
  } else {
    await db.prepare(
      `INSERT INTO sketchup_render_artifacts
        (order_id, job_id, artifact_version, status, primary_storage_key,
         model_storage_key, manifest_json, reported_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      jobId,
      attachment.artifactVersion,
      attachment.status,
      attachment.primaryStorageKey,
      attachment.modelStorageKey,
      attachment.manifestJson,
      reportedBy
    ).run();
  }

  const saved = await db.prepare(
    `SELECT id, order_id AS orderId, job_id AS jobId,
            artifact_version AS artifactVersion, status,
            primary_storage_key AS primaryStorageKey,
            model_storage_key AS modelStorageKey,
            manifest_json AS manifestJson,
            reported_by AS reportedBy,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM sketchup_render_artifacts WHERE job_id = ?`
  ).bind(jobId).first();

  return okResult({
    item: normalizeSavedArtifact(saved),
    attachment
  }, existing?.id ? 200 : 201);
}

export async function listOrderRenderArtifactsCore({ db }, orderId) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  const id = positiveInteger(orderId);
  if (!id) {
    return errorResult(400, "invalid_render_artifact_request", "Order ID is required.");
  }

  const result = await db.prepare(
    `SELECT id, order_id AS orderId, job_id AS jobId,
            artifact_version AS artifactVersion, status,
            primary_storage_key AS primaryStorageKey,
            model_storage_key AS modelStorageKey,
            manifest_json AS manifestJson,
            reported_by AS reportedBy,
            created_at AS createdAt,
            updated_at AS updatedAt
     FROM sketchup_render_artifacts
     WHERE order_id = ?
     ORDER BY updated_at DESC, id DESC`
  ).bind(id).all();

  return okResult({
    items: (result?.results || []).map(normalizeSavedArtifact)
  });
}

function normalizeSavedArtifact(row = {}) {
  return {
    id: positiveInteger(row.id),
    orderId: positiveInteger(row.orderId),
    jobId: clean(row.jobId),
    artifactVersion: clean(row.artifactVersion),
    status: clean(row.status),
    primaryStorageKey: clean(row.primaryStorageKey),
    modelStorageKey: clean(row.modelStorageKey),
    manifest: parseJsonObject(row.manifestJson),
    reportedBy: clean(row.reportedBy),
    createdAt: clean(row.createdAt),
    updatedAt: clean(row.updatedAt)
  };
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(clean(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function okResult(body, status = 200) {
  return { ok: true, status, body: { success: true, ...body } };
}

function errorResult(status, error, message) {
  return { ok: false, status, body: { success: false, error, message } };
}
