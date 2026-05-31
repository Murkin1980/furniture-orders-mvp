import { getPortfolioItem, updatePortfolioItem } from "../../../src/portfolio-core.js";

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
  const isAdmin = hasAdminToken(context.request, context.env);

  try {
    const result = await getPortfolioItem({
      db: context.env.DB,
      env: context.env,
      itemId: context.params.id,
      publicOnly: !isAdmin
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Portfolio detail API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Portfolio item was not loaded. Please try again later."
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
    const result = await updatePortfolioItem({
      db: context.env.DB,
      env: context.env,
      itemId: context.params.id,
      payload
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Portfolio update API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Portfolio item was not updated. Please try again later."
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
      message: "Use GET or PUT /api/portfolio/:id."
    },
    405,
    {
      Allow: "GET, PUT, OPTIONS"
    }
  );
}

function hasAdminToken(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("Authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const headerToken = request.headers.get("X-Admin-Token");

  return bearerToken === expected || headerToken === expected;
}

function requireAdminToken(request, env) {
  if (hasAdminToken(request, env)) {
    return null;
  }

  if (!env.ADMIN_TOKEN) {
    return jsonResponse(
      {
        success: false,
        error: "admin_not_configured",
        message: "ADMIN_TOKEN is not configured."
      },
      503
    );
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
