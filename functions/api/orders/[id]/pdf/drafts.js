import { listOrderPdfDraftsCore, reviewOrderPdfDraftCore } from "../../../../../src/pdf/order-pdf-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const auth = requireAdminToken(context.request, context.env);
  if (auth) return auth;
  try {
    const result = await listOrderPdfDraftsCore({ db: context.env.DB }, context.params.id);
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("List PDF drafts failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "Failed to list PDF drafts." }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = requireAdminToken(context.request, context.env);
  if (auth) return auth;
  let input;
  try { input = await context.request.json(); }
  catch { return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }
  try {
    const result = await reviewOrderPdfDraftCore({ db: context.env.DB }, context.params.id, input);
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Review PDF draft failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "Failed to review PDF draft." }, 500);
  }
}

export async function onRequest(context) {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use GET or POST /api/orders/:id/pdf/drafts." }, 405, { Allow: "GET, POST, OPTIONS" });
}

function requireAdminToken(request, env) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ success: false, error: "admin_not_configured", message: "ADMIN_TOKEN is not configured." }, 503);
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (bearer === env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN) return null;
  return jsonResponse({ success: false, error: "unauthorized", message: "Admin token is invalid or missing." }, 401);
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
