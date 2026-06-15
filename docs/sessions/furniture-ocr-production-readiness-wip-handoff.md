# OCR Production Readiness WIP Handoff

## Current goal

Build durable consent audit and retention/deletion operations before enabling
customer-image recognition.

## Completed

- OCR Slices 1-7 and Slices 8A-8B are complete.
- Manual recognition, draft/failed storage, and explicit manager review work.
- Admin review can show the original image/reference and edit structured JSON.

## Exact next work

1. Define durable consent audit schema and policy version contract.
2. Define approved retention period and deletion operations.
3. Build pure helpers and tests before adding any endpoint/UI.
4. Keep OCR enable secrets absent throughout the work.
5. Do not use customer images until the full workflow is reviewed.

## Provider smoke results

- Exactly two external provider requests were sent in separate controlled
  attempts.
- Both returned runtime `server_error`; no provider result was saved.
- No automatic or tight-loop retry was made.
- Fixed data URL persistence and unsupported provider response-format metadata.
- The final controlled request returned `201`, saved a `draft`, and recognized
  wardrobe dimensions `2400 x 600 x 2600 mm` with confidence `1`.

## Local runtime diagnosis

- Root cause of misleading local D1 behavior was confirmed:
  `npm run dev` passed `--d1 DB`, which made Pages dev use a separate
  `local-DB` instead of configured `furniture_orders`.
- Starting Pages dev without that override immediately exposed configured
  orders, migrations, and the local diagnostic OCR record.
- The `npm run dev` script, README, and AI setup docs were corrected.
- Added a regression test that forbids the separate `--d1 DB` override.
- Applied migrations `0013` and `0014` only to configured local D1 so the
  current order list can load during local verification.
- Dev-script fix and full project checks passed.
- Slice 8A blocks customer images by default before any provider request.
- Customer recognition requires explicit env enablement, request-level consent,
  and a stored HTTPS source; durable consent audit remains future work.
- Production migrations `0017` and `0018` are applied.
- Synthetic production order `8` produced draft recognition `1`.
- Final production deployment `b78a1ccd` has OCR disabled.
- Reliable rollback is deletion of OCR enable secrets followed by deploy.

## Safety boundaries

- No customer images, automatic recognition, automatic approval, or SketchUp
  call.
- Stop immediately on 429; do not retry in a tight loop.

## Last verified state

- Focused regression tests: 28 passed.
- Full project tests: 290 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
- Migrations `0017` and `0018` are applied and verified in production D1.
- Historical local migration drift remains at `0002`; do not rerun the full
  local migration chain until that drift is reconciled.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
