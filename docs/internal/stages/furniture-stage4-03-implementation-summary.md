# Furniture Orders MVP - Stage 4.03 implementation summary

Date: 2026-05-30

## Goal

Implement the first safe slice of Stage 4.03: expose a VPS control layer from the admin app without assuming SSH access or mutating a real server directly.

## Implemented

- Added `src/vps-control.js` as a shared client for an external lightweight VPS control API.
- Added support for required VPS control env:
  - `VPS_CONTROL_BASE_URL`
  - `VPS_CONTROL_TOKEN`
  - optional `VPS_CONTROL_TIMEOUT_MS`
- Added safe failure mode: if VPS env is missing, endpoints return `503 vps_control_not_configured`.
- Added admin endpoints:
  - `GET /api/vps/health`
  - `GET /api/vps/services`
  - `POST /api/vps/deploy/site`
  - `POST /api/vps/reload/webserver`
  - `GET /api/vps/deploy/logs`
- Added payload validation:
  - deploy requires `siteSlug` and an HTTP(S) `sourceUrl`;
  - deploy defaults to `dryRun: true`;
  - reload accepts only `nginx` or `caddy`;
  - logs limit is bounded to `1..200`.
- Added a VPS control panel to `public/admin.html`:
  - health;
  - services;
  - deploy site;
  - reload webserver;
  - deploy logs.
- Added `tests/vps-control.test.js` covering env, proxy calls, validation, deploy payload, reload validation and logs query.
- Updated `package.json` check script for Stage 4.03 files.
- Updated `README.md`.

## Files changed

- `src/vps-control.js`
- `functions/api/vps/health.js`
- `functions/api/vps/services.js`
- `functions/api/vps/deploy/site.js`
- `functions/api/vps/deploy/logs.js`
- `functions/api/vps/reload/webserver.js`
- `public/admin.html`
- `tests/vps-control.test.js`
- `package.json`
- `README.md`
- `furniture-stage4-03-wip-handoff.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
53 tests
53 pass
```

## Notes for reviewer

- This pass intentionally does not implement SSH from Cloudflare Functions.
- Cloudflare app acts as an authenticated admin proxy to a separate VPS control API.
- `vps-control-service/` now contains the Ubuntu-side service MVP for Stage 4.03B.
- The external draft blockers were fixed before adding it to the repo:
  - install script paths now match the systemd unit paths;
  - reload uses allowlisted `sudo /bin/systemctl reload nginx|caddy`;
  - auth is checked before POST body parsing;
  - POST body size is bounded by `VPS_CONTROL_MAX_BODY_BYTES`;
  - duplicate nested archive content was not imported.
- Real deploy is still intentionally not implemented; `dryRun: false` returns `501 deploy_not_implemented`.
- Heavy AI services remain explicitly out of scope for this VPS node.

Additional service checks:

```bash
cd vps-control-service
npm.cmd run check
npm.cmd test
```

Result:

```text
19 tests
19 pass
```
