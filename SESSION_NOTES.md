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
- Documented verified safe failure behavior and the successful local OpenAI smoke test.
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
- Decide explicitly whether to apply migration `0011` and configure AI secrets in production; keep AI autorun disabled until a separate approved stage.

## 2026-06-09 - Successful local OpenAI smoke test

### What changed
- Added API credits and ran one local manual AI analysis against configured D1 `furniture_orders`.
- Confirmed `POST /api/orders/1/ai/analyze` returns `200 OK` with `ai_status=success`.
- Confirmed score `75`, temperature `warm`, populated summary and next question, valid missing-info JSON, and empty `ai_error`.
- Updated README AI status from pending HTTP 429 to a confirmed successful provider path.
- Production, production migration `0011`, AI autorun, endpoint logic, and application code were not changed.

### Files changed
- `README.md`
- `SESSION_NOTES.md`
- `docs/sessions/ai-success-smoke-wip-handoff.md`

### Checks
- One manual OpenAI request completed successfully; no retry was needed.
- Local Wrangler server was stopped after the test.
- `git diff --check` - passed.

### Next
- Decide explicitly whether to apply migration `0011` and configure AI secrets in production; keep AI autorun disabled until a separate approved stage.

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

## 2026-06-09 - Twenty CRM integration decision

### What changed
- Added the future Twenty CRM integration decision.
- Confirmed that Twenty CRM will remain a separate, optional service while `furniture-orders-mvp` remains the source of truth for lead intake and furniture-specific workflows.
- Defined one-way manual sync as the first integration mode and a pure Twenty mapper as the first technical step.
- No code, UI, endpoint, migration, deploy, production setting, dependency, or donor repository was changed.

### Files changed
- `CRM_INTEGRATION_DECISION.md`
- `SESSION_NOTES.md`

### Checks
- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- Implement CRM Slice 2 as a pure `src/crm/twenty-mapper.js` module with focused tests only after explicit approval.

## 2026-06-09 - Twenty CRM pure mapper

### What changed
- Added a pure Twenty CRM mapper for person, opportunity, manager note, and combined sync payloads.
- Added snake_case/camelCase aliases, safe `raw_payload` parsing, calculator metadata extraction, readable AI note formatting, and payload cleanup without input mutation.
- Added focused mapper tests and included the new module in the existing syntax-check command.
- No fetch, API client, endpoint, UI, migration, deploy, production setting, dependency, credential, or donor repository was changed.

### Files changed
- `src/crm/twenty-mapper.js`
- `tests/twenty-mapper.test.js`
- `package.json`
- `README.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-crm-slice2-implementation-summary.md`

### Checks
- `node --test tests/twenty-mapper.test.js` - 13 tests passed.
- `npm.cmd test` - 150 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.

### Next
- CRM Slice 3: create a pure Twenty request builder without `fetch` or external API calls.

## 2026-06-09 - Visual project progress dashboard

### What changed
- Added `PROJECT_PROGRESS.md` as the canonical visual tracker for commercial readiness, AI-assisted readiness, and the complete vision through SketchUp and 3D rendering.
- Added workstream progress bars, dependency map, delivery sequence, detailed CRM progress, and checkpoint history.
- Added a rule to update the dashboard after every completed slice and perform a broader review every 5 completed slices.
- No application code, UI, endpoint, migration, dependency, deploy, or production setting was changed.

### Files changed
- `PROJECT_PROGRESS.md`
- `AGENTS.md`
- `README.md`
- `SESSION_NOTES.md`

### Checks
- `git diff --check` - passed.

### Next
- Keep the dashboard current while completing CRM Slice 3 and record the next broader checkpoint after 5 completed slices.

## 2026-06-09 - Landings and calculators focus handoff

### What changed
- Recorded the current progress and changed the immediate product focus to completing landings and calculators for paid landing-page orders.
- Defined the commercial end-to-end completion flow from customer brief through calculator embed, live publication, and verified lead intake.
- Paused CRM Slice 3, new AI work, OCR, SketchUp MCP, and 3D rendering until this focused workstream is complete.
- No application code, UI, endpoint, migration, deploy, production setting, or dependency was changed.

### Files changed
- `docs/sessions/furniture-landings-calculators-wip-handoff.md`
- `PROJECT_PROGRESS.md`
- `SESSION_NOTES.md`

### Checks
- `git diff --check` - passed.

### Next
- Start LC Slice 1: audit only landing/calculator code, UI, tests, and operational gaps, then define the smallest completion backlog.

## 2026-06-09 - External editor landing brief task prepared

### What changed
- Added a self-contained external-editor task for the first safe landing completion slice.
- Scoped parallel work to a pure structured landing brief module and tests, without UI, persistence, endpoints, migrations, deploy, CRM, or AI changes.
- Included exact contracts, tests, restrictions, checks, and review handoff requirements.

### Files changed
- `docs/sessions/external-editor-landings-calculators-task.md`
- `SESSION_NOTES.md`

### Checks
- `git diff --check` - passed.

### Next
- Give the instruction file to the external editor, then review its resulting diff before integrating it.

## 2026-06-09 - External runtime archive review

### What changed
- Inventoried and ordered the cumulative external-editor archive chain through Phase 6.
- Reviewed the final cumulative Phase 6 source, tests, runtime security boundaries, persistence behavior, and embedded Git state.
- Confirmed the package is a separate Node/JSON runtime donor branch and must not overwrite the current Cloudflare/D1 application.
- Recorded critical security findings and a selective-port recommendation.
- No archive code was merged and no application, UI, endpoint, migration, deploy, dependency, or production setting was changed.

### Files changed
- `docs/sessions/external-runtime-archives-code-review.md`
- `SESSION_NOTES.md`

### Checks
- External Phase 6 `npm.cmd test` - 227 tests passed.
- External Phase 6 `npm.cmd run check` - passed.
- External Phase 6 `git diff --check` - passed.
- Main repository `git diff --check` - passed.

### Next
- Keep Phase 6 as a donor archive and selectively port only reviewed landing/calculator pure modules into the main repository.

## 2026-06-10 - Repository update and Cloudflare deployment

### What changed
- Committed and pushed the Twenty CRM pure mapper, project knowledge base, progress dashboard, architecture documents, and external runtime archive review.
- Added `*.zip` to `.gitignore` so donor archives cannot be committed accidentally.
- Deployed the current application to Cloudflare Pages.
- Kept external instructions and unfinished handoff files local and uncommitted.

### Checks
- `npm.cmd test` - 150 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.
- Cloudflare deployment URL returned HTTP 200.

### Deployment
- GitHub commit: `615af80`
- Cloudflare Pages: `https://d881f37e.furniture-orders-mvp.pages.dev`

### Next
- Continue the landing and calculator completion plan using reviewed donor modules only.

## 2026-06-10 - LC Slices 1-5 landing and calculator completion

### What changed
- Completed the commercial workflow audit, structured landing content model, allowlisted template library, admin landing editor/exact preview, and calculator field schema editor.
- Landing artifacts now render structured business content and can include a selected published calculator.
- Calculator embed now honors published active/required fields and includes mobile controls.
- Repaired mojibake in the main admin HTML/JS interface.
- Added migration `0012_site_content.sql`; production migration and deploy were not performed.

### Files changed
- `src/site-brief.js`, `src/site-templates.js`, `src/sites-core.js`, `src/calculators-core.js`
- `functions/api/sites/[id].js`, `functions/api/calculators/[id]/embed.js`
- `public/admin.html`, `public/admin.js`
- `migrations/0012_site_content.sql`
- `tests/site-brief.test.js`, `tests/sites-core.test.js`, `tests/calculator-embed.test.js`
- `README.md`, `CALCULATOR_DECISION.md`, `PROJECT_PROGRESS.md`
- `docs/sessions/furniture-lc-slice1-audit.md`
- `docs/sessions/furniture-lc-slices1-5-implementation-summary.md`

### Checks
- `npm.cmd test` - 156 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.
- Browser desktop/mobile commercial flow - passed.
- Local default D1 migration apply exposed an existing migration-history replay problem at `0002`; isolated clean local D1 QA passed.

### Next
- LC Slice 6: prepare and apply the production-safe `0012` migration, then verify VPS/domain/SSL/live publishing.

## 2026-06-10 - LC Slice 6 production Pages and D1 release

### What changed
- Exported a pre-migration production D1 backup to the ignored local `output/` directory.
- Applied production migrations `0011_order_ai_results.sql` and `0012_site_content.sql`.
- Deployed commit `3ae8124` to Cloudflare Pages.
- Verified the stable Pages URL and new deployment URL return HTTP 200.
- Verified protected production APIs return HTTP 401 without an admin token instead of failing on schema access.
- Audited the VPS at `194.32.140.229`: SSH and HTTP are reachable, nginx serves the Furniture AI page, but SSH authentication credentials are unavailable.
- Confirmed VPS HTTPS port 443 and direct control-service port 8789 are not reachable.
- Confirmed Pages production currently has only `ADMIN_TOKEN`; VPS control secrets are not configured.

### Checks
- `npm.cmd test` - 156 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed before documentation updates.
- `wrangler d1 migrations list furniture_orders --remote` - no migrations pending after apply.
- Production schema checks confirmed `sites.content_json` and AI order columns.
- Cloudflare Pages deployment: `https://3acea761.furniture-orders-mvp.pages.dev`.

