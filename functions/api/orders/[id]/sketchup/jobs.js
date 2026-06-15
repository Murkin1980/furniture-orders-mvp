import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import { createOrderSketchUpJobCore } from "../../../../../src/sketchup/order-job-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.OPS);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  let input;
  try { input = await context.request.json(); }
  catch { return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }

  try {
    const result = await createOrderSketchUpJobCore(
      { db: context.env.DB, sendNodeRequest: context.data?.sendNodeRequest },
      context.params.id,
      { ...input, jobId: input.jobId || context.data?.jobId || crypto.randomUUID() },
      {
        now: context.data?.now,
        completedAt: context.data?.completedAt,
        signingSecret: context.env.SKETCHUP_NODE_SIGNING_SECRET,
        baseURL: context.env.SKETCHUP_NODE_BASE_URL
      }
    );
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order SketchUp job API failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "SketchUp job request failed." }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use POST /api/orders/:id/sketchup/jobs." }, 405, { Allow: "POST, OPTIONS" });
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
