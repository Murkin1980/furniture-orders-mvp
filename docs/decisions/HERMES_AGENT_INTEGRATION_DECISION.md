# Hermes Agent integration decision

## Decision

Hermes Agent is an external agent assistant deployed on a Google Cloud VPS,
separate from `furniture-orders-mvp`.

- `furniture-orders-mvp` remains the source of truth for order intake, admin,
  CRM, calculators, landing sites, portfolio, and AI analysis.
- Hermes does not get direct access to D1, production secrets, or Cloudflare API
  tokens.
- Hermes does not become a separate CRM, order platform, or replacement for the
  existing AI layer.
- The platform must remain fully operational when Hermes is unavailable.

## Architecture

```
Public form / calculator embed
  -> furniture-orders-mvp (Cloudflare Pages + D1)
  -> createOrder() saves client + order in D1
  -> Telegram notification (existing)
  -> best-effort Hermes event/webhook (new)
  -> Hermes Agent on Google Cloud VPS
  -> Hermes returns structured JSON with classification, missing info, draft reply
  -> Platform saves draft for manager review
  -> Manager edits, approves, and sends manually
```

Hermes connects only after the order is saved in D1. It cannot block order
creation.

## What Hermes can do

- receive a minimal order context payload;
- classify the lead (furniture type, temperature);
- identify missing information;
- suggest the next question to the client;
- generate a manager summary;
- produce a reply draft;
- return structured JSON.

## What Hermes cannot do

- send messages to the client via WhatsApp, Telegram, email, or SMS;
- change order status, notes, or follow-up;
- run arbitrary price calculations;
- modify calculators or pricing;
- deploy the site;
- apply migrations;
- access real client photos without a separate privacy/consent decision;
- read the full D1 database directly;
- access Cloudflare, D1, R2, OpenAI, or WhatsApp API keys;
- have direct access to production secrets.

Any action beyond creating a manager-review draft requires explicit manager
approval.

## Data minimization

The first payload sent to Hermes excludes:

```
phone
email
address
raw_payload
client photos
full conversation history
secrets
API keys
admin tokens
```

Allowed minimal payload:

```json
{
  "eventType": "order.created",
  "schemaVersion": 1,
  "order": {
    "id": 123,
    "source": "site",
    "city": "Алматы",
    "furnitureType": "kitchen",
    "budget": 615000,
    "description": "Кухня 3 метра, нужен предварительный расчет",
    "calculatorMeta": {
      "calculatorId": 1,
      "categoryCode": "kitchen",
      "estimate": 615000,
      "formulaVersion": 1,
      "schemaVersion": 1
    },
    "createdAt": "2026-06-24T10:00:00.000Z"
  }
}
```

Phone, email, and address stay in the platform and Telegram notification, not
in Hermes.

## Integration slices

### Slice 0 — documentation

- Add this decision file and a runbook.
- No runtime behavior changes.

### Slice 1 — pure response parser and request builder

- `src/agents/hermes-result.js` — normalize and validate Hermes JSON response.
- `src/agents/hermes-request-builder.js` — build minimal payload without fetch.
- `tests/hermes-result.test.js`, `tests/hermes-request-builder.test.js`.
- No network, endpoint, or UI changes.

### Slice 2 — Hermes client with injected fetch

- `src/agents/hermes-client.js` — send request to Hermes via injected fetchFn.
- `tests/hermes-client.test.js`.
- No automatic fallback to global fetch.
- Timeout, abort, controlled errors.

### Slice 3 — order core and manual endpoint

- `src/agents/hermes-order-core.js` — load order, build payload, call client,
  save result as communication draft.
- `functions/api/orders/[id]/agent/hermes.js` — admin-protected manual endpoint.
- `tests/hermes-order-core.test.js`, `tests/hermes-endpoint.test.js`.
- Hermes disabled by default (`HERMES_AGENT_ENABLED=false`).
- Does not change order status, notes, follow-up, or send messages.

### Slice 4 — best-effort after order creation

- Add `notifyHermesAgent()` call in `createOrder()` after Telegram notification.
- `createOrder()` returns 201 even if Hermes is unavailable.
- Controlled by `HERMES_AGENT_ENABLED=true`.
- Safe logging without secrets.

### Slice 5 — CRM/Admin UI

- Add Hermes status, summary, missing info, draft reply to the order card.
- Manager can edit and approve drafts.
- No AI gradients, decorative dashboards, or unnecessary visual changes.

## Hermes deployment

Hermes runs on a Google Cloud Debian VPS:

```
Google Cloud Debian VPS
  ├─ hermes user
  ├─ Hermes Agent process
  ├─ optional Hermes gateway
  ├─ lightweight HTTPS webhook adapter
  └─ systemd service
```

Platform communicates via HTTPS:

```
POST https://<hermes-domain>/webhook/order
Authorization: Bearer <HERMES_AGENT_TOKEN>
```

- Hermes endpoint is not public without authorization.
- Hermes has no SSH or root access to the platform.
- Cloudflare API tokens are not stored inside Hermes.

## Environment variables

All disabled by default:

```dotenv
HERMES_AGENT_ENABLED=false
HERMES_AGENT_WEBHOOK_URL=
HERMES_AGENT_TOKEN=
HERMES_AGENT_TIMEOUT_MS=4000
```

- If `HERMES_AGENT_ENABLED !== "true"`, Hermes is not called.
- If no `HERMES_AGENT_WEBHOOK_URL`, Hermes is not called.
- If no `HERMES_AGENT_TOKEN`, endpoint fails closed.
- Timeout is short (4s).
- Hermes errors never break order creation.

## Response format

```json
{
  "schemaVersion": 1,
  "requiresHumanApproval": true,
  "summary": "Клиент хочет кухню, есть примерный бюджет, не хватает размеров и фото помещения.",
  "furnitureType": "kitchen",
  "leadTemperature": "warm",
  "missingInfo": [
    "ширина стены",
    "высота потолка",
    "фото помещения",
    "предпочтительный материал фасадов"
  ],
  "nextQuestion": "Пришлите, пожалуйста, ширину стены, высоту потолка и фото помещения.",
  "replyDraft": "Здравствуйте! Спасибо за заявку. Чтобы подготовить предварительный расчёт кухни, пришлите, пожалуйста, ширину стены, высоту потолка и фото помещения.",
  "warnings": []
}
```

The platform validates this JSON. Invalid JSON produces a safe fallback without
crashing.

## Safety rules

- Hermes is disabled by default.
- Endpoint is admin-protected.
- Hermes does not block order creation.
- Personal data is minimized in transit.
- No customer messages are sent automatically.
- Order status, notes, and follow-up are never changed by Hermes.
- Every Hermes result is validated.
- Drafts are saved in `communication_drafts` for manager review.
- Managers edit, approve, and send drafts manually.

## Local verification

Documentation-only slice checks:

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```
