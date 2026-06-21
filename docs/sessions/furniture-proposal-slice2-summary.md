# Proposal Slice 2 - Order Draft Mapper

## Result

Added a pure mapper that prepares an editable commercial-proposal draft from
an order without treating lead budget or calculator estimate as an approved
commercial price.

## Safety

- Order budget is stored only in `meta.referenceBudget`.
- Calculator estimate is stored only in `meta.calculator`.
- The initial proposal line has `unitPrice: 0` and
  `requiresManagerPricing: true`.
- Invalid/empty raw payloads fail safely.
- Inputs are not mutated.
- No endpoint, UI, migration, deploy, or dependency was added.

## Verification

- Focused mapper tests: 6 passed.
- `npm.cmd run check`: passed.
- Full project tests: 443 passed.
- `git diff --check`: passed with Windows line-ending warnings only.
