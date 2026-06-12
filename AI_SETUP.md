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

The current `npm run dev` script passes `--d1 DB`, which may create or use a separate local D1 without migration `0011`. For a manual AI smoke test, start Pages with the configured `furniture_orders` binding instead:

```powershell
npx.cmd wrangler pages dev public --binding RUNTIME_SCHEMA_INIT=true --binding ADMIN_TOKEN=dev-admin-token --compatibility-date=2026-05-29 --persist-to=.wrangler/state
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

To verify a real provider locally, configure `.dev.vars`, ensure migration `0011` is applied to configured local D1 `furniture_orders`, start Pages without the `--d1 DB` override, and trigger analysis manually from the admin order list.

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
