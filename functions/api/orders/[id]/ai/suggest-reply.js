import { suggestOrderReplyCore } from "../../../../../src/ai/order-reply-core.js";
import { sendOpenAiCompatibleRequest } from "../../../../../src/ai/send-ai-request.js";

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

  if (context.env.AI_COMMUNICATIONS_ENABLED !== "true") {
    return jsonResponse({
      success: false,
      error: "ai_communications_disabled",
      message: "AI communications is disabled."
    }, 503);
  }

  try {
    const result = await suggestOrderReplyCore({ db: context.env.DB }, context.params.id, {
      providerName: context.env.AI_PROVIDER,
      model: context.env.AI_MODEL,
      env: context.env,
      sendAiRequest: context.data?.sendAiRequest || ((request) => sendOpenAiCompatibleRequest(request))
    });
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order AI reply suggestion failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "AI reply suggestion failed." }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use POST /api/orders/:id/ai/suggest-reply." }, 405, { Allow: "POST, OPTIONS" });
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
