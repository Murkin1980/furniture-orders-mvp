# Furniture Orders MVP - Stage 4-R slice 2 implementation summary

Date: 2026-05-31

## Goal

Unify the legacy admin request layer before the Stage 4.02B schema-driven calculator planning/coding work.

## Scope

This slice intentionally changed only admin JSON request wiring. It did not change API contracts, database schema, pricing logic, portfolio/site/VPS behavior, or public runtime behavior.

## Changes Applied

- Reused the existing `adminFetchJson(path, options)` helper in `public/admin.html`.
- Migrated orders list loading from manual `fetch`/headers/error parsing to `adminFetchJson`.
- Migrated order status update to `adminFetchJson`.
- Migrated project step loading and automatic project init to `adminFetchJson`.
- Migrated project step update to `adminFetchJson`.
- Migrated calculator list loading and default calculator creation to `adminFetchJson`.
- Migrated calculator detail loading and publish/embed generation to `adminFetchJson`.
- Migrated pricing draft loading, pricing draft save, and pricing preview calculation to `adminFetchJson`.
- Verified with `rg` that the only remaining direct `fetch(` in the admin inline script is inside `adminFetchJson`.
- Updated `README.md` to document Stage 4-R slice 2 and the next stabilization direction.

## Files Changed

- `public/admin.html`
- `README.md`
- `furniture-stage4-R-slice2-implementation-summary.md`
- `furniture-stage4-R-wip-handoff.md`

## Safety Notes

- No arbitrary formulas or user-defined code execution were introduced.
- No D1 migrations were added.
- Existing token checks and UI render/refresh order were preserved where practical.
- Reviewer/handoff markdown files are working documents and were not intended for the code commit unless requested separately.

## Checks Passed

```bash
npm.cmd run check
npm.cmd test
$html = Get-Content -Raw -Path public\admin.html; $match = [regex]::Match($html, '(?s)<script>(.*?)</script>'); if (-not $match.Success) { throw 'admin script block not found' }; $match.Groups[1].Value | node --check -
```

Result:

```text
62 tests
62 pass
```

Deploy completed:

```text
Git commit: 94dd0b9 stage4: unify legacy admin requests
Cloudflare preview: https://97772b0a.furniture-orders-mvp.pages.dev
Production: https://furniture-orders-mvp.pages.dev
```

Final smoke passed:

```bash
curl.exe -I https://furniture-orders-mvp.pages.dev/
curl.exe -I https://furniture-orders-mvp.pages.dev/admin
```

Both returned `200 OK`.
