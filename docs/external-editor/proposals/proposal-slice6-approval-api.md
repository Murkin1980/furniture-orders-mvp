# Proposal Slice 6: Publish, Approval, and History Backend

## Goal

Expose the stored proposal lifecycle through protected APIs. Freeze a published
version, require explicit approval, and record approval in order history. Do not
change the admin UI or send anything to a customer.

## Prerequisite

Slice 5 must be merged and reviewed first. Adapt names to its accepted core
contract; do not duplicate storage logic in endpoint files.

## Required implementation

Add protected routes following Cloudflare Pages bracket routing:

- `GET /api/proposals?orderId=:orderId`
- `POST /api/proposals` to create a proposal or save the next draft version;
- `GET /api/proposals/:id`
- `POST /api/proposals/:id/publish`
- `POST /api/proposals/:id/approve`

Suggested files:

- `functions/api/proposals/index.js` only if the repository route convention
  needs it; otherwise use the correct Pages file layout after inspecting
  existing routes;
- `functions/api/proposals/[id].js`;
- `functions/api/proposals/[id]/publish.js`;
- `functions/api/proposals/[id]/approve.js`;
- extend `src/proposals/proposal-store.js` or add a focused lifecycle core;
- focused endpoint/core tests.

## Lifecycle rules

- All routes require scoped admin authorization.
- GET requires read scope; create/save/publish/approve require write scope.
- Publish freezes a selected draft version into `published` state.
- Publishing does not mean approved or sent.
- Approval requires an explicit body such as `{ "confirmed": true }`.
- Approval identifies the exact published version being approved.
- Approval is idempotent for the same version and conflicts for stale versions.
- Approval records a readable `note` interaction through the order-interaction
  core or an equally explicit transactional boundary.
- Approval must never change the normal order status automatically.
- `sent` is not implemented in this slice.
- Server regenerates/validates normalized payload and HTML before publish; it
  never trusts browser HTML.

## Response requirements

Return stable JSON with `success`, proposal identity, current version, lifecycle
status, and safe error/message fields. Do not expose raw SQL errors.

## Tests

Cover at minimum:

- scoped read/write auth boundaries;
- create/save returns stored version;
- order and proposal not found;
- invalid JSON;
- publish freezes the requested version;
- stale publish/approve returns 409-style result;
- approve requires `confirmed: true`;
- approval writes one order-history note and is idempotent;
- approval does not change order status/intake fields;
- no `fetch` or external API;
- existing preview endpoint remains non-persistent and backward compatible.

## Do not do

- no UI;
- no production migration;
- no deploy;
- no customer delivery;
- no PDF package;
- no payment/accounting state;
- no automatic order status updates.

## Completion output

Create `docs/sessions/furniture-proposal-slice6-summary.md`, update required
docs/progress, and stop for review before Slice 7.
