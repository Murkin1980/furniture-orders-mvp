export async function sendOpenAiCompatibleRequest(request, options = {}) {
  validateRequest(request);

  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("AI request fetch implementation is not available.");
  }

  if (!request.headers?.Authorization) {
    throw new Error("AI provider API key is missing.");
  }

  let response;
  try {
    response = await fetchFn(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body)
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
    throw new Error(`AI provider network request failed${detail}`);
  }

  if (!response.ok) {
    throw new Error(getHttpErrorMessage(response.status));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("AI provider returned invalid JSON.");
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI provider response is missing choices[0].message.content.");
  }

  return { content };
}

function validateRequest(request) {
  if (!request || typeof request !== "object") {
    throw new TypeError("AI request object is required.");
  }
  if (typeof request.url !== "string" || !request.url.trim()) {
    throw new TypeError("AI request URL is required.");
  }
  if (!request.headers || typeof request.headers !== "object") {
    throw new TypeError("AI request headers are required.");
  }
  if (!request.body || typeof request.body !== "object") {
    throw new TypeError("AI request body is required.");
  }
}

function getHttpErrorMessage(status) {
  if (status === 401 || status === 403) {
    return "AI provider authorization failed. Check the API key.";
  }
  if (status === 429) {
    return "AI provider rate limit exceeded. Try again later.";
  }
  if (status >= 500) {
    return `AI provider server error (${status}).`;
  }
  return `AI provider request failed with HTTP ${status}.`;
}
