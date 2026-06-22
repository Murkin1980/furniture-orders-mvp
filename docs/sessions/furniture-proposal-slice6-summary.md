# Proposal Slice 6 - Lifecycle API

## Result

- Added scoped list/create, detail, publish, and approval endpoints.
- Publishing freezes the current draft version.
- Approval requires explicit confirmation of the exact published version.
- Approval writes one idempotent order-history entry and does not change order status.
- No dependency, external API, or autonomous action was added.

## Verification

- Endpoint and core lifecycle tests passed.
- Local D1 create, save, publish, approve, and history smoke passed.
- Production was not changed.
