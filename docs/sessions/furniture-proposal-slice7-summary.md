# Proposal Slice 7 - Persisted Admin Workflow

## Result

- The proposal workspace restores saved versions and their immutable HTML.
- Added save draft, publish version, and explicit approval controls.
- Lifecycle labels and button states distinguish draft, published, and approved proposals.
- Existing preview, HTML download, Print to PDF, and reference-only budget behavior remain intact.
- Errors preserve the manager's current form data.

## Verification

- Focused proposal/admin tests passed: 28 tests.
- Full project suite passed: 466 tests.
- `npm.cmd run check` passed before the final documentation pass.
- Desktop 1440x1000 and mobile 390x844 Playwright smoke passed without horizontal overflow.
- Browser console had no errors.
- Production migration and deploy remain pending explicit approval.
