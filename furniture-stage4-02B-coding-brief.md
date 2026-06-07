# Furniture Orders MVP - Stage 4.02B coding brief

Date: 2026-06-01

## Goal

Implement schema-driven calculator fields with draft/published boundaries, `schemaVersion`, runtime compatibility, and tests.

## Baseline

- Last pushed planning commit: `93716d0 stage4: plan schema-driven calculator`.
- Current plan file: `furniture-stage4-02B-implementation-plan.md`.
- Existing tables: `calculator_prices`, `calculator_rules`, `calculator_fields`.
- Existing versions: `runtimeVersion = 1`, `formulaVersion = 1`.
- Missing: `schemaVersion`, state-aware `calculator_fields`, published field copying, schema validation.

## Coding Order

1. Add migration `0009_calculator_schema_fields.sql`.
2. Add `SCHEMA_VERSION`.
3. Extend `ensureCalculatorSchema()` for state-aware fields.
4. Update field defaults, normalization, validation, and D1 read/write helpers.
5. Publish draft fields to published fields with prices/rules.
6. Expose `draft.fields`, `published.fields`, top-level compatibility `fields`.
7. Add `schemaVersion` to runtime and lead metadata.
8. Add tests.
9. Update README and reviewer summary.
10. Run checks, commit code, push, deploy.

## Safety Boundaries

- No arbitrary formulas.
- No user-authored code execution.
- No removal of existing runtime `categories`, `rules`, or `fields`.
- No breaking embed API changes.
- Keep admin UI changes minimal unless required for compatibility.