### Next
- Obtain the VPS SSH username and password/private key.
- Install or update `vps-control-service`, configure HTTPS reverse proxy and shared token.
- Set Pages secrets `VPS_CONTROL_BASE_URL` and `VPS_CONTROL_TOKEN`, then verify health/services/live deploy/reload/logs and customer domain SSL.

## 2026-06-10 - LC Slice 6 VPS control operational setup

### What changed
- Established SSH key access to VPS `194.32.140.229` as `ubuntu`.
- Installed and enabled `vps-control-service` without changing the existing Furniture AI site.
- Configured the HTTPS control endpoint `https://control.194-32-140-229.nip.io`.
- Added required VPS control values to Cloudflare Pages and redeployed production.
- Completed an authenticated health/services check and real HTML deploy smoke.
- Fixed an operational `EXDEV` deploy failure by moving staging to `/srv/sites/.staging`.

### Next
- Verify the full admin proxy flow and publish a real generated landing artifact.
- Configure and verify the first customer landing domain and SSL.
- Replace the temporary control hostname with an owned domain when available.

## 2026-06-10 - Standalone furniture-ai-agent retired

- Archived `Murkin1980/furniture-ai-agent` on GitHub.
- Removed its PM2 process, nginx site, files, secrets, and temporary backup from the VPS.
- Verified port `3000` is closed.
- Verified nginx and `furniture-vps-control` remain active.
- Verified production Pages remains available.
- Main platform AI modules remain inside `furniture-orders-mvp`.

### Next
- Continue LC Slice 6 admin proxy and first customer landing domain verification.

## 2026-06-10 - LC Slice 6 production publishing verification

### What changed
- Rotated production `ADMIN_TOKEN` with explicit user approval and stored it only in ignored `.dev.vars`.
- Verified production admin proxy health, services, deploy logs, and sites endpoints.
- Created production smoke site `lc6-production-landing`.
- Confirmed required brief validation blocks incomplete commercial landings.
- Published the generated artifact through Pages admin API and VPS control service.
- Configured nginx host `lc6-production.194-32-140-229.sslip.io`.
- Verified the public smoke landing returns HTTP 200 and deploy logs contain `deploy_completed`.

### Checks
- Production site status: `published`.
- Generated artifact: HTTP 200.
- Public VPS landing: HTTP 200.
- Admin proxy health and deploy logs: HTTP 200.
- Nginx configuration check: passed.

### Remaining
- Let’s Encrypt secondary validation times out even though DNS, HTTP, and primary validation reach nginx. SSL remains an external network/provider follow-up.
- Admin proxy nginx reload returns 500 because `NoNewPrivileges=true` blocks sudo. Security was not weakened; live HTML deploy does not require reload.

## 2026-06-11 - LC Slice 6 domain and HTTPS completion

### What changed
- Pointed the production smoke landing to `demo.salamat-mebel.kz` through Cloudflare Proxy.
- Added exact HTTP and HTTPS nginx virtual hosts for the demo hostname.
- Added a hostname-matching self-signed origin certificate as the approved fallback after the Cloudflare CSR dashboard repeatedly rejected a valid CSR.
- Verified origin SNI and public HTTPS through both Cloudflare edge IPs.
- Deleted the accidental duplicate Cloudflare Pages project `furniture-orders-mvp-2`; the intentional `furniture-orders-mvp` production project remains.
- Added `LANDING_VPS_OPS_RUNBOOK.md` with discovered infrastructure problems, verified resolutions, safety decisions, and the repeatable customer landing procedure.

### Verified
- `https://demo.salamat-mebel.kz` returns HTTP 200.
- VPS control and main platform remain available.
- `salamat-mebel.kz` and other live donor/client sites were not changed.

### Follow-up
- Prefer a Cloudflare Origin Certificate and `Full (strict)` for long-term origin hardening.
- Preserve `NoNewPrivileges=true`; normal HTML deploy does not require nginx reload.

## 2026-06-11 - LC Slice 7 production calculator verification

### What changed
- Created and published production calculator `1`.
- Enabled calculator `1` in the structured brief for production demo site `1`.
- Redeployed `lc6-production-landing` through the existing Pages/VPS control path.
- Confirmed the public demo artifact contains the calculator container and
  public embed script.
- Submitted one successful smoke lead, which created production order `5`.

### Files changed
- `README.md`
- `CALCULATOR_DECISION.md`
- `PROJECT_PROGRESS.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-lc-slice7-implementation-summary.md`

### Checks
- Public demo and embed script: HTTP 200.
- Embed includes schema-driven fields, lead endpoint, mobile media rule, and
  44px mobile controls.
- Invalid material rule was rejected safely.
- Successful lead estimate: `615000 KZT`.
- Production D1 order `5` contains `calculatorMeta` with `formulaVersion: 1`
  and `schemaVersion: 1`.
- `npm.cmd test`: 156 passed.
- `npm.cmd run check`: passed.
- In-app visual browser test was blocked by enterprise network policy; public
  HTML, embed JavaScript, API, VPS deploy, and D1 were verified directly.

### Next
- Use the verified landing/calculator procedure for the first paid landing.
- Select the next product layer; Twenty CRM manual sync remains the planned
  continuation.

## 2026-06-11 - CRM Slice 3 Twenty request builder

### What changed
- Added pure Twenty request builder for people, opportunities, and notes.
- Added versioned sync request sequence built from the existing pure mapper.
- Added safe base URL normalization, optional Bearer authorization header, and
  explicit rejection of unsupported resources.
- Added the new CRM module to `npm run check`.

### Files changed
- `src/crm/twenty-request-builder.js`
- `tests/twenty-request-builder.test.js`
- `package.json`
- `README.md`
- `CRM_INTEGRATION_DECISION.md`
- `PROJECT_PROGRESS.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-crm-slice3-implementation-summary.md`

### Checks
- `node --test tests/twenty-request-builder.test.js`: 9 passed.
- `npm.cmd test`: 165 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

### Next
- Verify the draft `/rest/people`, `/rest/opportunities`, and `/rest/notes`
  paths against the selected installed Twenty version.
- CRM Slice 4: add `sendTwentyRequest` with injected `fetchFn`; no endpoint,
  UI, migration, deploy, or production integration yet.

## 2026-06-12 - CRM Slice 4 guarded Twenty sender

### What changed
- Added `sendTwentyRequest(request, options)` with required injected `fetchFn`.
- Prevented automatic fallback to `globalThis.fetch`.
- Added request validation and safe handling for success JSON, missing key,
  authorization errors, rate limits, server errors, invalid JSON, and network
  failures.
- Confirmed HTTP `429` stops after exactly one request.
- Added the sender to `npm run check`.

### Files changed
- `src/crm/send-twenty-request.js`
- `tests/send-twenty-request.test.js`
- `package.json`
- `README.md`
- `CRM_INTEGRATION_DECISION.md`
- `PROJECT_PROGRESS.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-crm-slice4-implementation-summary.md`

### Checks
- `node --test tests/send-twenty-request.test.js`: 11 passed.
- `npm.cmd test`: 176 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

### Next
- CRM Slice 5: create a manual sync core that builds requests and executes them
  through an injected sender in tests.
- Do not add endpoint, UI, migration, deploy, production credentials, or real
  Twenty requests yet.

## 2026-06-12 - CRM Slices 5-7 manual sync platform path

### What changed
- Added sequential manual Twenty sync core with partial-ID preservation.
- Added migration `0013_order_twenty_sync.sql`.
- Added admin-protected `POST /api/orders/:id/crm/twenty`.
- Added order-list CRM fields and a manual `Отправить в CRM` admin control.
- Added disabled-by-default Twenty environment variables.

### Files changed
- `src/crm/twenty-sync-core.js`
- `functions/api/orders/[id]/crm/twenty.js`
- `migrations/0013_order_twenty_sync.sql`
- `src/orders-core.js`
- `public/admin-orders.js`
- `public/admin.js`
- `.env.example`
- tests and project documentation

### Checks
- Targeted CRM core/admin tests: 12 passed.
- `npm.cmd test`: 185 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.
- Remote migration audit: only `0013_order_twenty_sync.sql` pending.

### Next
- Apply migration and deploy the platform path.
- Run disabled-by-default production safety test.
- For a successful real Twenty sync, create/select a Twenty workspace, verify
  its generated API schema, and configure production secrets.

## 2026-06-12 - CRM production safety test

### What changed
- Applied production migration `0013_order_twenty_sync.sql`.
- Deployed CRM Slices 5-7 to Cloudflare Pages.
- Ran the production endpoint against smoke order `5` while Twenty sync
  remained disabled.

### Checks
- Deployment URL: `https://a25ae4ff.furniture-orders-mvp.pages.dev`.
- Stable admin and deployment admin: HTTP 200.
- Production admin bundle contains the CRM button and endpoint path.
- Production D1: no pending migrations.
- Endpoint result: controlled `failed` with `Twenty sync is disabled.`
- Order `5` source `calculator:1`, status `new`, and budget `615000` remained
  unchanged.

### Next
- Create or select a Twenty workspace.
- Verify workspace-generated API paths and payload schemas.
- Configure `TWENTY_API_BASE_URL` and `TWENTY_API_KEY`.
- Set `TWENTY_SYNC_ENABLED=true` only for a controlled successful production
  test.

## 2026-06-12 - Native CRM MVP

### Decision
- Validate a simple built-in CRM before installing or enabling Twenty.
- Twenty will become a separate optional module/repository; it remains disabled.

### What changed
- Added `/crm.html`, a manager-focused pipeline over existing order data.
- Added search, pipeline grouping, summary counters, AI/CRM signals, and quick
  status movement through the existing `/api/orders/status` endpoint.
