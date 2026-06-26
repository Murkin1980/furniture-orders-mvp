# CRM Slice 5 WIP handoff

## Current goal

Create a manual Twenty sync core that loads or accepts an order, builds the
versioned sync requests, and executes them sequentially through an injected
sender in tests.

## Completed

- CRM Slice 2: pure order mapper.
- CRM Slice 3: pure request builder.
- CRM Slice 4: guarded injected-only sender.
- Full suite after Slice 4: 176 passed.

## Suggested files

- `src/crm/twenty-sync-core.js`
- `tests/twenty-sync-core.test.js`

## Required behavior

- Accept an order and injected `sendRequest`.
- Build requests through `buildTwentySyncRequests`.
- Execute sequentially: person, opportunity, note.
- Stop safely on the first error and return structured failure metadata.
- Do not mutate the order.
- Do not call global fetch or real Twenty.
- Record created IDs from fake responses when available.

## Remaining contract risk

Twenty APIs are schema-per-tenant. Before any real integration, verify resource
paths, body fields, response shapes, and relation fields in the selected
workspace under `Settings -> API & Webhooks`.

## Do not add in Slice 5

- Endpoint or UI.
- D1 migration or persistence.
- Production credentials or deploy.
- Real API calls.
- Automatic order sync.
- Retry loop after `429`.

## Exact next commands

```powershell
git status --short
node --test tests/send-twenty-request.test.js
npm.cmd test
npm.cmd run check
git diff --check
```

## Do not commit automatically

- Local instruction files.
- External-editor task files.
- WIP handoff files unless the user explicitly asks to keep them in Git.
