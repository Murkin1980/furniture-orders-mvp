# OCR Slice 7 WIP Handoff

## Current goal

Add a real vision-provider sender and verify it only with a synthetic local
furniture sketch.

## Completed

- OCR Slices 1-6 are complete.
- Manual recognition, draft/failed storage, and explicit manager review work.
- Admin review can show the original image/reference and edit structured JSON.

## Exact next work

1. Prepare one synthetic furniture-sketch image with no customer data.
2. Set `OCR_RECOGNITION_ENABLED=true`, `OCR_PROVIDER=openai`, `OCR_MODEL`, and
   a local API key.
3. Run one second manual recognition request and stop immediately on 429.
4. Verify the saved record is `draft` or safely `failed`, then review it
   manually in admin.

A synthetic three-door wardrobe sketch was generated during the session, but
it remains in the Codex generated-images directory and was used as a data URL.

## First smoke result

- Exactly one external provider request was sent.
- It returned runtime `server_error`; no OCR record was saved.
- No retry was made.
- Fixed data URL persistence and unsupported provider response-format metadata.
- Run the second smoke only after reviewing commit checks.

## Safety boundaries

- No customer images, automatic recognition, production migration, deploy,
  automatic approval, or SketchUp call.
- Stop immediately on 429; do not retry in a tight loop.

## Last verified state

- Focused regression tests: 28 passed.
- Full project tests: 281 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
- OCR migrations `0017` and `0018` applied and verified only in local D1.
- Historical local migration drift remains at `0002`; do not rerun the full
  local migration chain until that drift is reconciled.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
