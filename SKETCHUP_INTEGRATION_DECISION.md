# SketchUp Integration Decision

Date: 2026-06-15
Status: accepted for staged implementation

## Decision

SketchUp is a separate controlled execution node. The Cloudflare platform must
never send raw OCR output directly to SketchUp.

The integration boundary is a versioned, provider-neutral furniture model:

```text
manager-approved OCR result
-> furniture-model/v1
-> future validated SketchUp command plan
-> explicit manager execution
-> Windows SketchUp/MCP node
-> returned model/render artifact
```

## Slice 1 Contract

`src/sketchup/furniture-model.js` creates `furniture-model/v1` only from an OCR
record with `status=approved`.

The model:

- preserves recognition/order approval audit;
- converts supported measurements to millimeters;
- maps only explicit width/height/depth aliases;
- keeps components as semantic labels without invented geometry;
- preserves materials, notes, warnings, and missing information;
- marks `readyForSketchUp=true` only when width, height, and depth exist.

Unknown units, missing dimensions, and ambiguous data block readiness instead
of being guessed.

## Slice 2 Contract

`src/sketchup/command-plan.js` converts only a ready `furniture-model/v1` into
`sketchup-command-plan/v1`.

The plan contains exactly three declarative allowlisted commands:

- `set_units` to millimeters;
- `create_envelope` using confirmed overall width, height, and depth;
- `attach_metadata` for furniture type, component labels, materials, and notes.

The validator rejects unknown command types, extra command fields, incomplete
dimensions, unsupported versions, and missing source audit. Components remain
metadata only; no component geometry, positions, Ruby, or executable code are
generated.

## Slice 3 Contract

`src/sketchup/node-job.js` wraps only a valid `sketchup-command-plan/v1` in a
short-lived `sketchup-node-job/v1` contract.

The job:

- requires an explicit safe job ID;
- preserves order, recognition, model, and plan versions;
- includes a deterministic idempotency key;
- expires after five minutes by default and never exceeds fifteen minutes;
- contains a stable canonical signature input;
- marks the future HMAC-SHA256 signature slot as intentionally empty.

Validation detects source mismatch, payload tampering, expiry, unsafe identity
fields, unsupported contracts, and unverified signature values. Slice 3 does
not sign or send the job.

## Slice 4 Contract

`src/sketchup/node-client.js` performs one injected fake-node request after
revalidating the complete job contract.

The client:

- requires `sendNodeRequest` injection and never falls back to global fetch;
- rejects invalid and expired jobs before sender access;
- calls the injected sender at most once and never retries;
- sends a cloned job so the caller input is not mutated;
- accepts only matching `jobId` responses with `accepted` or `rejected`
  status;
- returns a normalized, non-throwing result.

No real node URL, transport, signature, MCP process, or SketchUp process is
connected.

## Slice 5 Contract

`src/sketchup/node-auth.js` signs and verifies only the canonical node-job
signature input using HMAC-SHA256 through Web Crypto.

The signing boundary:

- requires an explicit secret of at least 32 characters;
- never stores or returns the secret;
- verifies signatures through `crypto.subtle.verify`;
- keeps unsigned validation fail closed unless signed validation is explicitly
  requested;
- builds a transport-neutral HTTPS request object without calling fetch;
- rejects unsigned jobs and insecure node URLs.

No sender, real node URL, endpoint, or production secret is configured.

## Slice 6 Contract

`src/sketchup/node-http.js` sends only a prebuilt signed HTTPS request through
an injected `fetchFn`.

It never falls back to global fetch, calls the sender once, never retries
including on HTTP 429, and normalizes authorization, rate-limit, server,
invalid-response, and network errors.

## Slice 7 Contract

`POST /api/orders/:id/sketchup/jobs` is a manual, operations-scoped endpoint
backed by `src/sketchup/order-job-core.js` and migration
`0020_sketchup_jobs.sql`.

The endpoint requires explicit manager confirmation, manager identity, and a
specific approved OCR recognition. A `pending` audit row is saved before any
sender access, then updated to `accepted`, `rejected`, or `failed`. Audit
storage excludes HMAC signatures and signing secrets.

The endpoint accepts only an injected sender in this slice. It cannot call a
real node or global fetch, and migration `0020` remains unapplied.

## Slice 8 Contract

`src/sketchup/fake-node.js` models the receiving Windows-node trust boundary
without starting SketchUp.

It verifies HMAC and expiry before idempotency access, requires an injected
replay store, rejects duplicate jobs, and returns a non-executable dry-run
summary. Every accepted response explicitly contains `executed=false`.

