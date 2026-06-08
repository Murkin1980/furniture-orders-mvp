# SESSION_NOTES.md

This file is the working memory for Codex and other coding agents.

Update it after meaningful changes.

## 2026-06-07 — Project consolidation

### Main product

`Murkin1980/furniture-orders-mvp` is the central product.

It is the platform for furniture makers: orders, admin panel, calculators, landing sites, portfolio, publishing, and later AI assistance.

### Live sites

Live sites are tracked in `LIVE_SITES.md`.

Important:

- `Murkin1980/bek-mebel` is the production source for the live Bek Mebel site.
- Branch: `main`.
- Hosting deploy folder: `/httpdocs`.
- Treat this repository as production, not as an experiment.

`Murkin1980/tuba-kz` is a live Cloudflare case study and remains separate from the main platform.

### Calculator decision

Primary calculator work stays in `furniture-orders-mvp`.

`Murkin1980/furniture-configurator` is a donor module for visual configurator ideas.

Legacy calculator references:

- `Murkin1980/mebel-kalkulator`
- `Murkin1980/mebel-kalkulator2`
- `Murkin1980/grand-mebel`

### AI layer decision

`Murkin1980/furniture-ai-agent` is a donor for the AI layer, not a second CRM.

Port only useful pieces:

- qualification prompt;
- AI provider abstraction;
- strict JSON parsing and fallback;
- reanalyze flow idea;
- AI-enriched Telegram message structure.

Keep the main order and admin flow inside `furniture-orders-mvp`.

### Ops and accounting

`Murkin1980/grand-mebel-accounting-cloudflare` is a separate internal accounting and document module.

`Murkin1980/grand-mebel-invoices` is a legacy reference for invoice templates and old UX.

### Codex working rules

Before code changes, read:

- `PRODUCT.md`
- `SESSION_NOTES.md`
- `LIVE_SITES.md`
- `CALCULATOR_DECISION.md`
- `AI_LAYER_DECISION.md`
- `OPS_AND_LEGACY_DECISION.md`

Rules:

- Work in `furniture-orders-mvp` unless the task explicitly says otherwise.
- Keep changes small and testable.
- Do not copy whole donor repositories.
- Use donor repos only as references.
- Update this file after meaningful work.

## Next recommended task

Start AI integration with a pure, testable module:

```text
src/ai/parse-ai-response.js
tests/ai-parse-response.test.js
```

Do not call external AI APIs in this first step.

## 2026-06-07 - Safe AI JSON parser

### What changed
- Added the first safe AI slice as a pure JSON parser with no external API, UI, endpoint, or D1 changes.
- Added markdown code-fence removal, required-field validation, enum normalization, lead score clamping, missing-info normalization, and safe fallback behavior.
- Added focused parser tests for valid, fenced, invalid, incomplete, and normalized responses.

### Files changed
- `src/ai/parse-ai-response.js`
- `tests/ai-parse-response.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/ai-parse-response.test.js`
- `npm.cmd run check`
- `npm.cmd test`

### Next
- Add the qualification prompt as another pure, testable AI module before introducing provider APIs or endpoints.

## 2026-06-07 - Safe AI qualification prompt builder

### What changed
- Added a pure qualification prompt builder with no external API, UI, endpoint, D1, or deploy integration.
- Added safe order-field formatting with camelCase and snake_case aliases, `calculatorMeta` support, furniture-business context, strict JSON output instructions, and required result enums.
- Added focused tests for complete and empty orders, required JSON fields, furniture context, field aliases, and calculator metadata.

### Files changed
- `src/ai/qualification-prompt.js`
- `tests/qualification-prompt.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/qualification-prompt.test.js` - 6 tests passed.
- `npm.cmd run check` - passed.
- `npm.cmd test` - 85 tests passed.

### Next
- Design the provider abstraction as a separate tested slice before adding external AI calls or order endpoints.

## 2026-06-07 - Safe AI provider abstraction

### What changed
- Added provider configuration for OpenAI, Groq, Gemini, OpenRouter, and NVIDIA NIM.
- Added safe provider selection, environment API-key lookup, unknown-provider fallback, and pure OpenAI-compatible request-object construction.
- The provider module performs no fetch, external API call, endpoint integration, UI work, or deployment change.
- Empty prompts now throw a clear `TypeError` before a request object can be built.

### Files changed
- `src/ai/providers.js`
- `tests/ai-providers.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/ai-providers.test.js` - 11 tests passed.
- `npm.cmd test` - 96 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Build a pure `analyze-lead` orchestration module with an injected transport before adding a real endpoint or external API call.

## 2026-06-07 - Safe AI analyzeLead orchestration

