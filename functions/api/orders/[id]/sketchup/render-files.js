import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import { uploadSketchUpRenderFile } from "../../../../../src/sketchup/render-file.js";

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

  let formData;
  try {
    formData = await context.request.formData();
  } catch {
    return jsonResponse({ success: false, error: "invalid_form_data", message: "Request body must be multipart/form-data." }, 400);
  }

  try {
    const result = await uploadSketchUpRenderFile(
      {
        db: context.env.DB,
        bucket: context.env.SKETCHUP_RENDER_BUCKET
      },
      context.params.id,
      formData.get("file"),
      {
        jobId: formData.get("jobId"),
        role: formData.get("role")
      },
      {
        fileId: context.data?.fileId
      }
    );
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order SketchUp render file upload API failed", error);
    return jsonResponse({ success: false, error: "server_error", message: "SketchUp render file upload failed." }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({ success: false, error: "method_not_allowed", message: "Use POST /api/orders/:id/sketchup/render-files." }, 405, { Allow: "POST, OPTIONS" });
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
