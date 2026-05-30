import { submitCalculatorLead } from "../../../../src/calculators-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost(context) {
  let payload;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "invalid_json",
        message: "Request body must be valid JSON."
      },
      400
    );
  }

  try {
    const url = new URL(context.request.url);
    const result = await submitCalculatorLead({
      db: context.env.DB,
      env: context.env,
      calculatorId: context.params.id,
      token: url.searchParams.get("token"),
      payload
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Calculator lead API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Calculator lead was not saved. Please try again later."
      },
      500
    );
  }
}

export async function onRequest() {
  return jsonResponse(
    {
      success: false,
      error: "method_not_allowed",
      message: "Use POST /api/calculators/:id/lead."
    },
    405,
    {
      Allow: "POST, OPTIONS"
    }
  );
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