### What changed
- Added `analyzeLead` orchestration connecting the qualification prompt, provider request builder, injected transport, and strict response parser.
- Added safe fallback results with provider/model/timing/request metadata when the transport is missing or throws.
- Added support for raw string, `{ content }`, and OpenAI-like choices fake-client responses.
- The module performs no fetch, external API call, endpoint integration, UI work, D1 migration, or deployment change.

### Files changed
- `src/ai/analyze-lead.js`
- `tests/ai-analyze-lead.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/ai-analyze-lead.test.js` - 11 tests passed.
- `npm.cmd test` - 107 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Define the D1 AI result schema and manual analyze endpoint contract before enabling any real provider transport.

## 2026-06-07 - Safe order AI result storage preparation

### What changed
- Added D1 migration `0011_order_ai_results.sql` with nullable AI analysis fields on `orders`.
- Synchronized the fresh local `RUNTIME_SCHEMA_INIT` orders schema with the new AI fields.
- Added a pure order-update mapper that serializes missing information, maps normalized AI results and metadata to D1 column names, and derives safe `success`/`failed` statuses.
- No endpoint, external API call, UI, production migration application, or deployment was performed.

### Files changed
- `migrations/0011_order_ai_results.sql`
- `src/ai/order-ai-result.js`
- `tests/order-ai-result.test.js`
- `src/orders-core.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/order-ai-result.test.js` - 9 tests passed.
- `npm.cmd test` - 116 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Add a tested order AI persistence core function, then build the manual analyze endpoint with an explicitly injected network transport.

## 2026-06-07 - Safe manual order AI analyze endpoint

### What changed
- Added `analyzeOrderWithAiCore` to load an order, run the existing injected-transport AI orchestration, map the result to D1 columns, and persist the AI fields.
- Added admin-protected `POST /api/orders/:id/ai/analyze` using the existing Bearer/X-Admin-Token convention.
- The endpoint accepts only an injected sender from `context.data` for tests; it contains no fetch, SDK, or real provider transport.
- Added tests for missing orders, success persistence, invalid JSON defaults, transport failures, admin auth, no-fetch behavior, and preservation of normal order fields.
- No UI, production migration application, external AI call, or deployment was performed.

### Files changed
- `src/ai/order-ai-core.js`
- `functions/api/orders/[id]/ai/analyze.js`
- `tests/order-ai-core.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/order-ai-core.test.js` - 6 tests passed.
- `npm.cmd test` - 122 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Decide and implement the real provider transport boundary before enabling the endpoint outside injected tests; apply migration `0011` only in an explicit operations step.

## 2026-06-07 - Safe admin AI analysis controls

### What changed
- Added an `AI` column to the admin orders table with a compact persisted-analysis summary and visible error state.
- Added per-order `AI-анализ` / `Повторить AI-анализ` controls with loading state, existing `adminFetchJson` usage, error handling, and order-list refresh after completion.
- Extended the admin orders list query with persisted AI fields without changing public order intake.
- Added pure admin AI view-model helpers and focused tests for analyzed, empty, and malformed stored data.
- No real provider transport, direct UI fetch, dependency, migration change, deployment, calculator, or public-form change was made.

### Files changed
- `src/orders-core.js`
- `public/admin.html`
- `public/admin.js`
- `public/admin-orders.js`
- `tests/admin-orders-ai.test.js`
- `tests/orders-core.test.js`
- `SESSION_NOTES.md`

### Checks
- `node --test tests/admin-orders-ai.test.js tests/orders-core.test.js tests/order-ai-core.test.js` - 38 tests passed.
- `npm.cmd test` - 125 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Implement and explicitly approve a real provider transport, then apply migration `0011` before enabling production AI analysis.

## 2026-06-07 - OpenAI-compatible AI sender

### What changed
- Added a real OpenAI-compatible sender with injected/global fetch selection, strict response validation, and clear HTTP, network, and JSON errors.
- Integrated the sender into the manual admin AI analyze endpoint while preserving fake sender injection for tests.
- Missing provider API keys fail before network access and are persisted as `ai_status=failed`.
- AI remains manual-only; no UI, migration, public-form, calculator, dependency, deployment, or donor-repository changes were made.

