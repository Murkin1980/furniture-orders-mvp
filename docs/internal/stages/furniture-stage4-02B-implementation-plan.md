# Furniture Orders MVP - Stage 4.02B implementation plan

Date: 2026-06-01

## Goal

Design the schema-driven calculator layer before coding it.

Stage 4.02 already added `calculator_fields`, draft/published prices and rules, `runtimeVersion`, and `formulaVersion`. Stage 4.02B should turn the existing field seed into a real schema layer for runtime rendering, draft preview, and lead submission without breaking the current embed/runtime API.

## Current State

- `calculator_prices` has `state` and supports `draft`/`published`.
- `calculator_rules` has `state` and supports `draft`/`published`.
- `calculator_fields` exists, but it has no `state`.
- `publishCalculatorPricing()` publishes prices and rules only.
- Public runtime returns `categories`, `rules`, and `fields`.
- The widget still renders hardcoded controls for `categoryCode`, `units`, and `materialRuleCode`.
- Lead submission validates known hardcoded payload fields.
- `runtimeVersion` and `formulaVersion` exist and are currently `1`.
- There is no `schemaVersion` yet.

## Non-Goals

- No arbitrary formulas.
- No user-defined JavaScript, SQL, templates, expressions, or code execution.
- No admin-authored runtime code.
- No change to the safe formula model in `src/calculators-pricing.js`.
- No breaking change to the current embed endpoint shape.

## Decision 1 - Schema Structure For Runtime, Preview, And Lead Submission

Introduce a normalized calculator schema object assembled from draft or published DB rows:

```js
{
  schemaVersion: 1,
  state: "draft" | "published",
  fields: [
    {
      fieldCode: "categoryCode",
      label: "Category",
      fieldType: "select",
      role: "pricing_input",
      binding: "categoryCode",
      required: true,
      defaultValue: "kitchen",
      minValue: null,
      maxValue: null,
      optionsSource: "prices",
      sortOrder: 10,
      isActive: 1
    }
  ]
}
```

Field roles:

- `pricing_input`: affects estimate calculation.
- `lead_input`: collected for order creation.
- `display_only`: rendered to the user but not submitted as a calculation input.

Required initial bindings:

- `categoryCode`: select bound to published/draft price rows.
- `units`: number bound to the safe formula input.
- `materialRuleCode`: select bound only to multiplier rules.
- `name`: text lead field.
- `phone`: tel/text lead field.
- `city`: text optional lead field.
- `comment`: textarea optional lead field.

Runtime behavior:

- Embed/runtime uses only `published` schema.
- Admin pricing preview uses `draft` schema.
- Lead submission validates the submitted payload against the `published` schema and existing known calculator contract.
- Unknown submitted fields are ignored or rejected consistently; recommended default is reject unknown pricing fields and ignore unknown non-pricing metadata until there is a clear custom-field storage model.

## Decision 2 - Hard-Coded Field Types And Rule Types

Keep these enums in code, not editable as free-form behavior.

Allowed field types for Stage 4.02B:

- `select`
- `number`
- `text`
- `tel`
- `textarea`

Deferred field types:

- `checkbox`
- `radio`
- `file`
- `date`
- multi-select fields

Allowed rule types remain:

- `multiplier`
- `fixed_addon`
- `percent_discount`

Allowed schema roles:

- `pricing_input`
- `lead_input`
- `display_only`

Allowed schema bindings for Stage 4.02B:

- `categoryCode`
- `units`
- `materialRuleCode`
- `name`
- `phone`
- `city`
- `comment`

Anything outside these enums must fail validation with `400 validation_error`.

## Decision 3 - D1 Draft/Published Boundary

Add draft/published state to schema storage rather than treating `calculator_fields` as global mutable runtime config.

Recommended migration:

```sql
ALTER TABLE calculator_fields ADD COLUMN state TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE calculator_fields ADD COLUMN role TEXT NOT NULL DEFAULT 'pricing_input';
ALTER TABLE calculator_fields ADD COLUMN binding TEXT;
ALTER TABLE calculator_fields ADD COLUMN options_source TEXT;
ALTER TABLE calculator_fields ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;
```