- Added a CRM link to the existing admin page.
- No endpoint, migration, dependency, external service, or production setting
  was added.

### Files changed
- `public/crm.html`
- `public/crm.js`
- `public/crm-core.js`
- `tests/crm-core.test.js`
- `public/admin.html`
- `package.json`
- project documentation

### Checks
- `node --test tests/crm-core.test.js`: 6 passed.
- `npm.cmd test`: 191 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.
- Local Wrangler server started on port `8795`.
- Visual browser verification was blocked by the environment policy for
  localhost and remains pending.

### Next
- Deploy the native CRM and run a production manager-flow smoke test.
- After native CRM verification, create a separate repository for the optional
  Twenty integration module.

## 2026-06-12 - Native CRM deploy and Twenty module boundary

### What changed
- Deployed native CRM commit `740cc07` to Cloudflare Pages.
- Verified `https://furniture-orders-mvp.pages.dev/crm` returns HTTP 200 and
  includes the CRM screen and script.
- Created and pushed the separate public module repository:
  `https://github.com/Murkin1980/furniture-twenty-integration`.
- Added module README, integration contract, env example, and safe extraction
  plan.
- Kept the tested Twenty adapter path in this repository disabled; no working
  code was removed or duplicated yet.

### Next
- Run a manager-flow smoke test in the deployed native CRM using a test order.
- Verify a selected Twenty workspace schema before moving adapter runtime code.

## 2026-06-12 - Native CRM manager tools

### What changed
- Added `All`, `Active`, `Needs attention`, and `Completed` CRM views.
- `Needs attention` includes early-stage, hot/warm, and AI score 70+ orders.
- Added inline manager-note editing and saving through the existing protected
  order status endpoint.
- Preserved existing data and avoided new endpoints, migrations, or
  dependencies.

### Checks
- `node --test tests/crm-core.test.js`: 7 passed.
- `npm.cmd test`: 192 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

### Next
- Deploy and verify the updated CRM screen.
- Next native CRM product slice: follow-up date/tasks and overdue indicators.

## 2026-06-12 - Native CRM follow-up MVP

### What changed
- Added optional `follow_up_at` and `follow_up_task` order fields.
- Added migration `0014_order_follow_up.sql`.
- Extended the existing protected order update contract.
- Added CRM date/task controls, today/overdue indicators, and a due-contact
  filter.
- No notifications, external calls, or new dependencies were added.

### Checks
- Targeted CRM/order tests: 38 passed.
- `npm.cmd test`: 194 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

### Next
- Apply migration `0014`, deploy, and verify the production CRM screen.

### Production completion
- Migration `0014_order_follow_up.sql` applied successfully.
- Cloudflare Pages deployment: `https://bb963409.furniture-orders-mvp.pages.dev`.
- Stable `/crm` returned HTTP 200 and contains the follow-up filter.
- Production D1 reports no pending migrations.

## 2026-06-13 - Portfolio first-photo upload UX fix

### What changed
- Exposed an `Upload first photo` file input directly in the portfolio creation
  form.
- After creating a portfolio work, the selected JPEG/PNG/WebP file uploads
  automatically through the existing R2 endpoint.
- Preserved the existing per-work `Upload photo` and URL-based `Add photos`
  actions.
- Added focused tests for the visible control and create-then-upload workflow.

### Checks
- Targeted portfolio/admin upload tests: 8 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.

### Next
- Deploy and verify the visible production admin control.
- Run a real test-image upload and public gallery smoke before marking
  Portfolio and media complete.

## 2026-06-12 - Native CRM and order workflow completion

### What changed
- Added order interaction history for calls, messages, meetings, measurements,
  and notes.
- Added protected `GET/POST /api/order-interactions`.
- Added CRM quick actions and per-order history display.
- Expanded CRM summary with conversion, due-today, and overdue counts.
- Marked native CRM and the lead/order workflow complete for MVP scope.

### Checks
- Targeted CRM/order tests: 40 passed.
- `npm.cmd test`: 196 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

### Completion boundary
- Intake, order statuses, manager notes, project steps, follow-up tasks,
  interaction history, priority filters, and basic analytics are complete.
- Further CRM/order changes should now be driven by real manager usage rather
  than expanding speculative scope.

### Production completion
- Applied migration `0015_order_interactions.sql`.
- Deployed to `https://55405041.furniture-orders-mvp.pages.dev`.
- Created and read a safe `note` interaction on production smoke order `5`.
- Stable production interaction endpoint returned the saved event.
- Native CRM and lead/order workflow are closed for MVP scope.

## 2026-06-12 - Infrastructure and AI production audit

### What changed
- Confirmed production D1 has no pending migrations and required R2 buckets
  exist.
- Added the existing OpenAI provider configuration to Cloudflare Pages
  production secrets without exposing secret values.
- Redeployed Pages and successfully ran manual AI analysis on synthetic order
  `6`.
- Updated AI and VPS operations documentation to match the verified state.

### Verified
- Manual AI result: `ai_status=success`, provider `openai`, model
  `gpt-4o-mini`, normalized score/temperature saved, empty `ai_error`.
- AI autorun remains disabled.
- No real customer data was sent during the production smoke test.
- Cloudflare Pages and D1 are operational.

### Infrastructure blocker
- Production VPS proxy health, services, and deploy-log checks return
  `502 vps_control_unreachable`.
- Direct SSH to `194.32.140.229` times out.
- Automated PS.kz panel inspection is blocked by environment network policy.
- No VPS start, stop, restart, deploy, or reload action was attempted.

### Next
- Inspect VPS power/network state manually in PS.kz.
- Obtain explicit approval before a start or restart.
- After recovery, verify `sshd`, nginx, `furniture-vps-control`, then run one
  health/services/deploy-log check.

## 2026-06-13 - Interactive project progress dashboard

### What changed
- Added standalone `PROJECT_PROGRESS.html` with workstream progress, filters,
  dependency map, and checkpoint timeline.
- Kept `PROJECT_PROGRESS.md` as the canonical text source.
- Added the rule that every completed stage updates the HTML dashboard,
  Markdown tracker, and `SESSION_NOTES.md` together.
- Linked the visual dashboard from `README.md`.

### Next
- Continue the Cloudflare/VPS infrastructure recovery stage.
- Add each completed future stage to both progress views.

### Checks
- `PROJECT_PROGRESS.html` inline JavaScript syntax: passed.
- Dashboard data: 12 workstreams and 7 timeline stages.
- `npm.cmd test`: 196 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
- Automated Playwright visual launch timed out while loading the CLI; no
  repeated retry was made.

## 2026-06-13 - AI communications foundation

### What changed
- Added `AI_COMMUNICATIONS_DECISION.md` with permissions, human approval, and
  data-minimization rules.
- Added pure AI reply prompt, parser, orchestration, and explicit action policy.
- Added admin-protected `POST /api/orders/:id/ai/suggest-reply`.
- Added CRM `Предложить ответ` control and a read-only manager-review draft.
- Added `AI_COMMUNICATIONS_ENABLED=false`; production remains disabled by
  default.

### Safety boundary
- The feature cannot send a customer message.
- The feature cannot update an order or schedule a follow-up.
- Phone, email, address, and raw payload are excluded from the AI prompt.
- Every result requires human approval.

### Checks
- Targeted AI communications tests: 9 passed.
- `npm.cmd test`: 205 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.

### Next
- Deploy the disabled-by-default path and verify it returns a controlled
  disabled response.
- After explicit approval, enable only for a synthetic reply suggestion smoke.

### Production safety completion
- Deployed to `https://e847189f.furniture-orders-mvp.pages.dev`.
- Stable production endpoint returned HTTP `503` while
  `AI_COMMUNICATIONS_ENABLED` remained unset/disabled.
- No AI provider request, message send, order update, or migration was
  performed.

## 2026-06-13 - AI communications safe MVP completion

### What changed
- Added migration `0016_communication_drafts.sql`.
- Added persistent AI/manager communication drafts with draft, approved, and
  rejected states.
- Added protected communication draft list/create/review API.
- AI reply suggestions now persist an audit draft.
- CRM now supports draft editing, explicit approval/rejection, and draft
  history.

### Completion boundary
- AI may suggest, but cannot send a message or change an order.
- Managers explicitly review every draft.
- Telegram and WhatsApp delivery adapters remain optional future integrations.

### Next
- Run full checks, apply migration `0016`, deploy, and verify a synthetic
  suggestion/approval production flow.

### Checks
- Targeted AI communications/draft tests: 11 passed.
- `npm.cmd test`: 207 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.

### Production completion
- Applied migration `0016_communication_drafts.sql`.
- Enabled manual-only `AI_COMMUNICATIONS_ENABLED=true`.
- Deployed to `https://1928eb7e.furniture-orders-mvp.pages.dev`.
- On synthetic order `6`, created communication draft `1` through the AI
  suggestion endpoint.
- Verified `requiresHumanApproval=true`.
- Explicitly approved draft `1` through the manager review endpoint.
- Verified the approved draft is returned in communication history.
- No customer message was sent and no order field was changed by the agent.
- Production D1 reports no pending migrations.

## 2026-06-13 - Portfolio first-photo upload UX fix

### What changed
- Added a visible optional `Upload first photo` control to the portfolio create
  form.
- After creating a draft portfolio work, the admin automatically uploads the
  selected image through the existing protected R2 endpoint.
- Reused the same upload helper for existing portfolio work cards.

