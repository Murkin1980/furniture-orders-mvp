import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import {
  listOrderRenderArtifactsCore,
  saveOrderRenderArtifactCore
} from "../../../../../src/sketchup/render-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.READ);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);

  try {
    const result = await listOrderRenderArtifactsCore(
      { db: context.env.DB },
      context.params.id
    );
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order SketchUp render artifacts API failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "SketchUp render artifacts were not loaded." }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.OPS);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);

  let input;
  try {
    input = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400);
  }

  try {
    const result = await saveOrderRenderArtifactCore(
      { db: context.env.DB },
      context.params.id,
      input,
      {
        now: context.data?.now,
        reportedBy: auth.identity || context.data?.reportedBy
      }
    );
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order SketchUp render artifact API failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "SketchUp render artifact save failed." }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use GET or POST /api/orders/:id/sketchup/render-artifacts." }, 405, { Allow: "GET, POST, OPTIONS" });
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
