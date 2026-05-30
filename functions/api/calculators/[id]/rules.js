import { getCalculatorRules, updateCalculatorRules } from "../../../../src/calculators-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  const auth = requireAdminToken(context.request, context.env);
  if (auth) {
    return auth;
  }

  try {
    const result = await getCalculatorRules({
      db: context.env.DB,
      env: context.env,
      calculatorId: context.params.id
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Calculator rules API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Calculator rules were not loaded. Please try again later."
      },
      500
    );
  }
}

export async function onRequestPut(context) {
  const auth = requireAdminToken(context.request, context.env);
  if (auth) {
    return auth;
  }

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
    const result = await updateCalculatorRules({
      db: context.env.DB,
      env: context.env,
      calculatorId: context.params.id,
      payload
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Calculator rules update API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Calculator rules were not saved. Please try again later."
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
      message: "Use GET or PUT /api/calculators/:id/rules."
    },
    405,
    {
      Allow: "GET, PUT, OPTIONS"
    }
  );
}

function requireAdminToken(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    return jsonResponse(
      {
        success: false,
        error: "admin_not_configured",
        message: "ADMIN_TOKEN is not configured."
      },
      503
    );
  }

  const authorization = request.headers.get("Authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const headerToken = request.headers.get("X-Admin-Token");

  if (bearerToken === expected || headerToken === expected) {
    return null;
  }

  return jsonResponse(
    {
      success: false,
      error: "unauthorized",
      message: "Admin token is invalid or missing."
    },
    401
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
