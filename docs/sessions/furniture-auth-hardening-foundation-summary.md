# Auth Hardening Foundation Summary

Date: 2026-06-14

## Completed

- Added pure shared authorization primitives in `src/auth.js`.
- Defined explicit `read`, `write`, and `ops` scopes.
- Defined safe scope hierarchy:
  - write credentials may perform read actions;
  - read credentials cannot write;
  - operations credentials cannot access normal business endpoints;
  - admin read/write credentials cannot perform operations.
- Added temporary legacy `ADMIN_TOKEN` fallback for a later staged migration.
- Added focused tests for token extraction, scope boundaries, missing
  configuration, invalid credentials, and legacy fallback.

## Safety

- No endpoint uses the new helper yet.
- No UI, production secret, deployment, migration, or business behavior changed.

## Checks

- Focused auth tests: 7 passed.
- Full project tests: 223 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Next

- Migrate one representative read, write, and operations endpoint with focused
  tests before migrating the remaining endpoint groups.
