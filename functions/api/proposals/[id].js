import { AUTH_SCOPES, authorizeRequest } from "../../../src/auth.js";
import { getProposal } from "../../../src/proposals/proposal-store.js";

export async function onRequestGet(context) {
  const auth = authorizeRequest(context.request, context.env, AUTH_SCOPES.READ);
  if (!auth.ok) return json({ success: false, error: auth.error, message: auth.message }, auth.status);
  const result = await getProposal({ db: context.env.DB, proposalId: context.params.id });
  return json(result.body, result.status);
}
export async function onRequestOptions() { return new Response(null, { status: 204, headers: headers() }); }
export async function onRequest() { return json({ success: false, error: "method_not_allowed", message: "Use GET /api/proposals/:id." }, 405); }
function headers() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token" }; }
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...headers(), "Content-Type": "application/json; charset=utf-8" } }); }