### Checks
- Targeted portfolio/admin upload tests: 8 passed.
- `npm.cmd test`: 209 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.

### Deployment
- Pushed implementation commit `3ba1ce6`.
- Cloudflare Pages deployment completed:
  `https://12022ac5.furniture-orders-mvp.pages.dev`.
- Direct production HTML verification was blocked by a local connection failure
  to `pages.dev`; Cloudflare reported the deployment as complete.
- On 2026-06-14, `wrangler pages deployment list` confirmed deployment
  `12022ac5-8e08-4c5f-b7b1-a1af8bacac17` is the latest Production deployment
  for `main`, sourced from implementation commit `3ba1ce6`.

## 2026-06-14 - Admin/CRM UI Slice 1

### What changed
- Added a shared Serenite-inspired Furniture OS shell to admin and CRM.
- Added persistent desktop sidebar navigation and compact mobile navigation.
- Preserved existing forms, IDs, API contracts, and manager workflows.

### Files changed
- `public/admin.html`
- `public/crm.html`
- `tests/admin-shell.test.js`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`

### Checks
- Targeted UI tests: 5 passed.
- `npm.cmd test`: 212 passed.
- `npm.cmd run check`: passed.
- Desktop and mobile admin screenshots: visually verified.
- Desktop CRM screenshot: visually verified.

### Next
- Refine dashboard summaries, dense order tables, and high-frequency CRM
  actions in a separate UI slice.

### Deployment
- Implementation commit: `f3dfde2`.
- Cloudflare Pages production deployment:
  `https://8cf4b37a.furniture-orders-mvp.pages.dev`.

## 2026-06-14 - SaaS product interface skill

### What changed
- Converted the UPROCK SaaS interface article into a reusable project skill.
- Qualified broad article recommendations with Nielsen usability heuristics and
  WCAG 2.2 implementation checks.
- Added a practical workflow, operational SaaS checklist, and source notes.
- Updated repository instructions to require the skill for admin/CRM UI work.

### Files changed
- `skills/saas-product-interface/`
- `AGENTS.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`

### Checks
- Skill frontmatter, name, description, references, and OpenAI metadata:
  structurally verified.
- Workspace and installed Codex skill copies: hash matched.
- Repository and workspace skill copies: hash matched.
- `npm.cmd test`: 212 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.
- Official quick validator could not run because `PyYAML` is unavailable.

### Next
- Apply the skill to Admin/CRM UI Slice 2.

## 2026-06-14 - Admin/CRM UI completion

### What changed
- Split the long admin page into focused workspaces controlled by stable sidebar
  navigation.
- Added actionable order summary metrics, client-side search, and combined
  status filtering.
- Added semantic status pills and mobile order-card table reflow.
- Kept CRM status and quick actions visible while moving notes, follow-up,
  history, and AI drafts into progressive disclosure.
- Added skip/focus/accessibility polish without changing backend contracts.

### Files changed
- `public/admin.html`
- `public/admin.js`
- `public/admin-core.js`
- `public/crm.html`
- `public/crm.js`
- `tests/admin-dashboard.test.js`
- `tests/admin-shell.test.js`

### Checks
- Focused admin/CRM tests: 17 passed.
- `npm.cmd test`: 216 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation update.
- Desktop and mobile admin screenshots: visually verified.

### Release
- Implementation commit: `7f1c768 feat: complete admin and CRM interface MVP`.
- Cloudflare Pages deployment:
  `https://2423fa56.furniture-orders-mvp.pages.dev`

### Next
- Extend the completed MVP interface only from real manager feedback.

## 2026-06-14 - Repository hygiene

### What changed
- Moved historical Stage 1-4 instructions, briefs, handoffs, and implementation
  summaries from the repository root to `docs/internal/stages/`.
- Moved NotebookLM context to `docs/internal/notebooklm/`.
- Moved the architecture PDF to `docs/architecture/`.
- Removed development logs from Git tracking and added `*.log` to `.gitignore`.
- Added concise navigation documents for the new documentation folders.

### Safety
- Application code, API contracts, migrations, deploy configuration, and
  production settings were not changed.
- Existing untracked working instructions and handoffs remain untouched.

### Next
- Audit admin endpoints and define read/write/ops token boundaries before
  implementing auth hardening.

## 2026-06-14 - Auth hardening audit

### Finding
- `ADMIN_TOKEN` checks are duplicated across many Functions and protect normal
  reads, business writes, AI/CRM actions, and VPS operations.
- Safe token separation requires a shared scoped auth helper, endpoint
  classification, tests, UI handling, and staged secret rotation.

### Decision
- Use `ADMIN_READ_TOKEN`, `ADMIN_WRITE_TOKEN`, and `OPS_TOKEN`.
- Permit write credentials to perform read actions, but keep operations
  credentials separate.
- Keep `ADMIN_TOKEN` only as a temporary documented migration fallback.

### Next
- Implement the shared pure auth helper and focused scope tests before migrating
  endpoint files.

## 2026-06-14 - Auth hardening foundation

### What changed
- Added `src/auth.js` with explicit read, write, and operations scopes.
- Added token extraction, safe scope hierarchy, default-deny failures, and a
  temporary legacy `ADMIN_TOKEN` migration fallback.
- Added focused scope tests.

### Safety
- No endpoint, UI, secret, migration, deployment, or production behavior
  changed in this slice.

### Next
- Migrate one representative read, write, and operations endpoint with focused
  tests.
- After the security slice, create the OCR/sketch recognition decision before
  writing OCR code.

## 2026-06-14 - OCR and sketch recognition decision

### Decision
- Keep OCR extraction, furniture-sketch interpretation, and future SketchUp
  automation as separate layers.
- Recognition is manual-first and produces an editable draft with confidence,
  warnings, and missing information.
- Only manager-approved structured data may later enter the order or SketchUp
  workflow.

### Safety
- No code, endpoint, UI, migration, provider call, deploy, or production
  setting changed.

### Next
- Finish representative scoped-auth endpoint migration.
- Implement OCR Slice 1 as a pure schema/parser slice with tests.

## 2026-06-14 - OCR Slice 1 pure parser/schema

### What changed
- Added `src/ocr/recognition-result.js` with a strict recognition draft schema,
  safe default, code-fence parsing, allowlists, and confidence normalization.
- Unknown units remain `unknown` with warnings.
- Invalid or empty dimensions are ignored with warnings instead of being
  silently trusted.
- Added focused parser tests and included the module in `npm run check`.

### Safety
- No provider call, endpoint, UI, migration, storage write, deploy, or
  production setting changed.

### Next
- OCR Slice 2: provider-neutral prompt/request builder without network calls.

## 2026-06-14 - OCR Slice 2 provider-neutral request

### What changed
- Added `src/ocr/recognition-prompt.js`.
- Added strict recognition prompt construction from safe optional context.
- Added a provider-neutral request object with normalized image reference and
  expected JSON response format.
- Added focused tests for schema, safety rules, snake_case support, missing
  image source, no fetch, and input immutability.

### Safety
- No provider URL, API key, model, fetch, endpoint, UI, migration, storage
  write, deploy, or production behavior changed.

### Next
- OCR Slice 3: orchestration with an injected fake sender and Slice 1 parser.

## 2026-06-14 - OCR Slice 3 injected-sender orchestration

### What changed
- Added `src/ocr/recognize-image.js`.
- Added orchestration from provider-neutral request through injected sender to
  strict result parser.
- Added safe processing metadata and explicit parse-failure reporting.
- Added support for raw string, content, and OpenAI-like choices responses.
- Added focused tests for missing sender, sender errors, missing image source,
  invalid JSON, response forms, no fetch, and input immutability.
- Strengthened the OCR prompt so every input starts as furniture-related, while
  unclear details remain `other`, omitted, or warnings instead of invented
  unrelated content.

### Safety
- No fetch, provider client, endpoint, UI, migration, storage write, deploy, or
  production behavior changed.

### Next
- OCR Slice 4: D1 draft/approved storage model and pure persistence helpers.

## 2026-06-14 - OCR Slice 4 persistence contract

### What changed
- Added migration `0017_ocr_recognitions.sql` for versioned recognition records
  linked to orders and source media.
- Added pure helpers for draft/failed creation, manager approval/rejection,
  normalized JSON serialization, and safe stored-result parsing.
- Added the same table to local runtime schema initialization.
- Added focused persistence-contract tests.

### Safety
- Migration was not applied to production.
- No provider call, endpoint, UI, deploy, or production setting changed.
- Only manager-reviewed records can become `approved`.

### Next
- OCR Slice 5: protected manual recognition endpoint using an injected sender.

## 2026-06-14 - OCR Slice 5 protected manual endpoint

### What changed
- Added `recognizeOrderImageCore` to validate the order and stored image source,
  invoke only an injected recognition sender, and save a draft/failed record.
- Added write-protected `POST /api/orders/:id/ocr/recognize`.
- Added tests for order/image validation, authorization, draft/failed storage,
  sender errors, invalid output, and no-fetch behavior.

### Safety
- Endpoint has no real provider sender and cannot call fetch.
- Recognition never becomes approved automatically.
- No UI, deploy, production migration, or production setting changed.

### Next
- OCR Slice 6: manager review UI with original image and editable result.

## 2026-06-14 - OCR Slice 6 manager review workflow

### What changed
- Added migration `0018_ocr_image_source.sql` so recognition records can retain
  the original stored image reference.
