# Commercial Proposals: External Editor Handoff

Current baseline: Proposal Slices 1-4 are complete on `main`.

Implemented:

- safe order-to-draft mapping;
- print-ready A4 HTML renderer;
- protected non-persistent preview endpoint;
- admin manager form with explicit line prices and terms;
- HTML download and browser Print to PDF;
- order budget remains reference-only.

Current commit before this handoff: `e64072f`.

## Required reading

Read only these files before changing code:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `SESSION_NOTES.md` (latest Proposal entries)
4. `COMMERCIAL_PROPOSAL_TEMPLATE.md`
5. `src/proposals/commercial-proposal-template.js`
6. `src/proposals/order-proposal-mapper.js`
7. `functions/api/proposals/preview.js`
8. `public/admin-proposals.js`
9. Proposal tests under `tests/`

## Remaining sequence

Work strictly in order and stop after each slice for review:

1. [Slice 5: versioned D1 storage](proposal-slice5-storage.md)
2. [Slice 6: publish, approval, and history backend](proposal-slice6-approval-api.md)
3. [Slice 7: persisted admin workflow and production readiness](proposal-slice7-admin-production.md)

Use [the comparison checklist](comparison-checklist.md) after every slice.

## Global boundaries

- Work only in `furniture-orders-mvp`; do not create another repository.
- Do not touch live-site repositories.
- Do not apply production migrations.
- Do not deploy unless the slice explicitly reaches its deploy gate.
- Do not infer tax status, legal terms, warranty, schedule, or prices.
- Never copy order budget or calculator estimate into an approved line price.
- Published versions are immutable.
- `published` means a frozen document version, not approved, sent, or paid.
- Failed proposal work must not change the order intake flow or order status.
- Add no dependencies.
- Do not call external APIs or add automatic customer delivery.
- Use scoped auth from `src/auth.js`; proposal writes require write scope.
- Update `README.md`, `SESSION_NOTES.md`, `PROJECT_PROGRESS.md`, and
  `PROJECT_PROGRESS.html` after each completed slice.
- Add one reviewer summary under `docs/sessions/` per completed slice.
- Run focused tests, `npm.cmd test`, `npm.cmd run check`, and
  `git diff --check` before reporting completion.

## Comparison rule

Do not rewrite the existing renderer or admin shell merely to demonstrate a
different style. The comparison is about correctness, boundaries, tests,
reviewability, and manager workflow quality.
