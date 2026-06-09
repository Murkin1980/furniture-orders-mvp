# External runtime archives code review

Date: 2026-06-09
Reviewed package: `furniture-orders-mvp-phase-6-admin-demo.zip`
Review method: archive inventory, cumulative phase comparison, final-state source review, tests, and syntax checks

## Verdict

The archives form a coherent cumulative prototype, but they must not be merged wholesale into the current Cloudflare/D1 `furniture-orders-mvp` repository.

The Phase 6 package is useful as a donor/reference implementation for pure landing, calculator, notification, and local-runtime ideas. It is not safe for public deployment and is not a replacement for the current production architecture.

## Ordered archive chain

Use this order when reviewing historical changes:

```text
furniture-orders-mvp.zip                  -> initial / Slice 1-2A foundation
furniture-orders-mvp-slice-1-2B.zip
furniture-orders-mvp-slice-1-2C.zip
furniture-orders-mvp-slice-1-2D.zip
furniture-orders-mvp-slice-1-2E.zip
furniture-orders-mvp-slice-1-2F.zip
furniture-orders-mvp-slice-1-2G.zip
furniture-orders-mvp-slice-1-2H.zip
furniture-orders-mvp-slice-1-2I.zip
furniture-orders-mvp-slice-1-2J.zip
furniture-orders-mvp-slice-1-2K.zip
furniture-orders-mvp-slice-1-2L.zip
furniture-orders-mvp-slice-1-2M.zip
furniture-orders-mvp-slice-1-2T.zip       -> cumulative Stage 1 result
furniture-orders-mvp-phase-2-runtime.zip
furniture-orders-mvp-phase-3-telegram.zip
furniture-orders-mvp-phase-4-whatsapp.zip
furniture-orders-mvp-phase-5-persistence.zip
furniture-orders-mvp-phase-6-admin-demo.zip -> latest cumulative package
```

Archives `1-2N` through `1-2S` were not provided separately. Their cumulative result appears in `1-2T`.

## Findings

### Critical - Request body can override messaging safety and exfiltrate configured secrets

`src/runtime-api.js:166-215` exposes notification execution routes without authentication. Request body values override configured `dryRun`, `apiBaseUrl`, and related sending settings.

The configured Telegram bot token is then included in the request URL in `src/telegram-runtime.js:132-140`. The configured WhatsApp access token is sent as an Authorization header in `src/whatsapp-runtime.js:179-190`.

If the server becomes reachable outside the trusted local machine, an attacker can:

- set `dryRun: false`;
- set an attacker-controlled `apiBaseUrl`;
- trigger execution;
- receive the configured Telegram token in the URL or WhatsApp token in the Authorization header;
- trigger arbitrary or pending messages.

Required fix before any non-local use:

- never accept credentials, API base URLs, or dry-run overrides from HTTP request bodies;
- keep provider settings server-side only;
- require admin authentication for every execution route;
- allowlist exact provider hosts;
- add tests proving request bodies cannot override secrets or provider URLs.

### High - Admin, customer data, and mutation endpoints have no authentication

`src/runtime-api.js:71-123` exposes:

- `/admin`;
- `/api/admin/summary`;
- `/api/demo-state`;
- persistence status/save/load.

`/api/demo-state` returns the complete runtime state and persistence snapshot, including customer/order information. Admin summary includes customer phone data. Mutation routes for worker execution, callbacks, persistence, Telegram, and WhatsApp are also unprotected.

`src/runtime-api.js:324-337` adds `Access-Control-Allow-Origin: *`, allowing any website opened in the same browser to read or call these routes when the runtime is reachable.

Required fix:

- separate public and admin route groups;
- add admin authentication;
- remove or strictly protect `/api/demo-state`;
- restrict CORS to explicitly configured origins;
- add authorization tests for every protected endpoint.

### High - Telegram callback validation fails open

The default Telegram webhook secret is empty in `src/runtime-config.js:15`.

`src/telegram-runtime.js:179-182` treats an empty expected secret as valid for every request. Therefore `/api/telegram/webhook` can change order and workflow state when no secret is configured.

Additionally, `POST /api/telegram/callback` in `src/runtime-api.js:262-279` performs callback handling without webhook-secret validation at all.

Required fix:

