# Documentation Restructure Summary

Date: 2026-06-23

## Scope

Reduced root repository documentation clutter after repo review feedback.

## Changes

- Moved long-form architecture/product decision documents to
  `docs/decisions/`.
- Moved setup, readiness, media ops, and troubleshooting runbooks to
  `docs/runbooks/`.
- Moved the commercial proposal template specification to `docs/templates/`.
- Added README index files for `docs/decisions/`, `docs/runbooks/`, and
  `docs/templates/`.
- Updated active references in root docs, session summaries, and internal docs.
- Kept active entrypoint/control docs in the root:
  `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `DATA_SOURCES.md`, `LIVE_SITES.md`,
  `PROJECT_MAP.md`, `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html`,
  `README.md`, and `SESSION_NOTES.md`.

## Not Changed

- No runtime code changed.
- No API, UI, migration, deploy, database, or Cloudflare setting changed.
- Ignored local zips/logs/dev env files were not removed in this commit.

## Checks

- Path/reference search passed.
- `npm.cmd run check` passed.
- `npm.cmd test` passed with 501 tests.
- `git diff --check` passed with line-ending warnings only.

## Next

Continue Project PDF Intelligence storage design.