- Added read-protected recognition listing and write-protected explicit review.
- Added an admin OCR review panel with original preview/reference, warnings,
  missing information, editable structured JSON, and approve/reject actions.
- Added pure OCR admin view-model and JSON validation tests.

### Safety
- Approval and rejection require an explicit manager action.
- Read tokens cannot approve or reject.
- No real provider sender, automatic approval, deploy, production migration, or
  production setting changed.

### Checks
- Focused OCR/admin tests: 28 passed.
- Full project tests: 274 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
- Local dev server compiled and served the admin route; in-app browser runtime
  was unavailable for screenshot verification.

### Next
- OCR Slice 7: real provider sender and synthetic local smoke only.

## 2026-06-14 - OCR Slice 7 gated vision sender

### What changed
- Added an OpenAI-compatible multimodal OCR request builder and sender.
- Sender accepts only HTTPS or image data URLs and reuses the existing safe AI
  transport error handling.
- Manual OCR endpoint uses the real sender only when
  `OCR_RECOGNITION_ENABLED=true`; injected test senders remain supported.
- Added OCR env examples and focused sender/gating tests.

### Safety
- No external provider request or synthetic smoke was run.
- No retries are made after HTTP 429.
- No customer images, production migration, deploy, or production setting
  changed.

### Checks
- Focused OCR sender/core tests: 28 passed.
- Full project tests: 280 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Apply migrations `0017` and `0018` only to local D1 and run one synthetic
  furniture-sketch smoke request.

### Local D1 follow-up
- Full `wrangler d1 migrations apply DB --local` stopped on historical drift:
  migration `0002` attempted to add an already existing `updated_at` column.
- No retry loop was used.
- Applied only `0017_ocr_recognitions.sql` and `0018_ocr_image_source.sql`
  directly to local D1.
- Verified local `ocr_recognitions` exists and includes `image_source`.
- Remote/production D1 was not touched.

### Synthetic provider smoke attempt
- Used one fully synthetic three-door wardrobe sketch and local order `#2`.
- Two preliminary requests were rejected by local authorization before any
  provider call.
- After configuring a temporary local write token, exactly one external
  provider request was sent.
- The endpoint returned `server_error` and no OCR record was saved.
- No retry was made.
- Investigation identified and fixed two integration defects:
  - large image data URLs are no longer persisted into D1 `image_source`;
  - internal `requiredFields` metadata is no longer sent inside provider
    `response_format`.
- Production and remote D1 were not touched.
- A second synthetic smoke remains pending for a later explicit run.

### OCR local runtime D1 diagnosis
- A second controlled provider request also returned `server_error`; no retry
  loop was used.
- Confirmed that `npm run dev -- --d1 DB` made Pages dev use a separate
  `local-DB`, while Wrangler CLI migrations targeted configured
  `furniture_orders`.
- Starting Pages dev without the override exposed the configured orders,
  migrations, and OCR diagnostic record correctly.
- Removed `--d1 DB` from the project dev script and updated README/AI setup
  guidance.
- Added a regression test that keeps Pages dev on configured local D1.
- Applied migrations `0013` and `0014` only to configured local D1 so the
  current local order list loads during OCR verification.
- No production D1, deploy, or customer data was touched.
- Next: run checks, then perform at most one final synthetic OCR provider smoke.

### OCR Slice 7 successful synthetic smoke
- Sent exactly one final provider request after fixing the local D1 dev path.
- `POST /api/orders/2/ocr/recognize` returned `201`.
- Saved recognition record `2` as `draft`; no automatic approval occurred.
- Correctly recognized a synthetic wardrobe and dimensions `2400 x 600 x
  2600 mm` with confidence `1`.
- Data image URL was not persisted.
- Full project tests: `282` passed; `npm.cmd run check` and `git diff --check`
  passed.
- README and both project progress files now mark OCR Slice 7 complete and the
  OCR workstream at `90%`.
- Production migration, deployment, settings, and customer data were not
  touched.
- Next: separately review production migrations and manual-only OCR enablement.

## 2026-06-15 - OCR Slice 8A production safety foundation

### What changed
- Added a pure recognition policy gate before the manual OCR provider call.
- Explicitly synthetic images remain available for controlled smoke tests.
- Customer images are blocked by default through
  `OCR_CUSTOMER_IMAGES_ENABLED=false`.
- Customer recognition additionally requires request-level consent and a
  stored HTTPS image reference.
- Added `OCR_PRODUCTION_READINESS.md` with migration review, synthetic smoke,
  stop conditions, and rollback instructions.

### Files changed
- `src/ocr/recognition-policy.js`
- `functions/api/orders/[id]/ocr/recognize.js`
- `tests/ocr-recognition-policy.test.js`
- `tests/ocr-order-recognition-core.test.js`
- `.env.example`
- `OCR_PRODUCTION_READINESS.md`
- OCR decision, README, progress, handoff, and reviewer summary files

### Safety
- Request-level consent is not durable audit storage; customer production use
  remains disabled until consent audit and retention operations are reviewed.
- No remote migration, secret, deploy, provider call, or production setting
  changed.

### Checks
- Focused OCR policy/endpoint/sender tests: 26 passed.
- Full project tests: 290 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- OCR Slice 8B: after explicit approval, review/apply production migrations and
  run exactly one synthetic-only production smoke.

## 2026-06-15 - OCR Slice 8B synthetic production verification

### What changed
- Audited production D1 and confirmed only OCR migrations `0017` and `0018`
  were pending.
- Applied both migrations and verified the complete empty OCR table.
- Deployed safety-gated OCR code.
- Confirmed customer-image recognition returns
  `503 ocr_customer_images_disabled` before provider access.
- Created clearly synthetic production order `8`.
- Ran exactly one planned provider smoke; recognition `1` was saved as `draft`
  with wardrobe dimensions `2400 x 600 x 2600 mm`, confidence `1`, and no
  persisted data URL.

### Operational finding
- Updating the Pages secret `OCR_RECOGNITION_ENABLED` to `"false"` did not
  reliably disable the deployed endpoint.
- One control request unexpectedly reached the provider, returned HTTP 400,
  and saved safe failed recognition `2`. No retry was made.
- Deleted `OCR_RECOGNITION_ENABLED` and `OCR_CUSTOMER_IMAGES_ENABLED`, then
  redeployed.
- Final disabled check returned `503 ocr_recognition_disabled`.

### Production state
- OCR migrations are applied.
- OCR provider/model remain configured.
- OCR enable secrets are absent; recognition and customer images are disabled.
- Final production deployment: `b78a1ccd`.
- No customer images or automatic approval were used.

### Next
- OCR Slice 9: durable consent audit, retention/deletion operations, and
  manager confirmation workflow before customer-image recognition.

## 2026-06-15 - OCR Slice 9 consent, retention, and deletion

### What changed
- Replaced request-only consent with a durable consent audit contract containing
  policy version, manager confirmation, author/time, and future retention date.
- Added migration `0019_ocr_consent_retention.sql` and persisted the audit with
  recognition records.
- Added fail-closed manual deletion: the stored image must be deleted before
  OCR data is redacted and deletion audit metadata is saved.
- Added protected DELETE handling and an explicit manager deletion action in
  the existing OCR review panel.

### Files changed
- `src/ocr/recognition-consent.js`, recognition policy/record/core modules
- OCR recognize/review API functions and `migrations/0019_ocr_consent_retention.sql`
- Existing OCR admin review module and focused tests
- OCR decision/runbook, README, progress, handoff, and reviewer summary

### Safety
- Customer-image OCR remains disabled.
- Migration `0019`, `OCR_MEDIA_BUCKET`, production deploy, and production
  settings were not changed.

### Checks
- Focused OCR/admin tests: 48 passed.
- Full project tests: 300 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Before any customer pilot, review/apply migration `0019`, bind
  `OCR_MEDIA_BUCKET`, approve consent/retention policy, and verify deletion
  using one synthetic stored object.

## 2026-06-15 - SketchUp Slice 1 versioned furniture model

### What changed
- Added a pure `furniture-model/v1` mapper that accepts only manager-approved
  OCR recognition records.
- Supported measurements are converted to millimeters; unknown units are
  warnings and are not used.
- Overall width/height/depth use explicit aliases and higher-confidence values.
- Components remain semantic labels; no geometry or placement is invented.
- Added the staged SketchUp integration decision, handoff, reviewer summary,
  and synchronized project progress.

### Files changed
- `src/sketchup/furniture-model.js`
- `tests/sketchup-furniture-model.test.js`
- `SKETCHUP_INTEGRATION_DECISION.md`
- README, OCR decision, progress, session/handoff/reviewer files

### Safety
- No MCP call, SketchUp process, arbitrary Ruby, endpoint, UI, migration,
  deploy, or production setting was added.

### Checks
- Focused mapper tests: 10 passed.
- Full project tests: 310 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Build a pure allowlisted command-plan contract without MCP or network calls.

## 2026-06-15 - SketchUp Slice 2 allowlisted command plan

### What changed
- Added pure `sketchup-command-plan/v1` builder for ready
  `furniture-model/v1` inputs.
- Added a strict validator for exactly three declarative commands:
  `set_units`, `create_envelope`, and `attach_metadata`.
- Unknown commands, extra command fields, invalid dimensions, missing source
  audit, and unsupported versions fail closed.
- Components remain metadata only; no geometry or placement is invented.

### Files changed
- `src/sketchup/command-plan.js`
- `tests/sketchup-command-plan.test.js`
- SketchUp decision, README, progress, handoff, and reviewer summary

