export async function sendSketchUpNodeRequest(request = {}, options = {}) {
  if (!isValidRequest(request)) return failure("invalid_request", "A valid signed SketchUp node request is required.", 0);
  if (typeof options.fetchFn !== "function") return failure("fetch_required", "Injected fetchFn is required.", 0);

  try {
    const response = await options.fetchFn(request.url, {
      method: request.method,
      headers: { ...request.headers },
      body: request.body
    });
    if (!response?.ok) return httpFailure(response?.status, 1);

    let data;
    try {
      data = await response.json();
    } catch {
      return failure("invalid_node_response", "SketchUp node returned invalid JSON.", 1);
    }
    if (!isPlainObject(data)) return failure("invalid_node_response", "SketchUp node returned an invalid response.", 1);
    return { ok: true, response: data, error: "", message: "", meta: { attempts: 1 } };
  } catch (error) {
    return failure("network_error", safeError(error), 1);
  }
}

function isValidRequest(request) {
  return isPlainObject(request)
    && typeof request.url === "string"
    && request.url.startsWith("https://")
    && request.method === "POST"
    && isPlainObject(request.headers)
    && typeof request.headers["x-sketchup-signature"] === "string"
    && /^[a-f0-9]{64}$/.test(request.headers["x-sketchup-signature"])
    && typeof request.body === "string";
}

function httpFailure(status, attempts) {
  if (status === 401 || status === 403) return failure("authorization_failed", "SketchUp node authorization failed.", attempts);
  if (status === 429) return failure("rate_limited", "SketchUp node rate limit reached. Request was not retried.", attempts);
  if (status >= 500) return failure("node_server_error", "SketchUp node server error.", attempts);
  return failure("node_request_rejected", `SketchUp node rejected the request with HTTP ${status || "unknown"}.`, attempts);
}

function failure(error, message, attempts) {
  return { ok: false, response: null, error, message, meta: { attempts } };
}

function safeError(error) {
  return error instanceof Error && error.message ? error.message : "SketchUp node network request failed.";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
