import { AUTH_SCOPES, authorizeRequest } from "../../../../src/auth.js";
import { approveProposalVersion } from "../../../../src/proposals/proposal-store.js";

export async function onRequestPost(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.WRITE);
  if (!auth.ok) return json({ success: false, error: auth.error, message: auth.message }, auth.status);
  let body;
  try { body = await context.request.json(); } catch { return json({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }
  const result = await approveProposalVersion({ db: context.env.DB, proposalId: context.params.id, versionNumber: body.versionNumber, confirmed: body.confirmed === true, approvedBy: body.approvedBy });
  return json(result.body, result.status);
}
export async function onRequestOptions() { return new Response(null, { status: 204, headers: headers() }); }
export async function onRequest() { return json({ success: false, error: "method_not_allowed", message: "Use POST /api/proposals/:id/approve." }, 405); }
function headers() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token" }; }
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...headers(), "Content-Type": "application/json; charset=utf-8" } }); }
