# Production Ops Next Actions

## Current State

Last pushed commit:

```text
df8f1f2 docs: update production ops progress checkpoint
```

Cloudflare core is operational:

- Pages project: `furniture-orders-mvp`;
- production domain: `https://furniture-orders-mvp.pages.dev`;
- R2 bucket: `furniture-portfolio-media`;
- portfolio public API: verified `200`;
- media route sees R2 binding: missing object returns `404`, not `503`;
- AI manual endpoint is protected: unauthenticated POST returns `401`;
- VPS proxy endpoints are protected: unauthenticated GET returns `401`.

## Ready Runners

### Local preflight, no network

```powershell
node scripts/production-smoke-preflight.mjs
```

Validates required env values and the local portfolio test image path before
running any production smoke. It does not call network APIs and does not write
production data.

### Portfolio media write-smoke

```powershell
$env:PORTFOLIO_SMOKE_BASE_URL="https://furniture-orders-mvp.pages.dev"
$env:PORTFOLIO_SMOKE_ADMIN_TOKEN="<admin token>"
$env:PORTFOLIO_SMOKE_IMAGE="C:\path\to\small-test.webp"
$env:PORTFOLIO_SMOKE_PUBLISH="false"
node scripts/portfolio-media-smoke.mjs
```

Creates a draft portfolio item and uploads one image. Use only after approving
a temporary production draft/R2 object.

### VPS read-only smoke

```powershell
$env:VPS_SMOKE_BASE_URL="https://furniture-orders-mvp.pages.dev"
$env:VPS_SMOKE_ADMIN_TOKEN="<production admin token>"
node scripts/vps-readonly-smoke.mjs
```

Calls only health, services, and deploy logs. It does not deploy, reload, or
restart anything.

### AI manual smoke

```powershell
$env:AI_SMOKE_BASE_URL="https://furniture-orders-mvp.pages.dev"
$env:AI_SMOKE_ADMIN_TOKEN="<admin token>"
$env:AI_SMOKE_ORDER_ID="<synthetic order id>"
node scripts/ai-manual-smoke.mjs
```

Writes AI result fields to the selected order. Use only with a synthetic order.

## Do Not Do Without Explicit Approval

- Do not upload real customer images.
- Do not run portfolio write-smoke on production without approving a temporary
  draft/R2 object.
- Do not run AI smoke on a real customer order.
- Do not call VPS deploy/reload/restart from automation.
- Do not apply production migrations during smoke checks.

## Suggested Next Order

1. Set the smoke env values and run local preflight.
2. Run VPS read-only smoke with production admin token.
3. Run portfolio write-smoke with a tiny synthetic image.
4. Run AI manual smoke on a synthetic order.
5. If all three pass, mark Portfolio/media and Infrastructure production ops
   as complete in `PROJECT_PROGRESS.md` and `PROJECT_PROGRESS.html`.