- reject webhook requests when the secret is not configured;
- remove the unprotected callback route or make it test-only/admin-authenticated;
- validate expected Telegram chat/user IDs before applying manager actions.

### High - Request bodies have no size limit

`src/runtime-api.js:313-321` reads every request chunk into memory with no maximum body size.

Any reachable endpoint can be used for memory exhaustion with a large body.

Required fix:

- enforce a small explicit JSON body limit;
- return HTTP `413`;
- abort the request as soon as the limit is exceeded;
- add oversized-body tests.

### High - JSON persistence can silently destroy valid runtime state

`src/json-file-store.js:115-121` silently returns fallback state for invalid JSON.

`reloadFromFile()` at `src/json-file-store.js:59-65` immediately calls `replaceState()`. With auto-save enabled, this writes the fallback empty state back to disk. A damaged or partially written file can therefore cause silent data loss.

Writes at `src/json-file-store.js:125-135` are synchronous and non-atomic. A crash during write can leave a truncated file.

Required fix:

- distinguish missing file from invalid/corrupt file;
- never replace current state after a corrupt-file load;
- write to a temporary file, fsync if appropriate, then atomically rename;
- retain a backup;
- surface load errors instead of silently returning empty state.

### Medium - Pricing result history is overwritten per calculator

`src/in-memory-store.js:156-165` uses `calculatorId` as the unique key for pricing results.

Multiple orders created from the same calculator overwrite the previous standalone pricing result. This makes pricing history and admin totals inaccurate.

Required fix:

- identify pricing results by their own ID or order ID;
- keep calculator ID as a non-unique relationship field;
- add a test with two orders using the same calculator.

### Medium - Archive and Git handoff are not reviewable or clean

Every archive contains 79 `.git` entries. The final archive's embedded repository has only 13 tracked files and 61 modified/untracked worktree entries. Its history contains only two early commits:

```text
9ebfc2a Update SESSION_NOTES.md with landing brief foundation entry
e785e78 Initial repository structure with site-brief module
```

Most Phase 2-6 implementation is not committed, so provenance and per-phase diffs cannot be reliably audited from Git.

Required fix:

- do not include `.git/` in handoff archives;
- produce archives from a clean committed tree;
- use one intentional commit per phase or provide clean patches;
- include a manifest with commit hash, tests, and changed files.

### Architectural blocker - This is a separate runtime branch, not the current main application

The archive uses:

- a standalone Node HTTP server;
- in-memory/JSON-file persistence;
- a local unauthenticated admin demo.

The current main project uses:

- Cloudflare Pages Functions;
- D1;
- the existing authenticated admin/API contracts;
- production deployment paths already documented in the main repository.

Several filenames overlap while implementing different contracts, including `src/sites-core.js`, `src/calculators-core.js`, `src/calculators-pricing.js`, and `src/orders-core.js`.

Required integration approach:

- do not overwrite main-repository files;
- treat archive modules as donors;
- port only reviewed pure functions or tests in small slices;
- keep the current Cloudflare/D1 architecture as source of truth.

## Positive observations

- Final Phase 6 tests pass: `227/227`.
- `npm.cmd run check` passes.
- Dry-run defaults are enabled for Telegram and WhatsApp.
- Pure normalization and validation modules have broad focused test coverage.
- Phase growth is monotonic: final Phase 6 is the correct cumulative archive to retain for reference.
- Admin HTML escapes customer/event values before inserting them into `innerHTML`; no direct stored-XSS finding was confirmed in the reviewed rendering path.

## Verification performed

```text
npm.cmd test       -> 227 tests passed
npm.cmd run check  -> passed
git diff --check   -> passed
```

Inventory:

- 20 cumulative archives reviewed by manifest.
- Final Phase 6: 28 source files, 26 test files.
- Every archive contains 79 embedded `.git` entries.

## Recommended next action

1. Keep only `furniture-orders-mvp-phase-6-admin-demo.zip` as the cumulative donor/reference archive.
2. Do not deploy it or merge it wholesale.
3. Prioritize the current main-repository landing/calculator completion plan.
4. Review and selectively port these low-risk donor pieces first:
   - `src/site-brief.js` and tests;
   - pure calculator tariff/options/summary ideas;
   - pure notification planning ideas only if needed later.
5. Do not port the standalone runtime/admin/persistence layer before its security issues are fixed and an explicit architecture decision is made.
