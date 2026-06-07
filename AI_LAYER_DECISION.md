# AI layer decision

## Decision

`Murkin1980/furniture-ai-agent` is not a second product and not a competing CRM.

It is a donor repository for the future AI module inside the main platform:

```text
Murkin1980/furniture-orders-mvp
```

## Why

The main platform already owns:

- order intake
- admin order list
- order statuses
- project steps
- calculator leads
- landing sites
- portfolio
- Telegram notifications

Therefore, do not copy the whole Express/SQLite CRM from `furniture-ai-agent` into the platform.

## What to port from `furniture-ai-agent`

### 1. Lead qualification prompt

Source idea:

```text
prompts/qualificationPrompt.js
```

Port as:

```text
src/ai/qualification-prompt.js
```

Use it to classify furniture leads into:

- furniture type
- qualified / not qualified
- lead score
- lead temperature
- missing info
- next question
- urgency
- potential value
- owner summary

### 2. AI provider abstraction

Source idea:

```text
services/aiService.js
```

Port as:

```text
src/ai/providers.js
src/ai/analyze-lead.js
```

Support replaceable providers:

- OpenAI
- Groq
- Gemini
- OpenRouter
- later NVIDIA NIM through OpenAI-compatible base URL

### 3. Strict JSON parsing and fallback

Port these concepts:

- remove markdown code fences
- parse JSON safely
- validate required fields
- normalize enums and scores
- return default safe result if parsing fails

### 4. Async analysis job

Source idea:

```text
services/aiQueue.js
```

Port carefully. The main platform is Cloudflare-native, so do not copy the in-memory Node queue as-is.

Preferred Cloudflare-friendly implementation:

- first version: manual `POST /api/orders/:id/ai/analyze`
- later: queue-like flow with D1 status fields
- later: Cloudflare Queues if needed

Fields to add later:

```text
ai_status
ai_score
ai_temperature
ai_summary
ai_next_question
ai_missing_info_json
ai_provider
ai_model
ai_processing_time_ms
ai_raw_response_limited
```

### 5. Reanalyze flow

Source idea:

```text
POST /api/leads/:id/reanalyze
```

Port as:

```text
POST /api/orders/:id/ai/reanalyze
```

### 6. Rich Telegram AI summary

Source idea:

```text
services/telegramService.js
```

Port only the AI-enriched message structure:

- score
- temperature
- urgency
- potential value
- missing info
- next question
- owner summary

Do not copy Telegram bot state management if it conflicts with existing platform notification flow.

## What NOT to port

Do not port these as separate product systems:

- separate Express server
- separate SQLite CRM
- separate auth system
- separate lead dashboard
- separate tenant system until main platform needs paid multi-tenant accounts
- separate analytics dashboard if it duplicates the main admin

## Target API inside main product

```text
POST /api/orders/:id/ai/analyze
POST /api/orders/:id/ai/reanalyze
GET  /api/orders/:id/ai
```

Optional later:

```text
POST /api/ai/suggest-reply
POST /api/ai/generate-offer
POST /api/ai/extract-dimensions
```

## Integration order

1. Add AI result schema/migration.
2. Add pure AI analysis module with tests.
3. Add manual analyze endpoint.
4. Add admin button: Analyze with AI / Reanalyze.
5. Add AI summary to order card.
6. Add AI-enriched Telegram notification.
7. Add provider settings.
8. Add automation/queue only after manual flow is stable.

## Rule

AI is a layer on top of the furniture platform, not a separate platform.
