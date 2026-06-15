import { AUTH_SCOPES, authorizeRequest } from "../../../../../src/auth.js";
import { recognizeOrderImageCore } from "../../../../../src/ocr/order-recognition-core.js";
import { sendOpenAiVisionRequest } from "../../../../../src/ocr/openai-vision.js";
import { evaluateRecognitionPolicy } from "../../../../../src/ocr/recognition-policy.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.WRITE);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  const injectedSender = context.data?.sendRecognitionRequest;
  if (typeof injectedSender !== "function" && context.env.OCR_RECOGNITION_ENABLED !== "true") {
    return jsonResponse({
      success: false,
      error: "ocr_recognition_disabled",
      message: "OCR recognition provider is disabled."
    }, 503);
  }

  let input;
  try {
    input = await context.request.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400);
  }

  const policy = evaluateRecognitionPolicy(input, context.env);
  if (!policy.ok) {
    return jsonResponse({ success: false, error: policy.error, message: policy.message }, policy.status);
  }

  try {
    const result = await recognizeOrderImageCore({ db: context.env.DB }, context.params.id, input, {
      sendRecognitionRequest: injectedSender || ((request) => sendOpenAiVisionRequest(request, {
        providerName: context.env.OCR_PROVIDER,
        model: context.env.OCR_MODEL,
        env: context.env
      })),
      provider: context.data?.provider || context.env.OCR_PROVIDER || "openai",
      model: context.data?.model || context.env.OCR_MODEL,
      createdBy: context.data?.createdBy || "manager",
      consentAudit: policy.consentAudit
    });
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order OCR recognition API failed", error);
    return jsonResponse({
      success: false, error: "server_error", message: "Order image recognition failed."
    }, 500);
  }
}

export async function onRequest() {
  return jsonResponse({
    success: false, error: "method_not_allowed", message: "Use POST /api/orders/:id/ocr/recognize."
  }, 405, { Allow: "POST, OPTIONS" });
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
