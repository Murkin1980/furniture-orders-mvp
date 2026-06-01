import { uploadPortfolioImage } from "../../../../../src/portfolio-core.js";

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

  let formData;
  try {
    formData = await context.request.formData();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "invalid_form_data",
        message: "Request body must be multipart/form-data."
      },
      400
    );
  }

  try {
    const result = await uploadPortfolioImage({
      db: context.env.DB,
      env: context.env,
      itemId: context.params.id,
      file: formData.get("file"),
      payload: {
        altText: formData.get("altText"),
        sortOrder: formData.get("sortOrder"),
        isCover: formData.get("isCover")
      }
    });

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error("Portfolio upload API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Portfolio image was not uploaded. Please try again later."
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
      message: "Use POST /api/portfolio/:id/images/upload."
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