### Safety
- No Ruby, MCP, SketchUp process, network call, endpoint, UI, migration,
  deploy, or production setting was added.

### Checks
- Focused SketchUp tests: 24 passed.
- Full project tests: 324 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Build a pure signed SketchUp node job/request contract without sending it.

## 2026-06-15 - SketchUp Slice 3 signature-ready node job

### What changed
- Added pure `sketchup-node-job/v1` builder for validated command plans.
- Added explicit job identity, deterministic idempotency, bounded TTL, source
  audit, and stable canonical signature input.
- Added validation for payload tampering, expiry, source mismatch, unsafe
  identity fields, unsupported contracts, and unverified signature values.

### Files changed
- `src/sketchup/node-job.js`
- `tests/sketchup-node-job.test.js`
- SketchUp decision, README, progress, handoff, and reviewer summary

### Safety
- The signature slot remains intentionally empty.
- No secret, signing, network call, MCP, SketchUp process, endpoint, UI,
  migration, deploy, or production setting was added.

### Checks
- Focused SketchUp tests: 37 passed.
- Full project tests: 337 passed.
- `npm.cmd run check`: passed.
- `node --check src/sketchup/node-job.js`: passed.
- `git diff --check`: passed.

### Next
- Add an injected fake-node client and local smoke without real SketchUp.

## 2026-06-15 - SketchUp Slice 4 injected fake-node smoke

### What changed
- Added an injected SketchUp node client that revalidates jobs before sender
  access.
- Added local fake-node accepted, rejected, invalid, expired, mismatch, and
  sender-error smoke coverage.
- The sender receives a cloned job, is called at most once, and results are
  normalized without throwing.

### Files changed
- `src/sketchup/node-client.js`
- `tests/sketchup-node-client.test.js`
- SketchUp decision, README, progress, handoff, and reviewer summary

### Safety
- No global fetch fallback, retry, real node URL, signing secret, MCP,
  SketchUp process, endpoint, UI, migration, deploy, or production change.

### Checks
- Focused SketchUp tests: 45 passed.
- Full project tests: 345 passed.
- `npm.cmd run check`: passed.
- `node --check src/sketchup/node-client.js`: passed.
- `git diff --check`: passed.

### Next
- Add pure HMAC signing/verification and a request builder without fetch.

## 2026-06-15 - SketchUp Slice 5 HMAC signing and request

### What changed
- Added Web Crypto HMAC-SHA256 signing and verification for canonical node-job
  signature input.
- Added signed-job validation mode while preserving unsigned fail-closed
  behavior by default.
- Added a transport-neutral signed HTTPS request builder without fetch.
- Completed checkpoint review for SketchUp Slices 1-5.

### Files changed
- `src/sketchup/node-auth.js`
- `src/sketchup/node-job.js`
- `tests/sketchup-node-auth.test.js`
- SketchUp decision, README, progress, handoff, and reviewer summary

### Safety
- Signing secrets are input-only and never returned or stored.
- No fetch, sender, real node URL, endpoint, MCP, SketchUp process, migration,
  deploy, or production setting was added.

### Checks
- Focused SketchUp tests: 54 passed.
- Full project tests: 354 passed.
- `npm.cmd run check`: passed.
- `node --check src/sketchup/node-auth.js`: passed.
- `git diff --check`: passed.

### Next
- Add an injected HTTPS sender without global fetch fallback or retries.

## 2026-06-15 - SketchUp Slice 6 injected HTTPS sender

### What changed
- Added a single-attempt sender for prebuilt signed SketchUp HTTPS requests.
- Requires injected `fetchFn`, never falls back to global fetch, and never
  retries, including on HTTP 429.
- Normalizes authorization, rate-limit, server, invalid-response, and network
  failures.

### Safety
- No real node URL, endpoint, MCP, SketchUp process, migration, deploy, or
  production setting was added.

### Checks
- Focused sender tests: 6 passed.
- Full project tests: 360 passed.
- `npm.cmd run check`: passed.
- `node --check src/sketchup/node-http.js`: passed.
- `git diff --check`: passed.

### Next
- Design manual protected endpoint and job audit storage without production
  deploy.

## 2026-06-16 - SketchUp Slice 7 manual endpoint and audit

### What changed
- Added operations-scoped `POST /api/orders/:id/sketchup/jobs`.
- Added a core flow requiring explicit manager confirmation, manager identity,
  and a specific approved OCR recognition.
- Added migration `0020_sketchup_jobs.sql` with pending-first audit storage.
- Audit is inserted before sender access and completed as accepted, rejected,
  or failed.

### Safety
- Endpoint accepts only an injected sender and cannot call real/global fetch.
- Audit excludes signatures and signing secrets.
- Migration `0020`, deploy, production settings, MCP, and SketchUp were not
  applied or changed.

### Checks
- Focused SketchUp tests: 69 passed.
- Full project tests: 369 passed.
- `npm.cmd run check`: passed.
- New SketchUp/endpoint modules `node --check`: passed.
- `git diff --check`: passed.

### Next
- Build a Windows fake execution-node contract before connecting real
  SketchUp/MCP.

## 2026-06-16 - SketchUp Slice 8 fake receiving node

### What changed
- Added a pure fake receiving-node trust boundary.
- Signed jobs are verified for HMAC and expiry before idempotency access.
- Injected replay storage blocks duplicate jobs.
- Accepted jobs return a safe dry-run summary with `executed=false`.

### Safety
- No service listener, filesystem write, executable command, Ruby, MCP,
  SketchUp process, migration apply, deploy, or production setting was added.

### Checks
- Focused fake-node tests: 7 passed.
- Full project tests: 376 passed.
- `npm.cmd run check`: passed.
- `node --check src/sketchup/fake-node.js`: passed.
- `git diff --check`: passed.

### Next
- Build a separate Windows service wrapper before connecting real SketchUp/MCP.

## 2026-06-16 - SketchUp Slice 9A local dry-run service

### What changed
- Added a separate dependency-free `sketchup-node-service` for local Windows
  prototype verification.
- Added loopback-by-default health and signed-job HTTP endpoints.
- Added request-size, transport-header, HMAC, expiry, and in-memory replay
  checks.

### Safety
- Service always reports `executionEnabled=false` and accepted jobs remain
  `executed=false`.
- No SketchUp, MCP, Ruby, child process, filesystem artifact, migration apply,
  deploy, or production setting was added.

### Checks
- Focused service tests: 6 passed.
- Full project tests: 382 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Add an injected execution-adapter contract that remains disabled by default.

## 2026-06-16 - SketchUp Slice 9B guarded execution adapter

### What changed
- Added a disabled-by-default injected execution-adapter contract.
- Added matching job approval, manager identity, and approval-time checks.
- Added safe normalization for confirmed, unconfirmed, missing, and failed
  injected executors.

### Safety
- Adapter is not wired into HTTP.
- No real SketchUp, MCP, Ruby, child process, filesystem artifact, migration
  apply, deploy, or production setting was added.

### Checks
- Focused SketchUp node service tests: 13 passed.
- Full project tests: 389 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Define the render-artifact return and order-attachment contract without real
  SketchUp output.

## 2026-06-16 - SketchUp Slice 10 render artifact contract

### What changed
- Added pure `sketchup-render-artifact/v1` manifest builder and validator.
- Added pure future order-attachment payload builder.
- Added allowlisted media types, safe relative storage keys, byte counts, and
  SHA-256 validation.

### Safety
- No file write, R2 upload, endpoint, migration, real render, deploy, or
  production order attachment was added.

### Checks
- Focused render-artifact tests: 8 passed.
- Full project tests: 397 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Continue only in an approved Windows/SketchUp test environment with a real
  injected executor; keep production disconnected.

## 2026-06-16 - Portfolio media ops readiness

### What changed
- Added `PORTFOLIO_MEDIA_OPS.md` with Cloudflare R2 binding setup, local smoke,
  production smoke, and safety rules.
- Added `src/portfolio-media-ops.js` pure readiness helper for
  `PORTFOLIO_MEDIA_BUCKET` and optional `PORTFOLIO_MEDIA_PUBLIC_BASE_URL`.
- Added `.env.example` documentation for the optional media public base URL.
- Updated project progress to reflect that the production ops path is now
  documented and testable.

### Safety
- No production Cloudflare settings, R2 bucket contents, D1 migration, deploy,
  or runtime upload behavior changed.
- URL-based portfolio images remain the fallback if R2 upload is unavailable.

### Checks
- Focused portfolio media ops tests: 4 passed.
- Full project tests: 401 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Perform an actual Cloudflare production R2 binding smoke test when ready.

## 2026-06-16 - Portfolio media production read-smoke

### What changed
- Deployed current `main` to Cloudflare Pages production.
- Verified production deployment source `ea0e2e6`.
- Verified R2 bucket `furniture-portfolio-media` exists.
- Verified public portfolio API returns `200`.
- Verified missing `/media/portfolio/...` returns `404`, not `503`, which
  confirms the production Pages media route has the R2 binding.
- Verified encoded traversal `/media/portfolio/%2e%2e/...` returns `400`.

### Safety
- No R2 object was uploaded or deleted.
- No production D1 data was changed.
- Admin upload write-smoke is still pending.

### Checks
- Deploy: passed.
- Read-only production smoke: passed.

### Next
- Upload one small test image from admin, verify returned URL, then publish a
  test portfolio item.

## 2026-06-16 - Portfolio media write-smoke runner

### What changed
- Added `scripts/portfolio-media-smoke.mjs` for an explicit admin-token based
  portfolio upload smoke.
