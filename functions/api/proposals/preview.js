import { AUTH_SCOPES, authorizeRequest } from "../../../src/auth.js";
import {
  normalizeCommercialProposal,
  renderCommercialProposalHtml
} from "../../../src/proposals/commercial-proposal-template.js";

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
  if (!auth.ok) {
    return jsonResponse({ success: false, error: auth.error, message: auth.message }, auth.status);
  }

  let draft;
  try {
    draft = await context.request.json();
  } catch {
    return jsonResponse({
      success: false,
      error: "invalid_json",
      message: "Request body must be valid JSON."
    }, 400);
  }

  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return jsonResponse({
      success: false,
      error: "invalid_proposal",
      message: "Proposal draft must be a JSON object."
    }, 400);
  }

  const proposal = normalizeCommercialProposal(draft);
  return jsonResponse({
    success: true,
    proposal,
    html: renderCommercialProposalHtml(proposal)
  });
}

export async function onRequest() {
  return jsonResponse({
    success: false,
    error: "method_not_allowed",
    message: "Use POST /api/proposals/preview."
  }, 405, { Allow: "POST, OPTIONS" });
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
