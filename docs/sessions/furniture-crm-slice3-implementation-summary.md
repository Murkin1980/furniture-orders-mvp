# CRM Slice 3 implementation summary

Date: 2026-06-11

## Goal

Create a pure Twenty CRM request builder without network calls, UI, endpoints,
migrations, dependencies, deploy, or production changes.

## Completed

- Added `src/crm/twenty-request-builder.js`.
- Added request objects for `person`, `opportunity`, and `note` resources.
- Added `buildTwentySyncRequests(order, env)` on top of the existing mapper.
- Added request contract version `TWENTY_REQUEST_VERSION = 1`.
- Added required base URL validation and optional Bearer authorization.
- Added defensive cloning so input orders and payloads are not mutated.
- Added nine focused tests and included the module in `npm run check`.

## Contract

Each request contains:

```text
resource
url
method: POST
headers
body
```

Draft resource paths:

```text
/rest/people
/rest/opportunities
/rest/notes
```

These paths must be verified against the selected installed Twenty version
before a sender is allowed to make requests.

Twenty's official API documentation confirms `/rest/` CRUD and Bearer
authentication, but also states that endpoints are generated from each
workspace schema. The exact resource and relation contract must therefore be
verified in the target workspace API documentation before Slice 4.

## Checks

- Targeted tests: 9 passed.
- Full suite: 165 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

## Safety

- No `fetch` or external API call.
- No credentials hardcoded.
- No endpoint, UI, migration, deploy, or production change.
- No donor or live-site repository touched.
