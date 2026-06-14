# OCR Slice 7 WIP Handoff

## Current goal

Add a real vision-provider sender and verify it only with a synthetic local
furniture sketch.

## Completed

- OCR Slices 1-6 are complete.
- Manual recognition, draft/failed storage, and explicit manager review work.
- Admin review can show the original image/reference and edit structured JSON.

## Exact next work

1. Decide the first supported vision provider and request shape.
2. Add a sender with injected `fetchFn` and focused error tests.
3. Wire the sender to the manual endpoint only when OCR is explicitly enabled.
4. Apply migrations `0017` and `0018` only to local dev D1.
5. Run one synthetic furniture-sketch smoke test.

## Safety boundaries

- No customer images, automatic recognition, production migration, deploy,
  automatic approval, or SketchUp call.
- Stop immediately on 429; do not retry in a tight loop.

## Last verified state

- Full project tests: 274 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
