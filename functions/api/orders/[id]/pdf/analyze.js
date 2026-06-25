import { analyzeOrderPdfCore } from "../../../../../src/pdf/order-pdf-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const auth = requireAdminToken(context.request, context.env);
  if (auth) return auth;

  let input;
  try {
    input = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400);
  }

  try {
    const result = await analyzeOrderPdfCore(
      { db: context.env.DB },
      context.params.id,
      input,
      {
        env: context.env,
        providerName: context.env.AI_PROVIDER,
        model: context.env.AI_MODEL,
        sendPdfAiRequest: context.data?.sendPdfAiRequest,
        createdBy: input.createdBy || "manager"
      }
    );
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order PDF analysis failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "PDF analysis failed." }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use POST /api/orders/:id/pdf/analyze." }, 405, { Allow: "POST, OPTIONS" });
}

function requireAdminToken(request, env) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ success: false, error: "admin_not_configured", message: "ADMIN_TOKEN is not configured." }, 503);
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (bearer === env.ADMIN_TOKEN || request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN) return null;
  return jsonResponse({ success: false, error: "unauthorized", message: "Admin token is invalid or missing." }, 401);
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
