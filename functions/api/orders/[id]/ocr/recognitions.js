import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import { listOrderRecognitionsCore, reviewOrderRecognitionCore } from "../../../../../src/ocr/order-recognition-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  return handle(context, AUTH_SCOPES.READ, () => listOrderRecognitionsCore({ db: context.env.DB }, context.params.id));
}

export async function onRequestPatch(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.WRITE);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  let input;
  try { input = await context.request.json(); }
  catch { return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }
  return handleAuthorized(() => reviewOrderRecognitionCore({ db: context.env.DB }, context.params.id, input));
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use GET or PATCH." }, 405, { Allow: "GET, PATCH, OPTIONS" });
}

async function handle(context, scope, action) {
  const auth = authorizeRequest(context.request, context.env, scope);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  return handleAuthorized(action);
}
async function handleAuthorized(action) {
  try {
    const result = await action();
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order OCR review API failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "OCR review request failed." }, 500);
  }
}
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