Because SQLite/D1 index replacement needs care, create a new unique index for state-aware fields:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_fields_unique_state
  ON calculator_fields(calculator_id, field_code, state);
```

Implementation detail:

- Existing rows should be treated as `draft`.
- If no published fields exist at publish time, publish should copy draft fields into `published`.
- `publishCalculatorPricing()` should become a broader publish operation for prices, rules, and fields.
- Rename internally to something like `publishCalculatorConfiguration()` only if the rename stays local and low-risk.

What remains hard-coded:

- The formula implementation.
- Runtime renderer behavior per field type.
- Validation enums.
- Lead-to-order mapping.
- Supported options sources.

What becomes D1-editable:

- Field label.
- Field order.
- Default value.
- Active/inactive state.
- Required flag for supported lead/pricing fields.
- Min/max for numeric fields.
- Which supported binding a field represents.

## Decision 4 - Versioning Strategy

Add `SCHEMA_VERSION = 1` next to the existing pricing/runtime constants.

Recommended source:

```js
export const FORMULA_VERSION = 1;
export const RUNTIME_VERSION = 1;
export const SCHEMA_VERSION = 1;
```

Runtime response should include:

```js
{
  runtimeVersion: 1,
  formulaVersion: 1,
  schemaVersion: 1
}
```

Lead metadata should include:

```js
calculatorMeta: {
  calculatorId,
  categoryCode,
  units,
  materialRuleCode,
  materialMultiplier,
  estimate,
  formulaVersion,
  schemaVersion
}
```

Compatibility rule:

- Do not remove `categories`, `rules`, or `fields` from the current runtime response.
- Add `schemaVersion` and richer field metadata as additive fields.
- Existing embed consumers should continue to work with the current widget script.

## Proposed Coding Pass

1. Add `SCHEMA_VERSION` to `src/calculators-pricing.js`.
2. Extend `calculator_fields` schema with state, role, binding, options source, and required flag.
3. Update in-runtime schema creation in `ensureCalculatorSchema()`.
4. Add migration `0009_calculator_schema_fields.sql` or the next available migration number.
5. Update field normalization to validate field type, role, binding, and options source.
6. Update field validation and return `400 validation_error` for unsupported schema config.
7. Add `listCalculatorFields(db, calculatorId, state)` and state-aware replacement.
8. Update seeding so both draft and published field rows can exist.
9. Update publish to copy draft fields to published with prices/rules.
10. Update pricing GET response to expose `draft.fields` and `published.fields`, while optionally preserving top-level `fields` temporarily for compatibility.
11. Update runtime builder to include `schemaVersion`.
12. Update widget renderer to render supported fields from `published.fields`, with fallback to the existing hardcoded controls if schema fields are missing.
13. Update preview to validate draft schema inputs for `categoryCode`, `units`, and `materialRuleCode`.
14. Update lead submission to validate published schema inputs and include `schemaVersion` in `calculatorMeta`.
15. Add tests for draft/published fields, schemaVersion, runtime compatibility, preview validation, lead metadata, and rejection of unsupported schema config.
16. Update README and create implementation summary after coding.

## Test Plan For Coding Pass

- Existing `npm.cmd run check`.
- Existing `npm.cmd test`.
- New tests:
  - published runtime includes `schemaVersion`;
  - publishing copies draft fields into published fields;
  - changing draft fields does not affect runtime before publish;
  - unsupported `fieldType` is rejected;
  - unsupported `role` is rejected;
  - unsupported `binding` is rejected;
  - lead `calculatorMeta` includes `schemaVersion`;
  - old runtime shape still includes `categories`, `rules`, and `fields`.

## Review Gates Before Coding

- Confirm whether Stage 4.02B should use the existing `calculator_fields` table with migration columns or introduce a new `calculator_schema_fields` table.
- Confirm whether admin UI should edit all supported schema fields in the first coding pass or only preserve the backend contract with minimal UI.
- Confirm whether unknown non-pricing lead fields should be rejected or ignored in Stage 4.02B.

## Recommended Decision

Use the existing `calculator_fields` table and add state-aware columns. Keep the first coding pass backend-first with minimal admin UI changes. Reject unknown pricing fields and ignore unknown non-pricing metadata until a dedicated custom-field storage design exists.

