# AI Production Auth-Smoke Summary

## Result

Production manual AI endpoint is reachable and protected.

## Verified

- `POST /api/orders/1/ai/analyze` without admin token returned `401`.

## Safety

- No admin token was sent.
- No provider request was made.
- No production order was modified.

## Next

Run `scripts/ai-manual-smoke.mjs` only with a synthetic order id and approved
production admin token.

## Verification

- Production unauthenticated endpoint check: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
