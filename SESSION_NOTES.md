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
