# Proposal Slice 4 Reviewer Summary

Date: 2026-06-21

## Scope

Added the first usable manager workflow for creating a commercial proposal from
an existing order. This slice intentionally does not persist or mark a proposal
as approved/sent.

## Implementation

- Added `Создать КП` to order actions.
- Added a dedicated responsive proposal workspace.
- Prefilled customer, project, furniture type, and deterministic proposal number.
- Displayed order budget as reference-only and left commercial price at zero.
- Supported multiple item rows, quantity, unit price, specification, terms, and
  company/signature details.
- Called the protected preview endpoint through the shared admin request helper.
- Added iframe A4 preview, HTML download, and browser Print to PDF.
- Added pure browser helpers for draft/payload normalization.

## Safety boundaries

- No D1 proposal persistence or migration.
- No order status or intake changes.
- No automatic use of budget/calculator estimates as approved prices.
- No inferred tax, warranty, schedule, or legal terms.
- No direct fetch outside the shared admin request layer.

## Verification

- Focused UI/endpoint tests: 16 passed.
- Full project suite: 454 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed with line-ending warnings only.
- Desktop preview flow and A4 total verified with synthetic data.
- Mobile viewport 390 px has no horizontal overflow.
- Line-item geometry stays inside its form pane and does not overlap preview.
- Browser console has no errors.

## Next

Define and implement versioned D1 draft/published proposal storage, followed by
explicit approval and order-history attachment.

## Delivery

- Commit: `e64072f`.
- Pushed to `origin/main`.
- Cloudflare Pages: `https://927b8718.furniture-orders-mvp.pages.dev`.
- Production admin workspace loaded successfully.
- Unauthenticated preview request returned expected `401`; no production write
  or migration was performed.
