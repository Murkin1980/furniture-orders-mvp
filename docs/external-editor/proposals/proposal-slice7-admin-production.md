# Proposal Slice 7: Persisted Admin Workflow and Production Readiness

## Goal

Connect the existing proposal workspace to reviewed Slice 5/6 storage and
lifecycle APIs, then prepare a controlled production release.

## Prerequisite

Slices 5 and 6 must be merged, their migration reviewed, and all tests green.

## Manager workflow

Extend the existing workspace; do not redesign the admin shell.

Required flow:

1. Manager clicks `Создать КП` or opens an existing proposal from an order.
2. Existing drafts/versions load for that order.
3. Manager edits and clicks `Сохранить черновик`.
4. UI shows the saved version number and timestamp.
5. Manager previews the exact stored version.
6. Manager clicks `Зафиксировать версию` to publish it.
7. Separate `Утвердить КП` action requires an explicit confirmation dialog.
8. UI clearly distinguishes `draft`, `published`, and `approved`.
9. Errors preserve entered form data and previously stored versions.

Keep existing actions:

- update preview;
- download HTML;
- Print to PDF.

## UI requirements

- Use `adminFetchJson`; do not add direct fetch calls.
- Show loading, success, empty, unauthorized, conflict, and server-error states.
- Disable only the action in progress.
- Do not hide the reference-only budget warning.
- Do not label a published version as approved or sent.
- Do not offer customer sending in this slice.
- Keep desktop and 390 px mobile free of horizontal overflow and incoherent
  overlap.
- Add accessible labels and confirmation text naming the exact version.

## Tests

Add pure-helper/HTML-contract tests for:

- opening an existing proposal;
- saving a new draft version;
- version list rendering;
- publish and explicit approval controls;
- stale conflict leaves form data intact;
- status labels are semantically distinct;
- no direct fetch;
- existing order intake and proposal preview tests remain green.

## Production gate

Before production:

1. Run focused tests.
2. Run `npm.cmd test`.
3. Run `npm.cmd run check`.
4. Run `git diff --check`.
5. Verify desktop and 390 px mobile with Playwright.
6. Commit and push code.
7. Review `0022_commercial_proposals.sql` manually.
8. Ask the user before applying migration 0022 to production.
9. Only after approval, apply migration once and deploy Pages.
10. Use one synthetic order for production smoke; do not use client data.
11. Verify create draft -> save next version -> publish -> approve -> order
    interaction note.
12. Do not retry 429 responses in a loop.

## Completion definition

Commercial proposals may reach 100% only when the controlled production smoke
passes and progress/docs record the deployed commit and URL. Automatic sending,
electronic signatures, accounting, and payment remain separate future products.

Create `docs/sessions/furniture-proposal-slice7-summary.md` and update README,
SESSION_NOTES, and both progress files.
