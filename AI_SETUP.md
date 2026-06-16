# AI Setup

## Current behavior

AI qualification is an optional layer on top of an existing order.

- AI analysis starts only when an admin manually clicks the AI analysis action for an order.
- Creating a new order does not start AI analysis automatically.
- The manual backend route is `POST /api/orders/:id/ai/analyze`.
- A failed AI request does not remove or corrupt the order.

## Required database migration

The AI result fields are added by:

```text
migrations/0011_order_ai_results.sql
```

Apply migration `0011` to the target D1 database before using AI analysis against that database.

For an existing local Wrangler D1 database:

```powershell
npx.cmd wrangler d1 migrations apply furniture_orders --local
```

Production migration `0011` is applied to the current production D1 database.
For any new environment, migration application remains a separate explicit
operations step; do not apply it implicitly while developing or testing.

## Environment variables

Choose a provider with `AI_PROVIDER` and configure the matching API key:

| Provider | `AI_PROVIDER` value | API key variable | Default model |
|---|---|---|---|
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Groq | `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |
| Gemini OpenAI-compatible API | `gemini` | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | `openai/gpt-4o-mini` |
| NVIDIA NIM | `nvidia` | `NVIDIA_API_KEY` | `meta/llama-3.1-70b-instruct` |

`AI_MODEL` is optional. Set it only when a different model supported by the selected provider is required. Unknown or missing `AI_PROVIDER` values fall back to `openai`.

Never commit real API keys. `.env.example` contains names and safe empty placeholders only.

## Local setup

Wrangler Pages reads local secrets from `.dev.vars`, which is ignored by Git. Copy the example, then fill only the selected provider key:

```powershell
Copy-Item .env.example .dev.vars
```

Example local configuration:

```dotenv
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=replace-with-local-secret
```

For an ordinary non-AI local run, use:

```powershell
npm.cmd run dev
```

`npm run dev` uses the configured local D1 `furniture_orders` binding from
`wrangler.toml`. Keep the explicit `--d1 DB` override out of Pages dev
commands: Wrangler treats it as a separate `local-DB`, so migrations applied
to configured D1 are not visible to the runtime.

```powershell
npm.cmd run dev
```

Open `/admin`, enter `dev-admin-token`, load an existing order, and manually start AI analysis.

## Expected failure behavior

If the selected provider API key is missing:

- no provider network request is made;
- the manual analyze request completes without breaking the order;
- the AI result is saved with `ai_status=failed`;
- `ai_error` contains a clear missing API key message.

Authorization failures, rate limits, provider server errors, invalid JSON responses, malformed responses, and network errors are also converted into a failed AI result instead of throwing through the order workflow.

## Verification

The automated suite uses fake/injected senders and does not require a real provider key:

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

To verify a real provider locally, configure `.dev.vars`, ensure migration
`0011` is applied to configured local D1 `furniture_orders`, run
`npm.cmd run dev`, and trigger analysis manually from the admin order list.

Optional explicit smoke runner:

```powershell
$env:AI_SMOKE_BASE_URL="https://furniture-orders-mvp.pages.dev"
$env:AI_SMOKE_ADMIN_TOKEN="<admin token>"
$env:AI_SMOKE_ORDER_ID="<synthetic order id>"
node scripts/ai-manual-smoke.mjs
```

The runner calls only the existing manual endpoint. It writes AI fields to the
selected order, so use only a synthetic smoke order.

## Production status

Manual production AI analysis was verified on 2026-06-12 using a clearly
synthetic order:

- provider: `openai`;
- model: `gpt-4o-mini`;
- result: `ai_status=success`;
- normalized score and temperature were saved;
- `ai_error` remained empty;
- automatic analysis on order intake remains disabled.

Use synthetic smoke orders for provider verification. Sending a real customer
order to an external AI provider requires an explicit operational decision and
appropriate consent/data-handling rules.
