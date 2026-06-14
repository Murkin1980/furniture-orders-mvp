# OCR Slice 7 WIP Handoff

## Current goal

Add a real vision-provider sender and verify it only with a synthetic local
furniture sketch.

## Completed

- OCR Slices 1-6 are complete.
- Manual recognition, draft/failed storage, and explicit manager review work.
- Admin review can show the original image/reference and edit structured JSON.

## Exact next work

1. Apply migrations `0017` and `0018` only to local dev D1.
2. Prepare one synthetic furniture-sketch image with no customer data.
3. Set `OCR_RECOGNITION_ENABLED=true`, `OCR_PROVIDER=openai`, `OCR_MODEL`, and
   a local API key.
4. Run exactly one manual recognition request and stop immediately on 429.
5. Verify the saved record is `draft` or safely `failed`, then review it
   manually in admin.

## Safety boundaries

- No customer images, automatic recognition, production migration, deploy,
  automatic approval, or SketchUp call.
- Stop immediately on 429; do not retry in a tight loop.

## Last verified state

- Full project tests: 280 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
