# Infrastructure Read-only Pass Summary

## Result

Cloudflare core is verified and VPS proxy endpoints are reachable but require
authenticated verification.

## Verified

- Cloudflare account is connected through Wrangler.
- Pages project exists: `furniture-orders-mvp`.
- R2 bucket exists: `furniture-portfolio-media`.
- Public portfolio API: `200`.
- Missing portfolio media object: controlled `404`, not missing binding `503`.
- Unauthenticated VPS endpoints return `401`.

## Not Done

- No authenticated VPS health/services/deploy-log check.
- No VPS SSH/VNC verification.
- No deploy/reload operation.
- No production write smoke.

## Next

Use production ops credentials and/or SSH to verify the VPS control service:

- `/api/vps/health`
- `/api/vps/services`
- `/api/vps/deploy/logs`

## Verification

- `npm.cmd run check`: passed.
- `git diff --check`: passed.
