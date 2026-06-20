const MAX_RENDER_FILE_BYTES = 50 * 1024 * 1024;

const FILE_TYPES = new Map([
  ["application/vnd.sketchup.skp", { extension: "skp", roles: new Set(["model"]) }],
  ["model/gltf-binary", { extension: "glb", roles: new Set(["model"]) }],
  ["image/jpeg", { extension: "jpg", roles: new Set(["preview", "render"]) }],
  ["image/png", { extension: "png", roles: new Set(["preview", "render"]) }],
  ["image/webp", { extension: "webp", roles: new Set(["preview", "render"]) }]
]);

export async function uploadSketchUpRenderFile({ db, bucket }, orderId, file, input = {}, options = {}) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  if (!bucket || typeof bucket.put !== "function") {
    return errorResult(503, "render_bucket_not_configured", "SketchUp render bucket is not configured.");
  }

  const id = positiveInteger(orderId);
  const jobId = clean(input.jobId);
  const role = clean(input.role).toLowerCase();
  if (!id || !jobId) return validationError("jobId", "Order ID and SketchUp job ID are required.");
  if (!["model", "preview", "render"].includes(role)) return validationError("role", "role must be model, preview, or render.");

  const job = await db.prepare(
    `SELECT id, order_id AS orderId, job_id AS jobId, status
     FROM sketchup_jobs WHERE job_id = ? AND order_id = ?`
  ).bind(jobId, id).first();
  if (!job) return errorResult(404, "sketchup_job_not_found", "SketchUp job was not found for this order.");
  if (clean(job.status) !== "accepted") {
    return errorResult(409, "sketchup_job_not_accepted", "Render files can be uploaded only for accepted SketchUp jobs.");
  }

  const normalized = await normalizeRenderFile(file, role);
  if (!normalized.ok) return validationError("file", normalized.message);

  const storageKey = createRenderStorageKey(id, jobId, role, normalized.extension, options);
  await bucket.put(storageKey, normalized.buffer, {
    httpMetadata: { contentType: normalized.mediaType },
    customMetadata: {
      orderId: String(id),
      jobId,
      role,
      sha256: normalized.sha256
    }
  });

  return okResult({
    file: {
      role,
      mediaType: normalized.mediaType,
      storageKey,
      bytes: normalized.bytes,
      sha256: normalized.sha256
    }
  }, 201);
}

export async function normalizeRenderFile(file, role) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, message: "file is required." };
  }
  const mediaType = clean(file.type).toLowerCase();
  const config = FILE_TYPES.get(mediaType);
  if (!config || !config.roles.has(role)) {
    return { ok: false, message: "file type is not allowed for this role." };
  }
  const bytes = Number(file.size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, message: "file must not be empty." };
  if (bytes > MAX_RENDER_FILE_BYTES) return { ok: false, message: "file must be 50 MB or smaller." };

  const buffer = await file.arrayBuffer();
  return {
    ok: true,
    mediaType,
    extension: config.extension,
    bytes,
    sha256: await sha256Hex(buffer),
    buffer
  };
}

export function createRenderStorageKey(orderId, jobId, role, extension, options = {}) {
  const id = positiveInteger(orderId);
  const safeJobId = clean(jobId).replace(/[^a-zA-Z0-9._:-]/g, "-");
  const safeRole = clean(role).toLowerCase();
  const safeExtension = clean(extension).toLowerCase();
  const fileId = clean(options.fileId) || randomId();
  return `sketchup/orders/${id}/${safeJobId}/${safeRole}/${fileId}.${safeExtension}`;
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function validationError(field, message) {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "validation_error",
      message: "Request validation failed.",
      fields: [{ field, message }]
    }
  };
}
