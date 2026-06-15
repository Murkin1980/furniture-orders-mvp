import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import {
  deleteOrderRecognitionCore,
  listOrderRecognitionsCore,
  reviewOrderRecognitionCore
} from "../../../../../src/ocr/order-recognition-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
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

export async function onRequestDelete(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.WRITE);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  let input;
  try { input = await context.request.json(); }
  catch { return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }
  const deleteStoredImage = context.data?.deleteStoredImage || buildBucketDeleter(context.env.OCR_MEDIA_BUCKET);
  return handleAuthorized(() => deleteOrderRecognitionCore(
    { db: context.env.DB, deleteStoredImage },
    context.params.id,
    input,
    { now: context.data?.now }
  ));
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use GET, PATCH, or DELETE." }, 405, { Allow: "GET, PATCH, DELETE, OPTIONS" });
}

function buildBucketDeleter(bucket) {
  return bucket && typeof bucket.delete === "function"
    ? ({ mediaId }) => bucket.delete(mediaId)
    : undefined;
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
