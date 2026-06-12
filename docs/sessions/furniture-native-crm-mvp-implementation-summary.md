# Native CRM MVP implementation summary

Date: 2026-06-12

## Goal

Provide a small working CRM inside `furniture-orders-mvp` before introducing
Twenty as a separate optional module.

## Implemented

- Added `/crm.html` as a dedicated manager pipeline.
- Reused the existing admin token, `GET /api/orders`, and
  `POST /api/orders/status`.
- Added search across client, phone, city, furniture type, description, and
  notes.
- Added pipeline columns for all existing order statuses.
- Added summary counters and active-budget calculation.
- Added cards with contact, order, AI, notes, and Twenty sync signals.
- Added quick status movement and a link from the existing admin page.
- Added pure CRM helpers with focused unit tests.

## Architecture boundary

- No new backend endpoint, D1 migration, or dependency was introduced.
- `furniture-orders-mvp` remains the source of truth.
- Twenty remains disabled and will later be packaged as a separate module
  repository.

## Verification

- CRM core tests: 6 passed.
- Full project suite: 191 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.
- Local Wrangler server started successfully.
- Visual localhost browser inspection was blocked by environment policy.

## Reviewer focus

- Confirm the pipeline status labels match the manager's terminology.
- Verify card density and horizontal board use on desktop/mobile.
- Smoke-test status movement against a non-critical production order after
  deployment.
