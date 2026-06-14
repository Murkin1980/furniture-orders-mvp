# OCR Slice 6 WIP Handoff

## Current goal

Build a manager review UI that shows the original stored image beside an
editable recognition draft.

## Completed

- OCR Slices 1-5 are complete.
- `POST /api/orders/:id/ocr/recognize` is write-protected and injected-sender
  only.
- Recognition records distinguish `draft`, `approved`, `rejected`, and
  `failed`.

## Exact next work

1. Add protected list/get/review operations for recognition records.
2. Add pure admin view-model/render helpers and tests.
3. Show original image, extracted text, dimensions, warnings, and missing info.
4. Require an explicit manager action for approve/reject.

## Safety boundaries

- No real provider sender, customer-image upload redesign, automatic approval,
  deploy, production migration, or SketchUp call.
- Preserve existing order and media workflows.

## Last verified state

- Full project tests: 268 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Do not commit

- Unrelated untracked session/handoff files already present in the worktree.
