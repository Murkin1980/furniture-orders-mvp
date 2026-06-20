# Production Smoke Preflight Summary

Date: 2026-06-20

## Goal

Add a local safety preflight before production smoke checks for portfolio media,
VPS proxy, and manual AI analysis.

## What changed

- Added `scripts/production-smoke-preflight.mjs`.
- Added `tests/production-smoke-preflight.test.js`.
- Added the script to `npm run check`.
- Updated `README.md`.
- Updated `PROJECT_PROGRESS.md` and `PROJECT_PROGRESS.html`.
- Updated `SESSION_NOTES.md`.
- Updated `docs/sessions/furniture-production-ops-next-actions.md`.

## Behavior

The preflight validates:

- portfolio smoke base URL;
- portfolio admin token presence;
- local test image path and supported extension;
- optional portfolio publish flag;
- VPS smoke base URL and admin token;
- AI smoke base URL, admin token, and synthetic numeric order id.

It prints a readable report and exits non-zero when required values are missing
or malformed.

## Safety

- No network calls.
- No production reads.
- No production writes.
- No `fetch`.
- No real credentials stored in code or docs.
- Admin token values are not printed in the formatted report.

## Checks

- `node --check scripts/production-smoke-preflight.mjs`: passed.
- `node --test tests/production-smoke-preflight.test.js`: passed, 5 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 406 tests.

## Next

Set approved smoke env values, run:

```powershell
node scripts/production-smoke-preflight.mjs
```

Then run only the explicitly approved smoke runner(s).
