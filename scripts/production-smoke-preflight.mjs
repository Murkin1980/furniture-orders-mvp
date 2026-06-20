import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function buildProductionSmokePreflight(env = process.env, deps = {}) {
  const fileExists = deps.fileExists || defaultFileExists;
  const checks = [
    checkUrl("portfolio.baseUrl", env.PORTFOLIO_SMOKE_BASE_URL),
    checkSecret("portfolio.adminToken", env.PORTFOLIO_SMOKE_ADMIN_TOKEN),
    await checkImage("portfolio.image", env.PORTFOLIO_SMOKE_IMAGE, fileExists),
    checkBoolean("portfolio.publish", env.PORTFOLIO_SMOKE_PUBLISH),
    checkUrl("vps.baseUrl", env.VPS_SMOKE_BASE_URL),
    checkSecret("vps.adminToken", env.VPS_SMOKE_ADMIN_TOKEN),
    checkUrl("ai.baseUrl", env.AI_SMOKE_BASE_URL),
    checkSecret("ai.adminToken", env.AI_SMOKE_ADMIN_TOKEN),
    checkId("ai.orderId", env.AI_SMOKE_ORDER_ID)
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    next: buildNextSteps(checks)
  };
}

export function formatPreflightReport(result) {
  const lines = [
    `Production smoke preflight: ${result.ok ? "ready" : "not ready"}`,
    ""
  ];
  for (const check of result.checks) {
    lines.push(`${check.ok ? "OK" : "MISSING"} ${check.name}: ${check.message}`);
  }
  if (result.next.length > 0) {
    lines.push("", "Next:");
    for (const item of result.next) lines.push(`- ${item}`);
  }
  return lines.join("\n");
}

function checkUrl(name, value) {
  const cleaned = clean(value);
  if (!cleaned) return fail(name, "set the base URL");
  try {
    const parsed = new URL(cleaned);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return fail(name, "base URL must use http or https");
    }
    return pass(name, parsed.origin);
  } catch {
    return fail(name, "base URL is not a valid URL");
  }
}

function checkSecret(name, value) {
  const cleaned = clean(value);
  if (!cleaned) return fail(name, "set the admin token");
  if (cleaned.length < 8) return fail(name, "admin token looks too short");
  return pass(name, "configured");
}

async function checkImage(name, value, fileExists) {
  const cleaned = clean(value);
  if (!cleaned) return fail(name, "set a local JPEG, PNG, or WebP test image path");
  if (!isSupportedImage(cleaned)) {
    return fail(name, "test image must be .jpg, .jpeg, .png, or .webp");
  }
  const exists = await fileExists(cleaned);
  return exists ? pass(name, "found") : fail(name, "file was not found");
}

function checkBoolean(name, value) {
  const cleaned = clean(value);
  if (!cleaned) return pass(name, "not enabled");
  if (cleaned === "true" || cleaned === "false") return pass(name, cleaned);
  return fail(name, "use true or false");
}

function checkId(name, value) {
  const cleaned = clean(value);
  if (!cleaned) return fail(name, "set a synthetic order id");
  if (!/^\d+$/.test(cleaned)) return fail(name, "order id must be numeric");
  return pass(name, cleaned);
}

function buildNextSteps(checks) {
  return checks
    .filter((check) => !check.ok)
    .map((check) => `${check.name}: ${check.message}`);
}

function pass(name, message) {
  return { name, ok: true, message };
}

function fail(name, message) {
  return { name, ok: false, message };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isSupportedImage(path) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

async function defaultFileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const result = await buildProductionSmokePreflight();
  console.log(formatPreflightReport(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
