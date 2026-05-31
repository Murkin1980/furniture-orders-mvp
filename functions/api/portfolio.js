import { createPortfolioItem, listPortfolio } from "../../src/portfolio-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const isAdmin = hasAdminToken(context.request, context.env);

  try {
    const result = await listPortfolio({
      db: context.env.DB,
      env: context.env,
      publicOnly: !isAdmin,
      categoryCode: url.searchParams.get("category") || ""
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Portfolio list API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Portfolio was not loaded. Please try again later."
      },
      500
    );
  }
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
    const result = await createPortfolioItem({
      db: context.env.DB,
      env: context.env,
      payload
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Portfolio create API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Portfolio item was not saved. Please try again later."
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
      message: "Use GET or POST /api/portfolio."
    },
    405,
    {
      Allow: "GET, POST, OPTIONS"
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
