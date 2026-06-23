# Proposal and Portfolio Smoke Completion Prep

## Scope

This pass prepared the remaining production verification path for:

- Commercial proposals.
- Portfolio/media uploads.

## Changes

- Added `scripts/proposal-lifecycle-smoke.mjs`.
- Extended production preflight with a `proposal` target.
- Added proposal/portfolio smoke env placeholders to `.env.example`.
- Updated portfolio ops documentation with the explicit production write gate.
- Updated README, `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html`, and
  `SESSION_NOTES.md`.

## Proposal Smoke Contract

The proposal smoke runner:

1. Uses `PROPOSAL_SMOKE_BASE_URL` and `PROPOSAL_SMOKE_ADMIN_TOKEN`.
2. Creates a synthetic order when `PROPOSAL_SMOKE_ORDER_ID` is absent.
3. Creates proposal version 1.
4. Saves proposal version 2 with stale-write protection.
5. Publishes the current version.
6. Approves the exact published version.
7. Verifies the order-history audit note.

It does not print or store the admin token.

## Portfolio/Media Production State

Read-only checks on 2026-06-23 confirmed:

- Remote D1 contains `portfolio_items` and `portfolio_images`.
- R2 bucket `furniture-portfolio-media` exists in `EEUR`.
- Public `/api/portfolio` returns `200`.
- Missing `/media/portfolio/nonexistent-smoke.webp` returns controlled
  `404 media_not_found`.
- Bucket was empty during the read-only check.

## Checks

- `node --check scripts/proposal-lifecycle-smoke.mjs` passed.
- `node --test tests/production-smoke-preflight.test.js` passed.
- Focused proposal/portfolio tests passed: 26 tests.
- `npm.cmd run check` passed.

## Remaining Gate

Production write-smokes were not run because they create synthetic production
records/objects. Run them only after explicit approval:

- One synthetic commercial proposal lifecycle smoke.
- One temporary portfolio upload smoke with a synthetic image.
