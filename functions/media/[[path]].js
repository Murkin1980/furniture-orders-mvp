const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  return serveMediaObject(context, false);
}

export async function onRequestHead(context) {
  return serveMediaObject(context, true);
}

export async function onRequest() {
  return jsonResponse(
    {
      success: false,
      error: "method_not_allowed",
      message: "Use GET /media/:path."
    },
    405,
    {
      Allow: "GET, HEAD, OPTIONS"
    }
  );
}

async function serveMediaObject(context, headOnly) {
  const bucket = context.env.PORTFOLIO_MEDIA_BUCKET;
  if (!bucket || typeof bucket.get !== "function") {
    return jsonResponse(
      {
        success: false,
        error: "portfolio_media_not_configured",
        message: "PORTFOLIO_MEDIA_BUCKET is not configured."
      },
      503
    );
  }

  const key = normalizeMediaKey(context.params.path);
  if (!key) {
    return jsonResponse(
      {
        success: false,
        error: "invalid_media_key",
        message: "Media key is invalid."
      },
      400
    );
  }

  const object = await bucket.get(key);
  if (!object) {
    return jsonResponse(
      {
        success: false,
        error: "media_not_found",
        message: "Media object was not found."
      },
      404
    );
  }

  return new Response(headOnly ? null : object.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": object.httpEtag
    }
  });
}

function normalizeMediaKey(value) {
  const raw = Array.isArray(value) ? value.join("/") : String(value || "");
  const key = raw.replace(/^\/+|\/+$/g, "");
  if (!key || key.includes("..") || key.includes("\\") || !key.startsWith("portfolio/")) {
    return "";
  }

  return key;
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
