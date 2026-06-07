# Furniture Orders MVP - Stage 4.02B implementation summary

Date: 2026-06-01

## Goal

Implement the schema-driven calculator layer from the approved Stage 4.02B plan.

## Changes Applied

- Added D1 migration `migrations/0009_calculator_schema_fields.sql`.
- Added `SCHEMA_VERSION = 1` beside `RUNTIME_VERSION` and `FORMULA_VERSION`.
- Extended default calculator fields with safe schema metadata:
  - `role`;
  - `binding`;
  - `optionsSource`;
  - `isRequired`;
  - lead fields for `name`, `phone`, `city`, and `comment`.
- Made `calculator_fields` state-aware with `draft` and `published` rows.
- Updated calculator seeding to create draft and published fields.
- Updated publish flow so draft fields are copied to published fields together with prices/rules.
- Updated pricing response to return:
  - `draft.prices/rules/fields`;
  - `published.prices/rules/fields`;
  - top-level `fields` as draft compatibility output.
- Added field schema validation for supported:
  - field types;
  - roles;
  - bindings;
  - option sources.
- Added `schemaVersion` to published runtime output.
- Added `schemaVersion` to calculator lead metadata stored in order raw payload.
- Updated widget script to read labels/defaults/required flags from published fields while preserving the current safe hardcoded rendering model.
- Updated tests for runtime compatibility, draft/published field isolation, schema validation, and lead metadata.

## Safety Boundaries Preserved

- No arbitrary formulas.
- No user-defined JavaScript, SQL, templates, expressions, or admin-authored runtime code.
- Existing runtime response still includes `categories`, `rules`, and `fields`.
- Existing formula implementation remains in `src/calculators-pricing.js`.

## Files Changed

- `migrations/0009_calculator_schema_fields.sql`
- `src/calculators-pricing.js`
- `src/calculators-core.js`
- `src/orders-core.js`
- `functions/api/calculators/[id]/embed.js`
- `tests/orders-core.test.js`
- `README.md`
- `furniture-stage4-02B-coding-brief.md`
- `furniture-stage4-02B-implementation-summary.md`
- `furniture-stage4-02B-wip-handoff.md`

## Checks Passed

```bash
node --check src\calculators-core.js
node --test tests\orders-core.test.js
npm.cmd run check
npm.cmd test
```

Result:

```text
64 tests
64 pass
```

## Deployment Notes

- Remote D1 migration `0009_calculator_schema_fields.sql` applied successfully to `furniture_orders`.
- Code committed as `c41edc7 stage4: add schema-driven calculator fields`.
- Pushed to GitHub `main`.
- Cloudflare Pages deployed successfully: `https://f95e8185.furniture-orders-mvp.pages.dev`.
- Production smoke for `/` and `/admin` returned `200 OK`.
