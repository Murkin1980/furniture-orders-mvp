# Furniture Orders MVP - Stage 4.04B WIP handoff

Date: 2026-06-01

## Current goal

Stage 4.04B is complete. Next likely work: install/update the Ubuntu-side VPS control service and verify a real live publish from admin.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status.
- Created compact `furniture-stage4-04B-coding-brief.md`.
- Added generated HTML artifact endpoint.
- Added live single-file HTML deploy to VPS control service.
- Updated admin site publish action to live deploy.
- Updated tests.
- Updated README.
- Created reviewer summary.
- Ran checks successfully.
- Committed code as `2033d2d stage4: add live landing artifact deploy`.
- Pushed `main` to GitHub.
- Deployed Cloudflare Pages preview `https://12345168.furniture-orders-mvp.pages.dev`.
- Production smoke for `/` and `/admin` returned `200 OK`.

## Files changed

- `functions/api/sites/[id]/artifact.js`
- `src/sites-core.js`
- `src/vps-control.js`
- `public/admin.html`
- `vps-control-service/src/deploy.js`
- `vps-control-service/src/server.js`
- `vps-control-service/README.md`
- `vps-control-service/tests/vps-control.test.js`
- `tests/sites-core.test.js`
- `tests/vps-control.test.js`
- `package.json`
- `README.md`
- `furniture-stage4-04B-coding-brief.md`
- `furniture-stage4-04B-implementation-summary.md`
- `furniture-stage4-04B-wip-handoff.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
66 tests
66 pass
```

## Checks not passed yet

- Browser click-through of admin live publish was not run.
- Live VPS publish was not run against the real Ubuntu server in this session.

## Known bugs or suspicions

- Existing installed VPS service must be updated/restarted on Ubuntu before live deploy is available there.
- VPS allowed source hosts must include the Cloudflare Pages host used by `PUBLIC_APP_ORIGIN`.
- Multi-file/zip deploy is not implemented in this slice.

## Exact next commands

```bash
git status --short
```

## Do not commit without separate user decision

- Old instruction/review files.
- Local dev logs.
- Handoff/summary files unless explicitly requested.
