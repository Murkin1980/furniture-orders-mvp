# VPS Read-only Smoke Runner Summary

## Result

Added a safe runner for authenticated production VPS proxy checks.

## Behavior

The runner requires:

- `VPS_SMOKE_BASE_URL`
- `VPS_SMOKE_ADMIN_TOKEN`

It calls only:

- `GET /api/vps/health`
- `GET /api/vps/services`
- `GET /api/vps/deploy/logs?limit=5`

## Safety

It does not call deploy, reload, restart, SSH, or any write operation. It was
not executed with production credentials in this slice.

## Verification

- `node --check scripts/vps-readonly-smoke.mjs`: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
