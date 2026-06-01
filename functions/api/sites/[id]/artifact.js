import { getSiteArtifact } from "../../../../src/sites-core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  try {
    const result = await getSiteArtifact({
      db: context.env.DB,
      env: context.env,
      siteId: context.params.id
    });

    if (!result.ok) {
      return jsonResponse(result.body, result.status);
    }

    return new Response(result.body.html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (error) {
    console.error("Site artifact API failed", error);
    return jsonResponse(
      {
        success: false,
        error: "server_error",
        message: "Site artifact was not generated. Please try again later."
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
      message: "Use GET /api/sites/:id/artifact."
    },
    405,
    {
      Allow: "GET, OPTIONS"
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
