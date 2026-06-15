export const SKETCHUP_RENDER_ARTIFACT_VERSION = "sketchup-render-artifact/v1";

const ROLES = new Set(["model", "preview", "render"]);
const MEDIA_TYPES = new Set([
  "application/vnd.sketchup.skp",
  "image/jpeg",
  "image/png",
  "image/webp",
  "model/gltf-binary"
]);

export function buildSketchUpRenderArtifact(input = {}, options = {}) {
  const artifact = {
    artifactVersion: SKETCHUP_RENDER_ARTIFACT_VERSION,
    orderId: positiveInteger(options.orderId ?? input.orderId),
    jobId: clean(options.jobId ?? input.jobId),
    createdAt: isoTime(options.now ?? input.createdAt),
    files: Array.isArray(input.files) ? input.files.map(normalizeFile) : [],
    summary: {
      modelIncluded: false,
      renderCount: 0,
      previewCount: 0
    }
  };
  artifact.summary.modelIncluded = artifact.files.some((file) => file.role === "model");
  artifact.summary.renderCount = artifact.files.filter((file) => file.role === "render").length;
  artifact.summary.previewCount = artifact.files.filter((file) => file.role === "preview").length;

  const validation = validateSketchUpRenderArtifact(artifact);
  return validation.ok
    ? { ok: true, artifact, error: "", message: "" }
    : { ok: false, artifact: null, error: validation.error, message: validation.message };
}

export function validateSketchUpRenderArtifact(artifact = {}) {
  if (artifact.artifactVersion !== SKETCHUP_RENDER_ARTIFACT_VERSION) return invalid("unsupported_artifact_version");
  if (!positiveInteger(artifact.orderId) || !safeIdentifier(artifact.jobId)) return invalid("invalid_artifact_source");
  if (!validTime(artifact.createdAt)) return invalid("invalid_artifact_time");
  if (!Array.isArray(artifact.files) || artifact.files.length < 1 || artifact.files.length > 10) {
    return invalid("invalid_artifact_files");
  }
  if (artifact.files.some((file) => !validFile(file))) return invalid("invalid_artifact_file");
  if (new Set(artifact.files.map((file) => file.storageKey)).size !== artifact.files.length) {
    return invalid("duplicate_artifact_file");
  }
  if (!artifact.files.some((file) => file.role === "render" || file.role === "preview")) {
    return invalid("render_or_preview_required");
  }
  return { ok: true, error: "", message: "" };
}

export function buildOrderRenderAttachment(artifact = {}) {
  const validation = validateSketchUpRenderArtifact(artifact);
  if (!validation.ok) {
    return { ok: false, attachment: null, error: validation.error, message: validation.message };
  }
  const primary = artifact.files.find((file) => file.role === "render")
    ?? artifact.files.find((file) => file.role === "preview");
  const model = artifact.files.find((file) => file.role === "model");
  return {
    ok: true,
    attachment: {
      orderId: artifact.orderId,
      source: "sketchup",
      sourceJobId: artifact.jobId,
      artifactVersion: artifact.artifactVersion,
      status: "ready",
      primaryStorageKey: primary.storageKey,
      modelStorageKey: model?.storageKey || "",
      manifestJson: JSON.stringify(artifact)
    },
    error: "",
    message: ""
  };
}

function normalizeFile(value = {}) {
  return {
    role: clean(value.role),
    mediaType: clean(value.mediaType).toLowerCase(),
    storageKey: clean(value.storageKey),
    bytes: positiveInteger(value.bytes),
    sha256: clean(value.sha256).toLowerCase()
  };
}

function validFile(file) {
  return ROLES.has(file.role)
    && MEDIA_TYPES.has(file.mediaType)
    && safeStorageKey(file.storageKey)
    && positiveInteger(file.bytes)
    && /^[a-f0-9]{64}$/.test(file.sha256);
}

function safeStorageKey(value) {
  const key = clean(value);
  return key.length >= 3
    && key.length <= 512
    && !key.startsWith("/")
    && !key.includes("\\")
    && !key.split("/").includes("..")
    && /^[a-zA-Z0-9][a-zA-Z0-9._/-]+$/.test(key);
}

function safeIdentifier(value) {
  const text = clean(value);
  return text.length >= 6 && text.length <= 128 && /^[a-zA-Z0-9][a-zA-Z0-9._:-]+$/.test(text);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function isoTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function validTime(value) {
  return Number.isFinite(new Date(value).getTime());
}

function invalid(error) {
  return { ok: false, error, message: error.replaceAll("_", " ") };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
