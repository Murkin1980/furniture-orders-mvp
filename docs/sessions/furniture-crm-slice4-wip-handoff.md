# CRM Slice 4 WIP handoff

## Current goal

Add `sendTwentyRequest(request, options = {})` with injected `fetchFn`, without
adding endpoint, UI, migration, deploy, or production integration.

## Completed

- CRM Slice 2 pure mapper exists.
- CRM Slice 3 pure request builder exists and builds versioned request objects.
- Draft resource paths are `/rest/people`, `/rest/opportunities`, and
  `/rest/notes`.

## Files changed in CRM Slice 3

- `src/crm/twenty-request-builder.js`
- `tests/twenty-request-builder.test.js`
- `package.json`
- project documentation and reviewer summary

## Checks passed

- Targeted request-builder tests: 9 passed.
- Full suite: 165 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before final documentation edits.

## Required before Slice 4 coding

- Verify the draft resource paths and expected response shapes against the
  selected workspace documentation in `Settings -> API & Webhooks`.
- Official overview confirms schema-per-tenant `/rest/` APIs and Bearer auth:
  `https://docs.twenty.com/developers/extend/api`.
- Keep all tests on injected fake `fetchFn`.

## Slice 4 boundaries

- Add sender and tests only.
- Handle success JSON, authorization errors, rate limits, provider errors,
  invalid JSON, and network errors.
- Stop immediately on HTTP 429; do not retry in a tight loop.
- Do not add endpoint, UI, migration, deploy, production credentials, or real
  API calls.

## Exact next commands

```powershell
git status --short
node --test tests/twenty-request-builder.test.js
npm.cmd test
npm.cmd run check
git diff --check
```

## Do not commit automatically

- Local instruction files.
- External-editor task files.
- This WIP handoff unless the user explicitly asks to keep it in Git.
