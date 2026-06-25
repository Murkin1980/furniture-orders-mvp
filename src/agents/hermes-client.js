export const HERMES_ERROR = {
  DISABLED: "hermes_agent_disabled",
  MISSING_URL: "hermes_agent_not_configured",
  MISSING_TOKEN: "hermes_agent_token_missing",
  INVALID_PAYLOAD: "hermes_agent_invalid_payload",
  TIMEOUT: "hermes_agent_timeout",
  HTTP_ERROR: "hermes_agent_http_error",
  INVALID_JSON: "hermes_agent_invalid_json",
  NETWORK_ERROR: "hermes_agent_network_error"
};

export async function sendToHermes(payload, options = {}) {
  if (options.enabled !== true) {
    return hermesError(HERMES_ERROR.DISABLED, "Hermes Agent is disabled.");
  }

  const webhookUrl = options.webhookUrl;
  if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
    return hermesError(HERMES_ERROR.MISSING_URL, "Hermes Agent webhook URL is not configured.");
  }

  const token = options.token;
  if (!token || typeof token !== "string" || !token.trim()) {
    return hermesError(HERMES_ERROR.MISSING_TOKEN, "Hermes Agent token is not configured.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return hermesError(HERMES_ERROR.INVALID_PAYLOAD, "Hermes Agent payload is invalid.");
  }

  const fetchFn = options.fetchFn;
  if (typeof fetchFn !== "function") {
    throw new Error("Hermes fetch implementation is not available.");
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? Math.round(options.timeoutMs)
    : 4000;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetchFn(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return hermesError(
        HERMES_ERROR.HTTP_ERROR,
        `Hermes Agent returned HTTP ${response.status}.`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return hermesError(HERMES_ERROR.INVALID_JSON, "Hermes Agent returned invalid JSON.");
    }

    return { ok: true, data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error && error.name === "AbortError") {
      return hermesError(HERMES_ERROR.TIMEOUT, `Hermes Agent request timed out after ${timeoutMs} ms.`);
    }

    return hermesError(HERMES_ERROR.NETWORK_ERROR, "Hermes Agent network request failed.");
  }
}

function hermesError(code, message) {
  return { ok: false, error: code, message };
}
