# Furniture Orders MVP - Stage 4.02 implementation summary

Date: 2026-05-30

## Goal

Implement Stage 4.02: let admins edit calculator prices, coefficients, add-ons, discounts, and preview formulas without changing code.

## Implemented

- Added D1 migration `migrations/0006_calculator_pricing.sql`.
- Added new entities:
  - `calculator_prices`
  - `calculator_rules`
  - `calculator_fields`
- Added draft/published pricing state:
  - admin edits draft rows;
  - publish copies draft prices/rules to published;
  - embed/runtime uses published prices/rules.
- Added default pricing seed from existing calculator categories.
- Added default rules:
  - material multipliers;
  - delivery fixed add-on;
  - installation fixed add-on;
  - discount percent.
- Added admin APIs:
  - `GET /api/calculators/:id/pricing`
  - `PUT /api/calculators/:id/pricing`
  - `GET /api/calculators/:id/rules`
  - `PUT /api/calculators/:id/rules`
  - `POST /api/calculators/:id/preview`
- Updated `POST /api/calculators/:id/publish` to publish pricing.
- Updated public widget runtime to use published material rules.
- Updated calculator lead creation to calculate from published pricing/rules.
- Applied calculator review recommendations that are critical for Stage 4.02 stability:
  - extracted shared pricing defaults and formula into `src/calculators-pricing.js`;
  - added `runtimeVersion` and `formulaVersion`;
  - made `materialRuleCode` the canonical material selector while keeping `materialMultiplier` for legacy payloads;
  - added validation for unknown material rule codes in preview and lead flow;
  - extended order `calculatorMeta` with material rule and formula version.
- Added admin UI pricing editor:
  - draft category base/unit/min values;
  - editable rules;
  - preview inputs;
  - save draft;
  - preview;
  - publish/embed.
- Updated tests and mock D1.
- Updated `README.md` for Stage 4.02.

## Files changed

- `src/calculators-core.js`
- `src/calculators-pricing.js`
- `src/orders-core.js`
- `functions/api/calculators/[id]/pricing.js`
- `functions/api/calculators/[id]/rules.js`
- `functions/api/calculators/[id]/preview.js`
- `functions/api/calculators/[id]/embed.js`
- `migrations/0006_calculator_pricing.sql`
- `public/admin.html`
- `tests/orders-core.test.js`
- `package.json`
- `README.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
27 tests
27 pass
```

Local smoke test:

```text
GET /admin -> 200 OK
POST /api/calculators -> success, calculator id 2
GET /api/calculators/2/pricing -> success, draft and published rows returned
POST /api/calculators/2/preview -> success, estimate 768750 KZT
```

## Notes for reviewer

- The formula is intentionally constrained and safe: `((basePrice + unitPrice * units) * materialMultiplier + fixedAddons) - discountPercent`.
- The canonical material API is now `materialRuleCode`; `materialMultiplier` is preserved only for backwards-compatible lead payloads.
- `runtimeVersion: 1` and `formulaVersion: 1` are returned with public calculator runtime, and `formulaVersion` is included in calculator lead metadata.
- This stage does not introduce arbitrary user-defined JavaScript formulas. Rules are structured rows with supported `ruleType` values.
- `calculator_fields` is seeded and returned for future UI growth, but Stage 4.02 UI focuses on the expected MVP controls: prices, material multipliers, add-ons, discount, preview, draft/published.
- Local dev log files may remain untracked because Windows keeps file handles open after Wrangler exits. They are not part of the implementation and should not be committed.
