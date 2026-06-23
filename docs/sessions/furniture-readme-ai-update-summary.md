# README AI Update Summary

## Goal

Synchronize the repository README and AI setup guide with the implemented manual AI analysis layer and verified local smoke-test behavior.

## Updated

- Documented the manual-only AI analyze endpoint and admin flow.
- Added supported providers, environment variables, AI source files, tests, and migration `0011`.
- Documented safe failed-result behavior for missing keys, authorization errors, rate limits, provider failures, and invalid responses.
- Recorded that successful provider analysis is still pending because the current OpenAI project returned HTTP 429.
- Clarified that production AI and production migration `0011` remain disabled.
- Corrected local AI smoke-test startup instructions to use configured D1 `furniture_orders` without the `--d1 DB` override.

## Files Changed

- `README.md`
- `docs/runbooks/AI_SETUP.md`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-readme-ai-update-summary.md`

## Boundaries

- No code, UI, endpoint logic, migration, dependency, deployment, or production configuration was changed.

## Verification

- `npm.cmd test` - 137 tests passed.
- `npm.cmd run check` - passed.
- `git diff --check` - passed.
