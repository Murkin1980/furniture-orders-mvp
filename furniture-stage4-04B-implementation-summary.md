# Furniture Orders MVP - Stage 4.04B implementation summary

Date: 2026-06-01

## Goal

Move landing sites beyond dry-run-only publishing by adding generated static HTML artifacts and a live single-file HTML deploy path through the VPS control service.

## Changes Applied

- Added `GET /api/sites/:id/artifact`.
- Added `getSiteArtifact()` and safe static HTML rendering in `src/sites-core.js`.
- Changed default site deploy source URL to `/api/sites/:id/artifact`.
- Added `artifactType: "html"` to Cloudflare-side VPS deploy payload normalization and validation.
- Updated admin Landing sites action from `Publish dry run` to `Publish live`.
- Admin site deploy now sends `dryRun: false`.
- Updated Ubuntu-side `vps-control-service` deploy handler:
  - keeps dry-run behavior;
  - supports live deploy for `artifactType: "html"`;
  - downloads allowlisted HTML artifact URL;
  - validates the artifact is HTML;
  - writes staging `index.html`;
  - atomically replaces the target site directory;
  - writes deploy audit log.
- Updated tests for generated artifacts, default deploy source URL, payload `artifactType`, and live VPS HTML deploy.
- Updated `README.md`.

## Safety Boundaries

- No arbitrary templates.
- No user-authored JavaScript/code execution.
- No shell commands in the live deploy path.
- Source hosts remain allowlisted by VPS control service config.
- Path traversal checks remain in place for `siteSlug`, staging path and target path.
- Zip/package deploy remains a follow-up; this pass intentionally ships single-file HTML deploy.

## Files Changed

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
- `vps-control-service/README.md`
- `furniture-stage4-04B-coding-brief.md`
- `furniture-stage4-04B-implementation-summary.md`
- `furniture-stage4-04-wip-handoff.md`

## Checks Passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
66 tests
66 pass
```

## Deployment

- Code committed as `2033d2d stage4: add live landing artifact deploy`.
- Pushed to GitHub `main`.
- Cloudflare Pages deployed successfully: `https://12345168.furniture-orders-mvp.pages.dev`.
- Production smoke for `/` and `/admin` returned `200 OK`.

## Operational Follow-Up

- The installed Ubuntu-side `vps-control-service` must be updated/restarted on the VPS before live HTML deploy is available there.
- `VPS_CONTROL_ALLOWED_SOURCE_HOSTS` on the VPS must include the Cloudflare Pages host used by `PUBLIC_APP_ORIGIN`.
