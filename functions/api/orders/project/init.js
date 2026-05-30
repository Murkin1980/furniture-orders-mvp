import { createOrderProjectSteps } from "../../../../src/orders-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost(context) {
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
    const result = await createOrderProjectSteps({
      db: context.env.DB,
      env: context.env,
      orderId: payload.orderId
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Order project init API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Order project steps were not initialized. Please try again later."
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
      message: "Use POST /api/orders/project/init."
    },
    405,
    {
      Allow: "POST, OPTIONS"
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