## Slice 9A Contract

`sketchup-node-service` is a separate Node.js HTTP wrapper intended for local
Windows prototype verification. It exposes `GET /health` and `POST /v1/jobs`,
binds to `127.0.0.1` by default, requires a signing secret, limits JSON body
size, verifies transport headers, and uses the Slice 8 fake-node contract.

Its replay store is in memory and every accepted job remains a dry-run with
`executed=false`. It does not start SketchUp, MCP, Ruby, or another process.

## Slice 9B Contract

`sketchup-node-service/src/execution-adapter.js` defines a disabled-by-default
injected executor boundary. Enabling the function alone is insufficient: it
also requires explicit manager approval matching the job, manager identity,
approval time, and an injected executor.

The adapter is not connected to the HTTP service. No real SketchUp, MCP, Ruby,
child process, or filesystem executor exists in the repository.

## Slice 10 Contract

`src/sketchup/render-artifact.js` defines `sketchup-render-artifact/v1` and a
pure future order-attachment payload. It accepts only allowlisted model/image
media types, relative storage keys, positive byte counts, and SHA-256 hashes.

The contract does not write files, upload to R2, add an endpoint or migration,
or attach anything to a production order.

## Slice 11 Contract

`src/sketchup/render-core.js`, migration
`0021_sketchup_render_artifacts.sql`, and
`POST /api/orders/:id/sketchup/render-artifacts` persist validated render
artifact manifests for accepted SketchUp jobs.

The endpoint:

- requires operations scope;
- accepts only JSON metadata, not binary files;
- requires the referenced `sketchup_jobs` row to belong to the order and have
  status `accepted`;
- reuses the strict `sketchup-render-artifact/v1` validator;
- stores the manifest, primary render storage key, optional model storage key,
  and reporter audit;
- is idempotent by `jobId`.

It still does not upload to R2, generate renders, start SketchUp, call MCP, or
apply production migrations.

## Slice 12 Contract

`src/sketchup/render-file.js` and
`POST /api/orders/:id/sketchup/render-files` define a guarded upload boundary
for already generated SketchUp model, preview, or render files.

The endpoint:

- requires operations scope;
- accepts only multipart form-data;
- requires `SKETCHUP_RENDER_BUCKET`;
- checks that the referenced job belongs to the order and has status
  `accepted`;
- allows only role/media-type pairs accepted by `sketchup-render-artifact/v1`;
- limits files to 50 MB;
- computes SHA-256 and returns a file descriptor that can be used in the
  render artifact manifest.

It does not generate files, start SketchUp, call MCP, or automatically attach
the uploaded file to an order.

## Slice 13A Contract

The Windows HTTP service now connects its existing execution adapter after the
signed-job, expiry, transport, and replay checks pass.

Execution remains fail closed and requires all three gates:

- `SKETCHUP_NODE_EXECUTION_ENABLED=true`;
- matching per-job manager approval from an injected `getManagerApproval`;
- an injected `executePlan` executor.

Without the environment flag the service remains dry-run. Without approval or
an executor the job is rejected without execution. The repository still does
not contain or start SketchUp, MCP, Ruby, child processes, or a renderer.

## Safety Boundaries

- No MCP call.
- No SketchUp process or plugin.
- No generated Ruby commands.
- No automatic model creation.
- No production-enabled transport, applied migration, UI, deploy, or production
  setting change.
- Only manager-approved OCR data can cross the mapping boundary.

## Future Slices

1. Pure approved OCR -> `furniture-model/v1` mapper. Complete.
2. Pure validated command-plan builder without MCP/network calls. Complete.
3. SketchUp node request builder and signature-ready job contract. Complete.
4. Injected client and local fake-node smoke. Complete.
5. Pure HMAC signing/verification and request builder without fetch. Complete.
6. Injected HTTPS sender with no global fallback and no retries. Complete.
7. Manual protected endpoint and job audit storage. Complete in code; migration unapplied.
8. Pure fake Windows execution-node contract with replay protection. Complete.
9. Windows service wrapper and SketchUp/MCP prototype with explicit manager execution. Safe wrapper and disabled injected-adapter contract complete; real adapter pending.
10. Render artifact return and order attachment. Pure contract complete.
11. Persist render artifact metadata for accepted jobs. Complete in code; migration unapplied.
12. Guarded render file upload to R2. Complete in code; production binding not configured here.
13. Gated HTTP-to-executor wiring. Slice 13A complete; real Windows
    SketchUp/render executor remains pending.
14. Real render generation and production attachment flow. Pending approved
    executor and operational setup.
