# Furniture Orders MVP - Stage 4-R stabilization summary

Date: 2026-05-31

## Scope

Started the cross-cutting Stage 4-R stabilization lane from the corrected roadmap.

This pass intentionally keeps the refactor small: it does not split the whole `public/admin.html` yet. It introduces a shared admin JSON request helper and migrates the newest admin panels first.

## Changes applied

- Added `adminFetchJson(path, options)` inside `public/admin.html`.
- Centralized common admin request behavior:
  - read current admin token;
  - attach `X-Admin-Token`;
  - add `Content-Type: application/json` when a payload is present;
  - stringify JSON payloads;
  - parse JSON responses;
  - normalize failed responses to `json.message || fallbackMessage`.
- Migrated these admin areas to the shared helper:
  - Portfolio gallery load/create/publish/add-images requests;
  - Landing sites list/create/status/deploy requests;
  - VPS control health/services/logs/deploy/reload requests.
- Kept older orders/calculators/project-steps code unchanged in this pass to avoid a broad behavior-changing refactor.
- Updated `README.md` with the Stage 4-R lane and the first stabilization slice.

## Verification

Passed:

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
62 tests
62 pass
```

Also passed inline admin script syntax check:

```bash
$match.Groups[1].Value | node --check -
```

## Known limits

- `public/admin.html` is still monolithic.
- Inline JS is not part of the regular `npm.cmd run check` command yet, but it was checked manually in this pass.
- Some older Russian admin text still contains encoding artifacts from earlier stages; this pass focused on request-layer stabilization, not copy cleanup.
- Orders/calculators/project steps still use their older inline fetch blocks.

## Recommended next Stage 4-R slice

- Extract admin request helpers into a separate file, for example `public/admin-api.js`.
- Convert orders/calculators/project steps to the same helper.
- Then split larger admin panels into focused files only after request behavior is centralized.
