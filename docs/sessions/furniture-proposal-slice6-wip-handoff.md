# Commercial Proposal Slices 5-7 WIP Handoff

Date: 2026-06-21

## Current goal

Finish the commercial proposal generator with versioned D1 storage,
publish/approve lifecycle, persisted admin workflow, local E2E, documentation,
and a separately approved production migration/deploy.

## Completed in this pass

- Added migration `0022_commercial_proposals.sql` with proposal and immutable
  version tables, lifecycle/state checks, foreign keys, and indexes.
- Added `src/proposals/proposal-store.js`:
  - create first draft/version;
  - save next version with stale-write detection;
  - get proposal and versions;
  - list proposals for an order;
  - publish current version;
  - approve only a published current version with explicit confirmation;
  - add one idempotent order-history note on approval.
- Added scoped lifecycle routes:
  - `GET/POST /api/proposals`;
  - `GET /api/proposals/:id`;
  - `POST /api/proposals/:id/publish`;
  - `POST /api/proposals/:id/approve`.
- Added storage/lifecycle/endpoint tests.
- Added new files to the `precheck` command.

## Files changed

- `migrations/0022_commercial_proposals.sql`
- `src/proposals/proposal-store.js`
- `functions/api/proposals.js`
- `functions/api/proposals/[id].js`
- `functions/api/proposals/[id]/publish.js`
- `functions/api/proposals/[id]/approve.js`
- `tests/proposal-store.test.js`
- `tests/proposal-lifecycle-endpoints.test.js`
- `package.json`

## Checks passed

- Proposal storage/lifecycle focused tests: 11 passed.
- Earlier combined storage/template tests: 18 passed before lifecycle additions.
- `npm.cmd run check`: passed after endpoint/core additions.
- `git diff --check`: passed with Windows line-ending warnings only.

## Checks still required

- Re-run `npm.cmd run check` after all remaining edits.
- Run full `npm.cmd test`.
- Apply migration 0022 to local D1 only.
- Run local API lifecycle smoke with a synthetic order.
- Implement and test persisted admin UI (Slice 7).
- Desktop/mobile Playwright verification.
- Reviewer summaries, README, SESSION_NOTES, PROJECT_PROGRESS.md/html.

## Known risks / review points

- Review D1 batch behavior and conflict handling with real local D1.
- Confirm Pages routing has no conflict between `functions/api/proposals.js`
  and the existing `functions/api/proposals/` directory.
- Approval batches proposal status update and order-interaction insert; verify
  atomic behavior in local D1.
- No production migration has been applied.
- No deploy has been made for these WIP changes.

## Exact next commands

```powershell
cd "C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\furniture-orders-mvp"
node --test tests/proposal-store.test.js tests/proposal-lifecycle-endpoints.test.js tests/proposal-preview-endpoint.test.js
npm.cmd run check
git diff --check
```

Then implement Slice 7 from:

```text
docs/external-editor/proposals/proposal-slice7-admin-production.md
```

After UI implementation:

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

## Do not commit or deploy yet

- Do not commit Slices 5/6 as complete until local D1 smoke and full tests pass.
- Do not apply migration 0022 to production without explicit user approval.
- Do not deploy before Slice 7, documentation, and production gate review.
- Do not stage unrelated existing untracked session/handoff files.
