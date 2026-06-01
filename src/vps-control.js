const DEFAULT_TIMEOUT_MS = 8000;
const ALLOWED_WEBSERVERS = new Set(["nginx", "caddy"]);

export async function getVpsHealth({ env = {}, fetchImpl = fetch }) {
  return vpsRequest({ env, fetchImpl, path: "/health" });
}

export async function getVpsServices({ env = {}, fetchImpl = fetch }) {
  return vpsRequest({ env, fetchImpl, path: "/services" });
}

export async function deployVpsSite({ env = {}, payload, fetchImpl = fetch }) {
  const normalized = normalizeDeployPayload(payload);
  const errors = validateDeployPayload(normalized);
  if (errors.length) {
    return validationResponse(errors);
  }

  return vpsRequest({
    env,
    fetchImpl,
    path: "/deploy/site",
    method: "POST",
    payload: normalized
  });
}

export async function reloadVpsWebserver({ env = {}, payload, fetchImpl = fetch }) {
  const normalized = normalizeReloadPayload(payload);

  if (!ALLOWED_WEBSERVERS.has(normalized.webserver)) {
    return validationResponse([
      { field: "webserver", message: "webserver must be nginx or caddy." }
    ]);
  }

  return vpsRequest({
    env,
    fetchImpl,
    path: "/reload/webserver",
    method: "POST",
    payload: normalized
  });
}

export async function getVpsDeployLogs({ env = {}, query = {}, fetchImpl = fetch }) {
  const params = new URLSearchParams();
  const siteSlug = cleanSlug(query.siteSlug);
  const limit = normalizeLimit(query.limit);

  if (siteSlug) {
    params.set("siteSlug", siteSlug);
  }
  params.set("limit", String(limit));

  return vpsRequest({
    env,
    fetchImpl,
    path: `/deploy/logs?${params.toString()}`
  });
}

export function normalizeDeployPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    siteSlug: cleanSlug(payload.siteSlug),
    sourceUrl: cleanText(payload.sourceUrl),
    targetPath: cleanText(payload.targetPath),
    dryRun: payload.dryRun !== false,
    artifactType: cleanSlug(payload.artifactType) || "html"
  };
}

export function normalizeReloadPayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  return {
    webserver: cleanSlug(payload.webserver) || "nginx"
  };
}

function validateDeployPayload(payload) {
  const errors = [];

  if (!payload.siteSlug) {
    errors.push({ field: "siteSlug", message: "siteSlug is required." });
  }

  if (!payload.sourceUrl) {
    errors.push({ field: "sourceUrl", message: "sourceUrl is required." });
  }

  if (payload.sourceUrl && !isHttpUrl(payload.sourceUrl)) {
    errors.push({ field: "sourceUrl", message: "sourceUrl must be an http or https URL." });
  }
  if (payload.artifactType !== "html") {
    errors.push({ field: "artifactType", message: "artifactType must be html." });
  }

  return errors;
}

async function vpsRequest({ env, fetchImpl, path, method = "GET", payload }) {
  const config = getVpsConfig(env);
  if (!config.ok) {
    return config;
  }

  const url = new URL(path, config.baseUrl);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : null;

  try {
    const response = await fetchImpl(url.toString(), {
      method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.token}`
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller?.signal
    });
    const body = await readResponseBody(response);

    return {
      ok: response.ok,
      status: response.ok ? 200 : response.status,
      body: {
        success: response.ok,
        controlConfigured: true,
        upstreamStatus: response.status,
        data: body
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      body: {
        success: false,
        error: "vps_control_unreachable",
        message: error?.name === "AbortError"
          ? "VPS control API request timed out."
          : "VPS control API is unreachable."
      }
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function getVpsConfig(env) {
  const baseUrl = cleanText(env.VPS_CONTROL_BASE_URL);
  const token = cleanText(env.VPS_CONTROL_TOKEN);
  const timeoutMs = normalizeTimeout(env.VPS_CONTROL_TIMEOUT_MS);

  if (!baseUrl || !token) {
    return {
      ok: false,
      status: 503,
      body: {
        success: false,
        error: "vps_control_not_configured",
        message: "VPS_CONTROL_BASE_URL and VPS_CONTROL_TOKEN must be configured."
      }
    };
  }

  if (!isHttpUrl(baseUrl)) {
    return {
      ok: false,
      status: 503,
      body: {
        success: false,
        error: "vps_control_invalid_config",
        message: "VPS_CONTROL_BASE_URL must be an http or https URL."
      }
    };
  }

  return {
    ok: true,
    baseUrl: baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    token,
    timeoutMs
  };
}

async function readResponseBody(response) {
  const contentType = response.headers?.get?.("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { text } : null;
}

function validationResponse(fields) {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "validation_error",
      message: "Request validation failed.",
      fields
    }
  };
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeLimit(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(200, Math.max(1, Math.round(number))) : 50;
}

function normalizeTimeout(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(30000, Math.max(1000, Math.round(number))) : DEFAULT_TIMEOUT_MS;
}
