# Furniture Orders MVP - Stage 4-R slice 2 WIP handoff

Date: 2026-05-31

## Current goal

Stage 4-R slice 2 is complete. Next recommended work is Stage 4.02B implementation plan for schema-driven calculator.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status before work.
- Kept previous Stage 4-R slice 1 work: `adminFetchJson` helper plus portfolio/sites/VPS migration.
- Migrated orders list loading and status update to `adminFetchJson`.
- Migrated project steps load/init/update to `adminFetchJson`.
- Migrated calculators list/create/detail/publish to `adminFetchJson`.
- Migrated pricing draft load/save and preview calculation to `adminFetchJson`.
- Verified that only `adminFetchJson` contains a direct `fetch(` call in `public/admin.html`.
- Updated `README.md`.
- Created Stage 4-R slice 2 reviewer summary.
- Committed code changes as `94dd0b9 stage4: unify legacy admin requests`.
- Pushed `main` to GitHub.
- Deployed Cloudflare Pages preview `https://97772b0a.furniture-orders-mvp.pages.dev`.
- Production smoke for `/` and `/admin` returned `200 OK`.

## Files changed

- `public/admin.html`
- `README.md`
- `furniture-stage4-R-slice2-implementation-summary.md`
- `furniture-stage4-R-wip-handoff.md`

## Checks passed

- `rg -n "fetch\\(" public\\admin.html` shows only the helper-level fetch.
- `npm.cmd run check`
- `npm.cmd test`
- Inline admin script syntax check with `node --check -`
- `curl.exe -I https://furniture-orders-mvp.pages.dev/`
- `curl.exe -I https://furniture-orders-mvp.pages.dev/admin`

Result:

```text
62 tests
62 pass
```

## Checks not passed yet

- Browser click-through of admin panels was not run.

## Known bugs or suspicions

- `public/admin.html` still contains old mojibake text in some labels/messages.
- The admin file is still large and should be split in later Stage 4-R slices.
- This slice did not browser-click through every admin panel; it is a request-layer refactor verified by tests and syntax checks.

## Exact next commands

```bash
git status --short
Get-Content -Raw ..\4 этап\stage4-02B*.md
```

## Do not commit without separate user decision

- Old instruction/review files.
- Handoff and reviewer markdown files unless the user asks.
- Local dev logs.
