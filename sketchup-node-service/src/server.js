import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { handleFakeSketchUpNodeJob } from "../../src/sketchup/fake-node.js";
import { createConfig } from "./config.js";

export function createApp(configOverrides = {}, options = {}) {
  const config = createConfig(configOverrides, options.env);
  const acceptedJobs = options.acceptedJobs ?? new Map();
  const now = options.now;

  const server = createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return sendJson(res, 200, {
          success: true,
          data: {
            service: "furniture-sketchup-node",
            status: "ok",
            mode: config.mode,
            executionEnabled: false
          }
        });
      }
      if (req.method !== "POST" || req.url !== "/v1/jobs") {
        return sendJson(res, 404, errorBody("not_found", "Endpoint not found."));
      }

      const job = await readJson(req, config.maxBodyBytes);
      const headerError = validateTransportHeaders(req.headers, job);
      if (headerError) return sendJson(res, 400, errorBody("transport_mismatch", headerError));

      const result = await handleFakeSketchUpNodeJob(job, {
        signingSecret: config.signingSecret,
        now,
        hasIdempotencyKey: async (key) => acceptedJobs.has(key),
        markIdempotencyKey: async (key, value) => acceptedJobs.set(key, value)
      });
      return sendJson(res, statusFor(result), { success: result.status === "accepted", data: result });
    } catch (error) {
      const status = error.statusCode || 500;
      return sendJson(res, status, errorBody(
        status === 413 ? "payload_too_large" : status === 400 ? "invalid_json" : "internal_error",
        status === 500 ? "An internal error occurred." : error.message
      ));
    }
  });

  return { server, config, acceptedJobs };
}

function validateTransportHeaders(headers, job) {
  const signature = String(headers["x-sketchup-signature"] || "").trim();
  const idempotencyKey = String(headers["x-idempotency-key"] || "").trim();
  if (!signature || signature !== job?.signature?.value) return "Signature header must match the signed job.";
  if (!idempotencyKey || idempotencyKey !== job?.idempotencyKey) {
    return "Idempotency header must match the signed job.";
  }
  return "";
}

function statusFor(result) {
  if (result.status === "accepted") return 202;
  if (result.error === "duplicate_job") return 409;
  if (["signature_required", "signature_mismatch", "invalid_signing_secret"].includes(result.error)) return 401;
  return 400;
}

function readJson(req, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= maxBodyBytes) chunks.push(chunk);
    });
    req.on("end", () => {
      if (size > maxBodyBytes) return reject(httpError(413, "Request body is too large."));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(httpError(400, "Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, body) {
  const json = `${JSON.stringify(body)}\n`;
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(json)
  });
  res.end(json);
}

function errorBody(error, message) {
  return { success: false, error, message };
}

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server, config } = createApp();
  server.listen(config.port, config.host, () => {
    console.log(`SketchUp node dry-run service listening on ${config.host}:${config.port}`);
    console.log("SketchUp execution is disabled.");
  });
}