- Documented the runner in `PORTFOLIO_MEDIA_OPS.md`.
- The runner creates a draft item and uploads one image; publishing requires
  `PORTFOLIO_SMOKE_PUBLISH=true`.

### Safety
- The runner was not executed against production.
- No production D1 row or R2 object was created by this slice.

### Checks
- `node --check scripts/portfolio-media-smoke.mjs`: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Run the smoke runner only after explicit approval to create a test portfolio
  draft/upload in production.

## 2026-06-16 - Cloudflare/VPS read-only infrastructure pass

### What changed
- Verified Cloudflare Pages project `furniture-orders-mvp` exists.
- Verified production domain is alive.
- Verified R2 bucket `furniture-portfolio-media` exists.
- Verified unauthenticated VPS proxy endpoints return `401`, meaning the
  endpoint layer is reachable and protected.
- Updated `LANDING_VPS_OPS_RUNBOOK.md` with current Cloudflare/R2/VPS status.

### Safety
- No VPS deploy/reload/service action was called.
- No production D1 write or R2 object write was performed.

### Checks
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Run authenticated VPS `/health`, `/services`, and `/deploy/logs` checks when
  a production ops token/SSH path is available.

## 2026-06-16 - Local dev runbook

### What changed
- Added `LOCAL_DEV_RUNBOOK.md`.
- Documented local `dev-admin-token` behavior.
- Documented local Wrangler D1 schema drift recovery for the OCR retention
  columns that blocked `/api/orders`.

### Safety
- The runbook explicitly limits schema recovery commands to local D1 only.

### Checks
- Documentation-only change.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## 2026-06-16 - VPS read-only smoke runner

### What changed
- Added `scripts/vps-readonly-smoke.mjs`.
- Documented the runner in `LANDING_VPS_OPS_RUNBOOK.md`.
- The runner checks only platform proxy GET endpoints:
  `/api/vps/health`, `/api/vps/services`, and `/api/vps/deploy/logs?limit=5`.

### Safety
- The runner was not executed with production admin credentials.
- It does not call deploy, reload, restart, or any write endpoint.

### Checks
- `node --check scripts/vps-readonly-smoke.mjs`: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Run the runner only when a production admin token is available.

## 2026-06-16 - AI manual smoke runner

### What changed
- Added `scripts/ai-manual-smoke.mjs`.
- Documented explicit synthetic-order smoke usage in `AI_SETUP.md`.
- The runner calls only existing manual endpoint
  `POST /api/orders/:id/ai/analyze`.

### Safety
- AI autorun remains disabled.
- Runner was not executed against production.
- It must be used only with a synthetic order because it writes AI result fields
  to that order.

### Checks
- `node --check scripts/ai-manual-smoke.mjs`: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

### Next
- Run only when a synthetic production order id and admin token are selected.

## 2026-06-16 - AI production auth-smoke

### What changed
- Verified production manual AI endpoint rejects unauthenticated POST with
  `401`.
- Updated `AI_SETUP.md` with the auth-smoke result.

### Safety
- No admin token was sent.
- No provider call was made.
- No order AI fields were written.

### Checks
- Production unauthenticated endpoint check: passed.
- `git diff --check`: passed.
- `npm.cmd run check`: passed.

### Next
- Use `scripts/ai-manual-smoke.mjs` only with a synthetic order and approved
  production admin token.

## 2026-06-16 - Production ops continuation handoff

### What changed
- Added `docs/sessions/furniture-production-ops-next-actions.md`.
- Consolidated the remaining approved-smoke commands for portfolio media, VPS
  read-only checks, and AI manual synthetic-order checks.

### Safety
- No production write action was executed.
- The file explicitly lists actions that require approval.

### Checks
- Documentation-only change.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## 2026-06-16 - Production ops progress checkpoint

### What changed
- Updated `PROJECT_PROGRESS.md` and `PROJECT_PROGRESS.html` to mark checkpoint 5.
- Refocused the active roadmap from SketchUp contract implementation to
  controlled production verification.
- Updated `README.md` with the current production verification focus:
  portfolio media write-smoke, authenticated VPS read-only smoke, and one
  synthetic-order manual AI smoke.

### Files changed
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-production-ops-progress-checkpoint-summary.md`

### Checks
- `git diff --check`: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 401 tests.

### Next
- Commit and push the checkpoint if checks pass.

## 2026-06-20 - Production smoke preflight

### What changed
- Added `scripts/production-smoke-preflight.mjs`.
- Added `tests/production-smoke-preflight.test.js`.
- Added the preflight script to `npm run check`.
- Added preflight targets: `--target=vps`, `--target=portfolio`, `--target=ai`,
  and default `all`.
- Updated `README.md`, `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html`, and
  `docs/sessions/furniture-production-ops-next-actions.md`.
- Added reviewer summary
  `docs/sessions/furniture-production-smoke-preflight-summary.md`.

### Safety
- The preflight does not call `fetch`.
- It does not read production data.
- It does not write production data.
- It validates only env values and the local portfolio test image path.
- It masks admin tokens in the formatted report.

### Checks
- `node --check scripts/production-smoke-preflight.mjs`: passed.
- `node --test tests/production-smoke-preflight.test.js`: passed, 8 tests.
- `node scripts/production-smoke-preflight.mjs --target=vps`: passed outside
  sandbox and returned expected missing-env report without network/write.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 409 tests.

### Next
- Run preflight only after smoke env values are selected.
- Then run the approved VPS read-only, portfolio write, and AI synthetic-order
  smoke checks one by one.

## 2026-06-20 - SketchUp Slice 11 render persistence

### What changed
- Added migration `0021_sketchup_render_artifacts.sql`.
- Added `src/sketchup/render-core.js`.
- Added protected endpoint
  `POST /api/orders/:id/sketchup/render-artifacts`.
- Added `tests/sketchup-render-core.test.js`.
- Updated `README.md`, `SKETCHUP_INTEGRATION_DECISION.md`,
  `PROJECT_PROGRESS.md`, and `PROJECT_PROGRESS.html`.
- Added reviewer summary
  `docs/sessions/furniture-sketchup-slice11-render-persistence-summary.md`.

### Safety
- Endpoint requires operations scope.
- It accepts JSON metadata only, not binary files.
- It saves artifacts only for accepted SketchUp jobs belonging to the order.
- It does not upload to R2.
- It does not generate renders.
- It does not start SketchUp, MCP, Ruby, child processes, or a real executor.
- Production migration `0021` was not applied.

### Checks
- `node --check src/sketchup/render-core.js`: passed.
- `node --check functions/api/orders/[id]/sketchup/render-artifacts.js`: passed.
- `node --test tests/sketchup-render-core.test.js`: passed, 7 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 416 tests.

### Next
- Run full checks.
- Later, connect real render file generation/R2 upload only after an approved
  Windows/SketchUp executor environment exists.

## 2026-06-20 - SketchUp Slice 12 render file upload boundary

### What changed
- Added `src/sketchup/render-file.js`.
- Added protected endpoint `POST /api/orders/:id/sketchup/render-files`.
- Added `tests/sketchup-render-file.test.js`.
- Added the new files to `npm run check`.
- Updated `README.md`, `SKETCHUP_INTEGRATION_DECISION.md`,
  `PROJECT_PROGRESS.md`, and `PROJECT_PROGRESS.html`.
- Added reviewer summary
  `docs/sessions/furniture-sketchup-slice12-render-file-upload-summary.md`.

### Safety
- Endpoint requires operations scope.
- It accepts only multipart form-data.
- It requires a configured `SKETCHUP_RENDER_BUCKET`.
- It uploads only for accepted SketchUp jobs belonging to the order.
- It validates role/media-type combinations.
- It computes SHA-256 and returns a descriptor for the render manifest.
- It does not generate renders, start SketchUp, call MCP, or automatically
  attach files to orders.

### Checks
- `node --check src/sketchup/render-file.js`: passed.
- `node --check functions/api/orders/[id]/sketchup/render-files.js`: passed.
- `node --test tests/sketchup-render-file.test.js`: passed, 6 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 422 tests.

### Next
- Run full checks.
- Real render generation remains pending until an approved Windows/SketchUp
  executor exists.

## 2026-06-20 - SketchUp Slice 13A gated execution wiring

### What changed
- Added explicit `SKETCHUP_NODE_EXECUTION_ENABLED` configuration with dry-run
  as the default.
- Connected the Windows HTTP service to the existing execution adapter only
  after signed-job, expiry, transport, and replay validation.
- Required matching per-job manager approval and an injected `executePlan`
  function before execution.
- Added service tests for config gating, rejected missing approval, and the
  successful injected-executor path.
- Updated `README.md`, `sketchup-node-service/README.md`,
  `SKETCHUP_INTEGRATION_DECISION.md`, `PROJECT_PROGRESS.md`, and
  `PROJECT_PROGRESS.html`.

### Safety
- Default CLI/service mode remains dry-run.
- No SketchUp, MCP, Ruby, child process, filesystem executor, or renderer was
  added or started.
- No production configuration, migration, binding, or deploy changed.
- A missing flag, approval, or executor fails closed without execution.

### Checks
- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd --prefix sketchup-node-service test`: passed, 16 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 425 tests.
- `git diff --check`: passed with Windows CRLF warnings only.

### Next
- Build and install the external Windows SketchUp/render executor.
- Keep it disconnected until its output/artifact contract and operational
  environment are reviewed.
## 2026-06-20 - Project PDF and supplier pricing roadmap decisions

