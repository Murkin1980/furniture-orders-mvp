import { validateSketchUpNodeJob } from "./node-job.js";

export async function signSketchUpNodeJob(job = {}, secret = "", options = {}) {
  const validation = validateSketchUpNodeJob(job, { now: options.now });
  if (!validation.ok) return failure("invalid_unsigned_job", validation.error);
  if (!isSafeSecret(secret)) return failure("invalid_signing_secret", "Signing secret must contain at least 32 characters.");

  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) return failure("crypto_unavailable", "Web Crypto subtle API is required.");

  const signedJob = structuredClone(job);
  signedJob.signature.value = await createHmacHex(cryptoImpl, secret, job.signatureInput);
  return { ok: true, job: signedJob, error: "", message: "" };
}

export async function verifySketchUpNodeJobSignature(job = {}, secret = "", options = {}) {
  const validation = validateSketchUpNodeJob(job, { now: options.now, allowSigned: true });
  if (!validation.ok) return failure("invalid_signed_job", validation.error);
  if (!job.signature.value) return failure("signature_required", "Signed job must include a signature.");
  if (!isSafeSecret(secret)) return failure("invalid_signing_secret", "Signing secret must contain at least 32 characters.");

  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) return failure("crypto_unavailable", "Web Crypto subtle API is required.");
  const key = await importHmacKey(cryptoImpl, secret);
  const verified = await cryptoImpl.subtle.verify(
    "HMAC",
    key,
    hexToBytes(job.signature.value),
    new TextEncoder().encode(job.signatureInput)
  );
  return verified
    ? { ok: true, job: structuredClone(job), error: "", message: "" }
    : failure("signature_mismatch", "SketchUp node job signature does not match.");
}

export function buildSketchUpNodeRequest(job = {}, options = {}) {
  const validation = validateSketchUpNodeJob(job, { now: options.now, allowSigned: true });
  if (!validation.ok) return failure("invalid_signed_job", validation.error);
  if (!job.signature.value) return failure("signature_required", "Signed job must include a signature.");

  const baseURL = normalizeHttpsBaseURL(options.baseURL);
  if (!baseURL) return failure("invalid_node_url", "SketchUp node baseURL must use HTTPS.");
  return {
    ok: true,
    request: {
      url: `${baseURL}/v1/jobs`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sketchup-signature": job.signature.value,
        "x-idempotency-key": job.idempotencyKey
      },
      body: JSON.stringify(job)
    },
    error: "",
    message: ""
  };
}

async function createHmacHex(cryptoImpl, secret, value) {
  const key = await importHmacKey(cryptoImpl, secret);
  const signature = await cryptoImpl.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function importHmacKey(cryptoImpl, secret) {
  return cryptoImpl.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function normalizeHttpsBaseURL(value) {
  try {
    const url = new URL(clean(value));
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isSafeSecret(value) {
  return typeof value === "string" && value.length >= 32;
}

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  return Uint8Array.from(value.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

function failure(error, message) {
  return { ok: false, job: null, request: null, error, message };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
