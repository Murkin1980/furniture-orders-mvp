const targets = new Set(process.argv
  .filter((arg) => arg.startsWith("--target="))
  .map((arg) => arg.split("=")[1]));

const targetAll = targets.has("all") || targets.size === 0;
const baseUrl = clean(process.env.LAUNCH_SMOKE_BASE_URL);
const token = clean(process.env.LAUNCH_SMOKE_ADMIN_TOKEN);
const allowWrites = process.env.LAUNCH_SMOKE_ALLOW_WRITES === "true";

if (!baseUrl || !token) {
  console.log(JSON.stringify({
    ok: false, target: [...targets],
    results: [],
    next: ["Set LAUNCH_SMOKE_BASE_URL", "Set LAUNCH_SMOKE_ADMIN_TOKEN"]
  }, null, 2));
  process.exit(2);
}

async function main() {
  const results = [];
  let allOk = true;

  async function run(name, testFn) {
    if (!targetAll && !targets.has(name)) return;
    try {
      const res = await testFn();
      results.push({ name, ok: true, details: res });
      console.error(`  ✓ ${name}`);
    } catch (err) {
      results.push({ name, ok: false, details: { error: err.message } });
      console.error(`  ✗ ${name}: ${err.message}`);
      allOk = false;
    }
  }

  // Preflight
  const { default: preflight } = await import("./production-smoke-preflight.mjs");
  await run("preflight", async () => {
    await preflight({ env: process.env, targets: targetsAll ? ["all"] : [...targets] });
    return { preflight: "passed" };
  });

  // Proposal smoke
  if (targetAll || targets.has("proposal")) {
    await run("proposal", async () => {
      const resp = await fetch(`${baseUrl}/api/proposals/preview`, {
        method: "POST",
        headers: { "X-Admin-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Smoke", phone: "+77011234567", items: [] })
      });
      if (!resp.ok) throw new Error(await resp.text());
      return { status: resp.status };
    });
  }

  // VPS read-only smoke
  if (targetAll || targets.has("vps")) {
    await run("vps-read", async () => {
      const resp = await fetch(`${baseUrl}/api/vps/health`, {
        headers: { "X-Admin-Token": token }
      });
      if (!resp.ok) throw new Error(`VPS health: ${resp.status}`);
      const data = await resp.json();
      return { status: resp.status, mode: data?.data?.mode };
    });
  }

  // AI smoke (read-only: check if endpoint responds)
  if (targetAll || targets.has("ai")) {
    await run("ai", async () => {
      const resp = await fetch(`${baseUrl}/api/orders?status=new&limit=1`, {
        headers: { "X-Admin-Token": token }
      });
      if (!resp.ok) throw new Error(`Orders: ${resp.status}`);
      return { status: resp.status };
    });
  }

  // Portfolio read-only smoke
  if (targetAll || targets.has("portfolio")) {
    await run("portfolio-read", async () => {
      const resp = await fetch(`${baseUrl}/api/portfolio`);
      if (!resp.ok) throw new Error(`Portfolio: ${resp.status}`);
      return { status: resp.status };
    });
  }

  // Write smokes (only if explicitly allowed)
  if (allowWrites) {
    if (targetAll || targets.has("proposal-write")) {
      await run("proposal-write", async () => {
        const resp = await fetch(`${baseUrl}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Launch Smoke", phone: "+77019999999", furnitureType: "kitchen" })
        });
        if (!resp.ok) throw new Error(await resp.text());
        return { status: resp.status };
      });
    }
  }

  console.log(JSON.stringify({
    ok: allOk,
    target: targets.size ? [...targets] : "all",
    results: results.map((r) => ({ name: r.name, ok: r.ok, details: r.details })),
    next: allOk ? [] : ["Check failed tests above"]
  }, null, 2));
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