### Files changed
- `src/ai/send-ai-request.js`
- `tests/send-ai-request.test.js`
- `functions/api/orders/[id]/ai/analyze.js`
- `tests/order-ai-core.test.js`
- `package.json`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-ai-slice8-implementation-summary.md`

### Checks
- `node --test tests/send-ai-request.test.js tests/order-ai-core.test.js tests/ai-analyze-lead.test.js` - 29 tests passed.
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Configure one provider API key and apply migration `0011` only in an explicit operations/deployment step before production AI analysis.

## 2026-06-07 - AI setup documentation

### What changed
- Added a secret-free `.env.example` with provider selection, optional model override, and all supported provider API key variable names.
- Added `AI_SETUP.md` covering manual-only AI behavior, supported providers, local Wrangler setup, migration `0011`, verification, and safe failure behavior.
- No UI, endpoint logic, deployment configuration, migration, dependency, production migration application, or donor-repository change was made.

### Files changed
- `.env.example`
- `AI_SETUP.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-ai-slice9-implementation-summary.md`

### Checks
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Configure one provider key in local `.dev.vars`, apply migration `0011` to the chosen non-production D1 database, and verify one manual analysis when explicitly approved.

## 2026-06-07 - Local manual AI smoke test

Manual endpoint tested locally:

- Endpoint: `POST /api/orders/1/ai/analyze`
- Result: `200 OK`
- `ai_status`: `failed`
- provider: `openai`
- model: `gpt-4o-mini`
- `ai_error`: `AI provider authorization failed. Check the API key.`

Conclusion:

- Manual AI endpoint works.
- Failed provider authorization is handled safely.
- Order data remains intact.
- Production was not touched.
- AI autorun is still disabled.
- Local D1 note: `npm run dev --d1 DB` may create or use a separate local D1; the test used configured `furniture_orders` with migration `0011` applied locally.

## 2026-06-08 - README synchronized with AI layer

### What changed
- Updated `README.md` with the implemented manual-only AI flow, endpoint, source modules, tests, supported providers, environment variables, and migration `0011`.
- Documented verified safe failure behavior and the current pending successful smoke test blocked by OpenAI HTTP 429 quota/rate limit.
- Clarified that production AI, production migration `0011`, and AI autorun remain disabled.
- Corrected `AI_SETUP.md` so manual AI smoke tests use configured local D1 `furniture_orders` without the `--d1 DB` override.

### Files changed
- `README.md`
- `AI_SETUP.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-readme-ai-update-summary.md`

### Checks
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Restore OpenAI project quota or billing, then repeat one local manual AI analysis and confirm the first stable `ai_status=success` result before any production enablement.

## 2026-06-08 - AI infrastructure stage 1

### What changed
- Added missing project-control documents, a compact reviewed knowledge base, and repeatable project skills.
- Verified official MarkItDown, CodeGraph, Supermemory, and Headroom repositories and recorded staged adoption decisions.
- Installed MarkItDown 0.1.6 in ignored `.tools/markitdown-venv/`.
- Built an ignored local CodeGraph index with 73 JavaScript files, 767 nodes, and 1,893 edges.
- Kept Supermemory and Headroom out of runtime until memory/privacy contracts and token measurements justify them.
- MarkItDown offline conversion of the architecture PDF returned empty output; no empty artifact was retained.

### Files changed
- `.gitignore`
- `AGENTS.md`
- `DESIGN.md`
- `DATA_SOURCES.md`
- `AI_INFRA_DECISION.md`
- `README.md`
- `SESSION_NOTES.md`
- `docs/raw/README.md`
- `docs/markdown/README.md`
- `knowledge/*.md`
- `skills/*.md`
- `docs/sessions/furniture-ai-infra-stage1-coding-brief.md`
- `docs/sessions/furniture-ai-infra-stage1-implementation-summary.md`

### Checks
- CodeGraph status/query - passed.
- MarkItDown CLI/help - passed.
- MarkItDown architecture PDF conversion - no extractable text; recorded for OCR/manual review.
- MarkItDown HTML smoke test - produced non-empty output, but Cyrillic was misdecoded on this Windows environment; manual encoding review remains mandatory.
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Add only approved source documents to `docs/raw/`, convert them individually, review exact values, and record them in `DATA_SOURCES.md`.

## 2026-06-08 - Stage 2 controlled knowledge conversion started

### What changed
- Added a documentation-only Stage 2 plan for controlled source intake, conversion, manual review, approval, promotion, and deprecation.
- Defined a mandatory per-document checklist covering source metadata, encoding, Cyrillic, tables, numbers, legal/payment terms, approval, and reviewer notes.
- Added initial knowledge categories and mapped them to target `knowledge/` files.
- Added the source statuses `raw`, `converted`, `reviewed`, `approved`, and `deprecated` to `DATA_SOURCES.md`.
- No source document was converted or promoted, and no production behavior was changed.

### Files changed
- `STAGE_2_KNOWLEDGE_CONVERSION_PLAN.md`
- `DATA_SOURCES.md`
- `SESSION_NOTES.md`

### Checks
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.
- Production-path diff check - passed; no modified or untracked production files.

### Next
- Select the first authorized, privacy-reviewed business source and record it as `raw` before conversion.
