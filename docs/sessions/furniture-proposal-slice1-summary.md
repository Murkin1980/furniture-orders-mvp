# Proposal Slice 1 - Printable Template

## Result

Added a reusable A4 commercial-proposal template based on the reviewed TUBA
document structure. It supports structured company/customer data, itemized
specification, automatic KZT totals, configurable terms, and a signature block.

## Safety and scope

- No TUBA logo or customer data was copied.
- Real source prices and terms are not used as defaults.
- Tax wording is explicit input rather than an inferred claim.
- HTML content is escaped and unsafe logo protocols are rejected.
- No endpoint, UI, D1 migration, deploy, or dependency was added.

## Verification

- Focused tests cover calculations, overrides, A4 structure, escaping, logo
  safety, and empty input.
- The synthetic JSON example generates standalone printable HTML.
- Focused tests: 6 passed.
- `npm.cmd run check`: passed.
- Full project tests: 437 passed.
- `git diff --check`: passed with Windows line-ending warnings only.
- Generated HTML and one-page A4 PDF were visually inspected: Cyrillic,
  seven-column table, totals, terms, and signature render without clipping.
