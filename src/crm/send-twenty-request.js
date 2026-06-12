export async function sendTwentyRequest(request, options = {}) {
  validateRequest(request);

  const fetchFn = options.fetchFn;
  if (typeof fetchFn !== "function") {
    throw new Error("Twenty request requires an injected fetchFn.");
  }
  if (!request.headers.Authorization) {
    throw new Error("Twenty API key is missing.");
  }

  let response;
  try {
    response = await fetchFn(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body)
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
    throw new Error(`Twenty network request failed${detail}`);
  }

  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Twenty returned invalid JSON.");
  }

  return {
    data,
    status: response.status,
    resource: request.resource
  };
}

function validateRequest(request) {
  if (!request || typeof request !== "object") {
    throw new TypeError("Twenty request object is required.");
  }
  if (typeof request.url !== "string" || !request.url.trim()) {
    throw new TypeError("Twenty request URL is required.");
  }
  if (request.method !== "POST") {
    throw new TypeError("Twenty request method must be POST.");
  }
  if (!request.headers || typeof request.headers !== "object") {
    throw new TypeError("Twenty request headers are required.");
  }
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    throw new TypeError("Twenty request body must be an object.");
  }
}

function getHttpErrorMessage(status) {
  if (status === 401 || status === 403) {
    return "Twenty authorization failed. Check the API key.";
  }
  if (status === 429) {
    return "Twenty rate limit exceeded. Stop and try again later.";
  }
  if (status >= 500) {
    return `Twenty server error (${status}).`;
  }
  return `Twenty request failed with HTTP ${status}.`;
}
