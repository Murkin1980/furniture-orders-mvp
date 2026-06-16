const baseUrl = clean(process.env.VPS_SMOKE_BASE_URL);
const token = clean(process.env.VPS_SMOKE_ADMIN_TOKEN);

if (!baseUrl || !token) {
  console.error("Required env: VPS_SMOKE_BASE_URL, VPS_SMOKE_ADMIN_TOKEN.");
  process.exit(2);
}

const endpoints = [
  "/api/vps/health",
  "/api/vps/services",
  "/api/vps/deploy/logs?limit=5"
];

const results = [];
for (const endpoint of endpoints) {
  results.push(await request(endpoint));
}

console.log(JSON.stringify({ ok: results.every((item) => item.ok), results }, null, 2));
if (results.some((item) => !item.ok)) process.exit(1);

async function request(path) {
  const response = await fetch(`${baseUrl.replace(/\/+$/g, "")}${path}`, {
    headers: { "x-admin-token": token }
  });
  const body = await response.json().catch(() => ({}));
  return {
    endpoint: path,
    ok: response.ok && body.success !== false,
    status: response.status,
    error: body.error || "",
    upstreamStatus: body.upstreamStatus || body.data?.upstreamStatus || null
  };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
