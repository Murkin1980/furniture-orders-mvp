const baseUrl = clean(process.env.AI_SMOKE_BASE_URL);
const token = clean(process.env.AI_SMOKE_ADMIN_TOKEN);
const orderId = clean(process.env.AI_SMOKE_ORDER_ID);

if (!baseUrl || !token || !orderId) {
  console.error("Required env: AI_SMOKE_BASE_URL, AI_SMOKE_ADMIN_TOKEN, AI_SMOKE_ORDER_ID.");
  process.exit(2);
}

const response = await fetch(`${baseUrl.replace(/\/+$/g, "")}/api/orders/${encodeURIComponent(orderId)}/ai/analyze`, {
  method: "POST",
  headers: { "x-admin-token": token }
});
const body = await response.json().catch(() => ({}));

console.log(JSON.stringify({
  ok: response.ok && body.success !== false,
  status: response.status,
  orderId,
  aiStatus: body.update?.ai_status || "",
  aiScore: body.update?.ai_score ?? null,
  aiTemperature: body.update?.ai_temperature || "",
  aiError: body.update?.ai_error || body.error || ""
}, null, 2));

if (!response.ok || body.success === false) process.exit(1);

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