### What changed
- Added manual-first Project PDF Intelligence roadmap for classifying design
  PDFs, extracting reviewed room/furniture specifications, calculating complete
  projects, and handing approved data to SketchUp/3D.
- Added controlled Supplier Catalog and Pricing roadmap with staged imports,
  SKU mapping, anomaly review, manager approval, and immutable price versions.
- Added a workspace rule requiring read/list verification after MCP mutations.

### Files changed
- `PROJECT_PDF_INTELLIGENCE_DECISION.md`
- `SUPPLIER_PRICING_DECISION.md`
- `AGENTS.md`
- `PRODUCT.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `SESSION_NOTES.md`

### Checks
- Documentation-only change; code, migrations, deploy, and production settings
  were not changed.
- `git diff --check`: passed with line-ending warnings only.
- `PROJECT_PROGRESS.html` inline script syntax: passed.

### Next
- Complete the real SketchUp/EasyKitchen executor boundary first.
- Then start Project PDF Slice 1 or Supplier Pricing Slice 1 as separate,
  reviewable implementation work.
## 2026-06-21 - SketchUp Slice 13B local file queue

### What changed
- Added a disabled-by-default atomic file-queue executor and manager approval
  resolver for the Windows SketchUp node service.
- Connected CLI gated mode to the queue runtime and corrected its mode log.
- Documented the inbox/outbox/approval contract and the local-only EasyKitchen
  boundary.

### Files changed
- `sketchup-node-service/src/file-queue-executor.js`
- `sketchup-node-service/src/runtime.js`
- `sketchup-node-service/src/server.js`
- `sketchup-node-service/tests/file-queue-executor.test.js`
- `sketchup-node-service/package.json`
- `sketchup-node-service/README.md`
- `SKETCHUP_INTEGRATION_DECISION.md`
- `DYNAMIC_COMPONENTS_DECISION.md`
- `CALCULATOR_DECISION.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`

### Checks
- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd --prefix sketchup-node-service test`: passed, 22 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 431 tests.
- `git diff --check`: passed with line-ending warnings only.
- `PROJECT_PROGRESS.html` inline script syntax: passed.

### Next
- Build a reviewed SketchUp 2026 Ruby queue consumer that uses only allowlisted
  component IDs/attributes and keeps EasyKitchen assets local.
## 2026-06-21 - AdminLTE-inspired shell and Golos Text

### What changed
- Replaced Arial/Segoe UI interface typography with Golos Text across public
  intake, admin, and native CRM.
- Reworked admin/CRM shell tokens toward the selected AdminLTE reference:
  graphite sidebar, cool-gray canvas, white panels, restrained blue primary,
  and lower-contrast shadows.
- Kept the existing HTML/JS architecture and did not add AdminLTE, Bootstrap,
  or another dependency.
- Preserved monospace fonts for OCR/JSON and technical output.

### Files changed
- `public/index.html`
- `public/admin.html`
- `public/crm.html`
- `DESIGN.md`
- `README.md`
- `PROJECT_PROGRESS.html`
- `SESSION_NOTES.md`

### Checks
- Golos Text CSS and WOFF2 requests returned `200` locally.
- Playwright desktop admin screenshot: passed at 1440 x 1000.
- Playwright desktop CRM screenshot: passed at 1440 x 1000.
- Playwright mobile admin screenshot: passed at 390 x 844.
- Browser console errors on local admin/CRM: none.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 431 tests.
- `git diff --check`: passed with line-ending warnings only.
- Cloudflare Pages deployment: `https://ac18d7b2.furniture-orders-mvp.pages.dev`.
- Production admin and CRM desktop views and the 390 px admin view passed
  Playwright visual verification.
- Production computed font is Golos Text; admin/CRM console errors: none.

### Delivery
- GitHub commit: `d04d46d`.
- Pushed to `origin/main`.

### Next
- Extend the interface only from real manager workflow feedback.

## 2026-06-21 - Proposal Slice 1 printable template

### What changed
- Reviewed the local TUBA commercial proposal as a visual/layout reference.
- Added a pure A4 commercial-proposal normalizer and HTML renderer.
- Added automatic quantity x unit-price totals, safe formatting, HTML
  escaping, and HTTPS/data-image logo validation.
- Added a synthetic JSON example and JSON-to-HTML CLI generator.
- Documented the schema, source boundary, and future manager integration.

### Files changed
- `src/proposals/commercial-proposal-template.js`
- `tests/commercial-proposal-template.test.js`
- `scripts/generate-commercial-proposal.mjs`
- `examples/commercial-proposal.json`
- `COMMERCIAL_PROPOSAL_TEMPLATE.md`
- `DATA_SOURCES.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `package.json`

### Checks
- Focused proposal tests: passed, 6 tests.
- Focused proposal tests: passed, 6 tests after final layout polish.
- Synthetic HTML generation: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 437 tests.
- `git diff --check`: passed with Windows line-ending warnings only.
- Generated HTML and one-page A4 PDF were visually verified; Cyrillic, table,
  totals, terms, and signature are readable and not clipped.
- No commit, push, deploy, endpoint, migration, or production change was made.

### Next
- Add a manager form and pure order-to-proposal mapper as Proposal Slice 2.

## 2026-06-21 - Proposal Slice 2 order draft mapper

### What changed
- Added a pure mapper from order data to an editable proposal draft.
- Added camelCase/snake_case support and safe raw payload parsing.
- Added calculator and budget reference metadata without promoting either to
  an approved line price.
- Added deterministic proposal numbering and furniture labels.

### Files changed
- `src/proposals/order-proposal-mapper.js`
- `tests/order-proposal-mapper.test.js`
- `COMMERCIAL_PROPOSAL_TEMPLATE.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `package.json`

### Checks
- Focused mapper tests: passed, 6 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 443 tests.
- `git diff --check`: passed with Windows line-ending warnings only.

### Next
- Add a protected, non-persistent HTML preview endpoint as Proposal Slice 3.

## 2026-06-21 - Proposal Slice 3 protected preview endpoint

### What changed
- Added `POST /api/proposals/preview` for manager-authenticated proposal preview.
- Required write-scoped authorization while retaining the documented legacy
  admin-token compatibility path.
- Added safe JSON/object validation and returned normalized proposal data plus
  escaped printable HTML.
- Kept the endpoint non-persistent: no D1, order update, network call, or deploy.

### Files changed
- `functions/api/proposals/preview.js`
- `tests/proposal-preview-endpoint.test.js`
- `COMMERCIAL_PROPOSAL_TEMPLATE.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `package.json`

### Checks
- Focused proposal tests: passed, 18 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 449 tests.
- `git diff --check`: passed with Windows line-ending warnings only.

### Next
- Add the manager pricing and terms form with preview, HTML download, and Print
  to PDF actions as Proposal Slice 4.

## 2026-06-21 - Proposal Slice 4 manager workflow

### What changed
- Added `Создать КП` to each order action set.
- Added a dedicated proposal workspace with customer/project prefilling,
  editable company details, multiple line items, explicit prices, terms, and
  director fields.
- Kept order budget reference-only and visibly warned that it is not promoted
  into commercial pricing.
- Connected the form to the protected preview endpoint through `adminFetchJson`.
- Added A4 iframe preview, downloadable HTML, and browser Print to PDF.
- Added pure browser-side proposal helpers and tests.
- Fixed line-item grid overflow found during desktop Playwright verification.

### Files changed
- `public/admin.html`
- `public/admin.js`
- `public/admin-proposals.js`
- `tests/admin-proposals.test.js`
- `tests/admin-shell.test.js`
- `COMMERCIAL_PROPOSAL_TEMPLATE.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `package.json`

### Checks
- Focused admin/proposal tests: passed, 16 tests.
- `npm.cmd test`: passed, 454 tests.
- `npm.cmd run check`: passed.
- `git diff --check`: passed with Windows line-ending warnings only.
- Desktop end-to-end preview: passed with synthetic data and `450 000 ₸` total.
- Mobile 390 px: no horizontal overflow (`scrollWidth === viewport width`).
- Browser console: no errors.

### Deployment
- Commit `e64072f` pushed to `origin/main`.
- Cloudflare Pages deploy completed:
  `https://927b8718.furniture-orders-mvp.pages.dev`.
- Production admin proposal workspace loaded successfully through Playwright.
- Production preview endpoint returned the expected safe `401 unauthorized`
  without an admin token; no authenticated production write was performed.

### Next
- Add versioned D1 proposal draft/publish storage and explicit approval history.

## 2026-06-21 - Proposal remaining-slices external editor handoff

### What changed
- Added a compact master handoff for the remaining commercial-proposal work.
- Split the work into reviewed Slices 5-7: versioned D1 storage, lifecycle API,
  and persisted admin/production workflow.
- Added a 30-point comparison checklist and automatic rejection conditions.

### Files changed
- `docs/external-editor/proposals/README.md`
- `docs/external-editor/proposals/proposal-slice5-storage.md`
- `docs/external-editor/proposals/proposal-slice6-approval-api.md`
- `docs/external-editor/proposals/proposal-slice7-admin-production.md`
- `docs/external-editor/proposals/comparison-checklist.md`

### Checks
- Instructions were aligned to current commit `e64072f`, migration sequence
  ending at `0021`, scoped auth, proposal renderer, and order history core.
- No application logic, migration, dependency, or production setting changed.

### Next
- Give one slice at a time to the external editor, starting with Slice 5, then
  review its diff with the comparison checklist before allowing Slice 6.
