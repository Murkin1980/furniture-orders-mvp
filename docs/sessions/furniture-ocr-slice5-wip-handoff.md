# OCR Slice 5 WIP Handoff

## Current goal

Add a protected manual recognition endpoint without a real provider call or UI.

## Completed

- OCR Slices 1-4 are complete.
- Slice 4 adds migration `0017_ocr_recognitions.sql` and pure record helpers.

## Exact next work

1. Create an OCR persistence/core module that validates order and media input,
   invokes `recognizeImage` with an injected sender, and inserts a draft/failed
   record.
2. Add protected `POST /api/orders/:id/ocr/recognize`.
3. Use existing admin write-auth conventions.
4. Add fake-sender endpoint/core tests.

## Safety boundaries

- No real provider sender or external fetch.
- No UI, deploy, production migration, automatic recognition, or SketchUp call.
- Recognition output must never become approved automatically.

## Checks completed for Slice 4

- Focused OCR tests: 37 passed.
- Full project tests: 260 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
