import { createOrderInteraction, listOrderInteractions } from "../../src/order-interactions.js";

export async function onRequestGet(context) {
  const auth = requireAdmin(context);
  if (auth) return auth;
  const url = new URL(context.request.url);
  return respond(await listOrderInteractions({ db: context.env.DB, orderId: url.searchParams.get("orderId") }));
}

export async function onRequestPost(context) {
  const auth = requireAdmin(context);
  if (auth) return auth;
  let payload;
  try { payload = await context.request.json(); } catch { return json({ success: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400); }
  return respond(await createOrderInteraction({ db: context.env.DB, ...payload }));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequest() {
  return json({ success: false, error: "method_not_allowed", message: "Use GET or POST /api/order-interactions." }, 405);
}

function requireAdmin(context) {
  const expected = context.env.ADMIN_TOKEN;
  const request = context.request;
  const authorization = request.headers.get("Authorization") || "";
  const token = request.headers.get("X-Admin-Token") || (authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  if (!expected) return json({ success: false, error: "admin_not_configured", message: "ADMIN_TOKEN is not configured." }, 503);
  return token === expected ? null : json({ success: false, error: "unauthorized", message: "Admin token is invalid or missing." }, 401);
}

function respond(result) { return json(result.body, result.status); }
function corsHeaders() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token" }; }
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" } }); }
