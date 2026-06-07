# Furniture Orders MVP - Stage 4.02B WIP handoff

Date: 2026-06-01

## Current goal

Complete Stage 4.02B coding pass, then push and deploy.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status before work.
- Inspected current calculator pricing/runtime code.
- Confirmed current `calculator_fields` exists but has no draft/published `state`.
- Confirmed `runtimeVersion` and `formulaVersion` exist, but `schemaVersion` does not.
- Confirmed current publish flow copies prices/rules but not fields.
- Created `furniture-stage4-02B-implementation-plan.md`.
- Updated `README.md` with Stage 4.02B plan status and next coding pass direction.
- Created compact `furniture-stage4-02B-coding-brief.md`.
- Added migration `0009_calculator_schema_fields.sql`.
- Implemented draft/published calculator schema fields.
- Added `SCHEMA_VERSION`.
- Added `schemaVersion` to runtime and calculator lead metadata.
- Updated widget labels/defaults/required flags to read from published schema fields.
- Added tests for schema versioning, draft/published fields, and unsupported schema config.
- Created reviewer summary `furniture-stage4-02B-implementation-summary.md`.
- Applied remote D1 migration `0009_calculator_schema_fields.sql` to `furniture_orders`.
- Committed code as `c41edc7 stage4: add schema-driven calculator fields`.
- Pushed `main` to GitHub.
- Deployed Cloudflare Pages preview `https://f95e8185.furniture-orders-mvp.pages.dev`.
- Production smoke for `/` and `/admin` returned `200 OK`.

## Files changed

- `README.md`
- `furniture-stage4-02B-implementation-plan.md`
- `furniture-stage4-02B-coding-brief.md`
- `furniture-stage4-02B-implementation-summary.md`
- `furniture-stage4-02B-wip-handoff.md`
- `migrations/0009_calculator_schema_fields.sql`
- `src/calculators-pricing.js`
- `src/calculators-core.js`
- `src/orders-core.js`
- `functions/api/calculators/[id]/embed.js`
- `tests/orders-core.test.js`

## Checks passed

- `node --check src\calculators-core.js`
- `node --test tests\orders-core.test.js`
- `npm.cmd run check`
- `npm.cmd test`

Result:

```text
64 tests
64 pass
```

## Checks not passed yet

- Browser click-through of admin pricing editor was not run.

## Known bugs or suspicions

- Admin UI still exposes a compact pricing editor, not a full schema field editor.
- Existing production calculator field rows may need publish after migration to populate `published` fields.

## Exact next commands

```bash
git status --short
```

## Do not commit without separate user decision

- Old instruction/review files.
- Local dev logs.
- Handoff files unless the user asks to include them.
