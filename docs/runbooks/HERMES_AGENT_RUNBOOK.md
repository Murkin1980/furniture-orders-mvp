# Hermes Agent runbook

## Overview

Hermes Agent is an external agent assistant deployed on a Google Cloud VPS. It
receives a minimal order context, classifies the lead, identifies missing
information, and returns a structured reply draft for manager review.

Hermes is not required for order intake. The platform remains fully operational
when Hermes is unavailable.

## Current status

- Hermes integration: Stage 0 (documentation only).
- Implementation slices are defined in
  `docs/decisions/HERMES_AGENT_INTEGRATION_DECISION.md`.
- Hermes is disabled by default.
- No Hermes endpoint, client, or payload changes have been made to the platform
  yet.

## Environment variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `HERMES_AGENT_ENABLED` | `false` | No | Set to `true` to enable Hermes calls |
| `HERMES_AGENT_WEBHOOK_URL` | — | If enabled | Full HTTPS URL of the Hermes webhook endpoint |
| `HERMES_AGENT_TOKEN` | — | If enabled | Bearer token for Hermes authentication |
| `HERMES_AGENT_TIMEOUT_MS` | `4000` | No | Timeout in milliseconds for Hermes HTTP calls |

## How it works

### Order creation flow (after Slice 4)

```
1. POST /api/orders — receives new order
2. createOrder() validates, normalizes, saves client + order in D1
3. notifyTelegram() — sends Telegram notification
4. notifyHermesAgent() — best-effort: sends minimal payload to Hermes
5. Hermes returns structured JSON or times out
6. Platform saves the result as a communication draft (if replyDraft present)
7. Response returns 201 regardless of Hermes status
```

### Manual trigger (after Slice 3)

```
1. Admin clicks "Hermes Agent" on an order
2. POST /api/orders/:id/agent/hermes
3. Loads order, builds minimal payload
4. Calls Hermes endpoint
5. Saves result as communication draft
6. Returns Hermes result to admin
```

## Allowed Hermes response format

```json
{
  "schemaVersion": 1,
  "requiresHumanApproval": true,
  "summary": "string",
  "furnitureType": "kitchen|wardrobe|bedroom|hallway|children|office|other",
  "leadTemperature": "hot|warm|neutral|cold",
  "missingInfo": ["string"],
  "nextQuestion": "string",
  "replyDraft": "string",
  "warnings": ["string"]
}
```

- `schemaVersion` must be `1`.
- `requiresHumanApproval` must be `true`.
- Invalid or missing fields produce a safe fallback.

## Safety boundaries

### Hermes is always disabled by default

- New deployments start with `HERMES_AGENT_ENABLED=false`.
- Enable only after explicit approval and verified manual smoke test.

### Hermes cannot affect order data

- Hermes runs only after order is saved in D1.
- Hermes cannot change order status, notes, follow-up, or any order field.
- Hermes cannot send messages to clients.
- Hermes cannot access platform secrets, D1 directly, or Cloudflare APIs.

### Hermes failure is safe

- If Hermes times out, returns error, or returns invalid JSON:
  - order creation succeeds;
  - no order fields are changed;
  - error is logged (without secrets or full payload);
  - response returns the normal 201 success.

## VPS-side setup (future)

Hermes runs on a Google Cloud Debian VPS:

1. Create a Debian 12 VM on Google Cloud.
2. Create `hermes` user.
3. Install Node.js LTS.
4. Clone or copy the Hermes Agent code.
5. Configure environment:
   - `HERMES_WEBHOOK_PORT=8443`
   - `HERMES_LOG_LEVEL=info`
6. Set up systemd service.
7. Configure nginx as HTTPS reverse proxy with Let's Encrypt.
8. Verify endpoint: `POST https://<hermes-domain>/webhook/order`
9. Configure `HERMES_AGENT_WEBHOOK_URL` and `HERMES_AGENT_TOKEN` in Cloudflare Pages.

## Verification

### Local smoke (after Slice 3)

```powershell
# Ensure Hermes is enabled in .dev.vars
# HERMES_AGENT_ENABLED=true
# HERMES_AGENT_WEBHOOK_URL=http://localhost:8443/webhook/order
# HERMES_AGENT_TOKEN=test-token

# Start local Hermes mock or skip (endpoint returns disabled by default)
npm.cmd run dev

# Test manual endpoint returns 503 when disabled
curl -X POST http://localhost:8795/api/orders/1/agent/hermes
# -> 503 with "hermes_agent_disabled"

# Test with disabled env after local smoke
```

### Production smoke (future)

```powershell
# Set HERMES_AGENT_ENABLED=true and HERMES_AGENT_WEBHOOK_URL in production secrets
# Deploy to Cloudflare Pages
# Run smoke with a synthetic order
npm.cmd run smoke:hermes

# Disable Hermes after smoke
# Remove or set HERMES_AGENT_ENABLED=false
# Redeploy
```

## Troubleshooting

### Hermes endpoint returns 503 "hermes_agent_disabled"

Check that `HERMES_AGENT_ENABLED=true` is set in environment.

### Hermes endpoint returns 503 "hermes_agent_not_configured"

Check that `HERMES_AGENT_WEBHOOK_URL` and `HERMES_AGENT_TOKEN` are configured.

### Hermes returns invalid JSON

The platform falls back to a safe default result. Check Hermes logs for
response format issues.

### Hermes times out

- Default timeout is 4000 ms.
- Increase `HERMES_AGENT_TIMEOUT_MS` if Hermes needs more time.
- Order creation is not affected by the timeout.
