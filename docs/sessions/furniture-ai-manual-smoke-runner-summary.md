# AI Manual Smoke Runner Summary

## Result

Added an explicit smoke-runner for manual AI analysis.

## Behavior

Required env:

- `AI_SMOKE_BASE_URL`
- `AI_SMOKE_ADMIN_TOKEN`
- `AI_SMOKE_ORDER_ID`

The runner calls:

```text
POST /api/orders/:id/ai/analyze
```

and prints the saved AI status, score, temperature, and error.

## Safety

The runner was not executed against production. It should be used only with a
synthetic order because it writes AI result fields to that order. AI autorun is
not enabled.

## Verification

- `node --check scripts/ai-manual-smoke.mjs`: passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
