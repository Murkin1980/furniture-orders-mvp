# Furniture Orders MVP - Stage 4.04 WIP handoff

Date: 2026-05-31

## Current goal

Continue Stage 4.04 after the Stage 4.04A foundation: landing sites exist as entities with domains, deployment history, admin UI and dry-run publish flow.

## Done

- Read workspace `AGENTS.md` instructions.
- Checked repo status before work.
- Read Stage 4 file overview and `stage4-04-landing-sites-module.md`.
- Implemented Stage 4.04A safe slice:
  - D1 schema for sites/domains/deployments;
  - core business logic;
  - Cloudflare Functions endpoints;
  - admin UI block;
  - tests;
  - README update;
  - reviewer summary.
- Ran checks successfully.
- Applied remote D1 migration `0007_sites.sql`.
- Committed Stage 4.04A as `d41612a stage4: add landing sites module`.
- Pushed `main` to GitHub.
- Deployed Cloudflare Pages:
  - `https://aa001a80.furniture-orders-mvp.pages.dev`
- Verified production smoke:
  - `https://furniture-orders-mvp.pages.dev/admin -> 200 OK`
  - `https://furniture-orders-mvp.pages.dev/api/sites` without token -> `401 unauthorized`

## Files changed

- `migrations/0007_sites.sql`
- `src/sites-core.js`
- `functions/api/sites.js`
- `functions/api/sites/[id].js`
- `functions/api/sites/[id]/deploy.js`
- `functions/api/sites/[id]/status.js`
- `public/admin.html`
- `tests/sites-core.test.js`
- `package.json`
- `README.md`
- `furniture-stage4-04-implementation-summary.md`
- `furniture-stage4-04-wip-handoff.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
58 tests
58 pass
```

## Checks not passed yet

- Browser/manual UI smoke has not been run in this pass.
- Live VPS publish is not expected to pass until Stage 4.03C / 4.04B.

## Known bugs or suspicions

- Admin UI still lives in monolithic `public/admin.html`; repo review recommends modularization, but this was not combined with Stage 4.04A to avoid mixing a feature with a broad refactor.
- The publish flow creates deployment records and calls the VPS layer, but defaults to dry run and has no real static artifact build yet.
- SSL status is stored as `unknown`; active SSL probing is a later slice.

## Exact next commands

```bash
npm.cmd run check
npm.cmd test
git status --short
```

If closing Stage 4.04A:

```bash
git status --short --branch
curl.exe -i https://furniture-orders-mvp.pages.dev/api/sites
```

## Do not commit without separate user decision

- Old instruction files and review notes.
- Handoff files unless the user asks to include them.
- Local dev log files.
- Extracted review folders outside the repo.
