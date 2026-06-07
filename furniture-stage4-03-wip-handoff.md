# Furniture Orders MVP - Stage 4.03 WIP handoff

Date: 2026-05-30

## Current goal

Implement Stage 4.03 as a safe VPS control layer MVP: admin-facing control endpoints in the Cloudflare app that proxy to an external lightweight VPS control API when configured.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status before coding.
- Read `stage4-03-vps-control-layer.md`.
- Decided to implement the first safe slice without direct SSH/server mutation:
  - Cloudflare admin endpoints;
  - shared VPS control client;
  - admin UI panel;
  - tests and docs;
  - no heavy AI services on VPS.
- Added Stage 4.03 core, endpoints, admin UI, tests, README update and reviewer summary.
- Ran `npm.cmd run check` and `npm.cmd test` successfully.
- Committed Stage 4.03A code as `53109f0 stage4: add vps control proxy`.
- Pushed `main` to GitHub.
- Manual Cloudflare Pages deploy was attempted but failed because Wrangler authentication is invalid:
  - `Authentication error [code: 10000]`
  - `wrangler whoami` also fails with account/API token permissions error.
  - Retry with `CLOUDFLARE_ACCOUNT_ID=ca7e89e2e4e294af2c7db130838cf0e0` did not fix auth.
- Wrangler auth was restored later with OAuth token.
- `npm.cmd run deploy` succeeded and produced preview URL:
  - `https://5d75e9e8.furniture-orders-mvp.pages.dev`
- Verified production:
  - `https://furniture-orders-mvp.pages.dev/admin -> 200 OK`
  - `https://furniture-orders-mvp.pages.dev/api/vps/health -> 401 unauthorized without admin token`
- Created external coding instructions file for Stage 4.03B:
  - `C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\stage4-03B-vps-control-service-coding-instructions.md`
- Reviewed external draft archive:
  - `C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\vps-control-service.zip`
- Extracted review copy to:
  - `C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\vps-control-service-review`
- Ran external draft checks:
  - `npm.cmd run check` passed;
  - `npm.cmd test` passed, but tests were duplicated because the zip contains both root files and nested `vps-control-service/`.

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
- `furniture-stage4-03-implementation-summary.md`
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

## Checks not passed yet

- Browser screenshot was not captured.
- Local Wrangler smoke was not run.
- Production migration is not needed for Stage 4.03A.
- Code is committed, pushed and manually deployed after Wrangler auth was restored.
- Stage 4.03B external draft was reviewed only; it has not been merged into the repo.
- External draft blockers before VPS install:
  - `scripts/install-systemd.sh` paths do not match `systemd/furniture-vps-control.service`;
  - reload command likely fails under non-root user because code calls `systemctl` without `sudo`;
  - HTTP router reads POST body before auth and has no max body size;
  - zip contains duplicate project copies.

## Known issues or suspicions

- Real VPS Definition of Done depends on external access details not present in the repo: control API base URL, token, webserver choice, deploy path and actual server service.
- The first pass should not assume SSH credentials or mutate a real VPS.

## Exact next commands

```bash
npm.cmd run check
npm.cmd test
git status --short
```

If returning to verify Stage 4.03A production:

```bash
curl.exe -i https://furniture-orders-mvp.pages.dev/api/vps/health
Invoke-WebRequest -Uri https://furniture-orders-mvp.pages.dev/admin -UseBasicParsing | Select-Object StatusCode,StatusDescription
```

If returning to Stage 4.03B external service review:

```bash
cd "C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\vps-control-service-review"
npm.cmd run check
npm.cmd test
```

Then fix:

```text
1. Align install script paths with systemd unit.
2. Decide reload permission model: sudo allowlist or another safe mechanism.
3. Move auth before body parsing and add request body size limit.
4. Remove duplicate nested project folder from the zip/package.
```

Stage 4.03B follow-up done in repo:

```text
- Imported only the clean top-level VPS service files into `vps-control-service/`.
- Did not import the duplicate nested `vps-control-service/` folder from the zip.
- Aligned install script paths with the systemd unit:
  `/opt/furniture-control`, `/etc/furniture-control.env`, `/var/log/furniture-control`.
- Changed reload implementation to allowlisted `sudo /bin/systemctl reload nginx|caddy`.
- Added router-level auth-before-body parsing for protected routes.
- Added `VPS_CONTROL_MAX_BODY_BYTES` and oversized/invalid JSON handling.
- Added regression tests for unauthorized large POST, authorized oversized body and invalid JSON.
- Read `furniture-repo-review-recommendations.md`; relevant immediate item is freezing VPS proxy/service contract. Larger admin modularization is deferred to a separate refactor stage.
```

Latest Stage 4.03B service checks:

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

Latest root `npm.cmd run check` now also runs `npm --prefix vps-control-service run check`.

Stage 4.03B commit/deploy status:

```text
Committed: 9c24e77 stage4: add ubuntu vps control service
Pushed: main -> GitHub
Deployed: https://4688d7ad.furniture-orders-mvp.pages.dev
Production /admin: 200 OK
Production /api/vps/health without token: 401 unauthorized
```

## Do not commit without separate user decision

- Instruction files and old review notes.
- Stage summary and handoff markdown files unless the user asks.
- Local dev log files.
- Extracted review folder `4 этап/vps-control-service-review` unless explicitly asked.
