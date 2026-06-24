# Furniture SketchUp Node Service

Local Windows-side dry-run receiver for signed `sketchup-node-job/v1` jobs.
It validates transport headers, HMAC, expiry, command-plan shape, and replay
protection. It does not start SketchUp, MCP, Ruby, or any executable command.
The optional Ruby file in this package is a queue contract finalizer for a
future local SketchUp extension; the Node service does not invoke it.

## Local start

PowerShell:

```powershell
$env:SKETCHUP_NODE_SIGNING_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
npm.cmd --prefix sketchup-node-service start
```

Defaults:

- host: `127.0.0.1`
- port: `8790`
- maximum JSON body: `262144` bytes
- mode: `dry-run`

Optional variables:

- `SKETCHUP_NODE_HOST`
- `SKETCHUP_NODE_PORT`
- `SKETCHUP_NODE_MAX_BODY_BYTES`
- `SKETCHUP_NODE_EXECUTION_ENABLED=true` enables only the gated adapter path;
  the CLI then uses the local file-queue bridge.
- `SKETCHUP_NODE_QUEUE_DIR` is an absolute local directory required in gated
  mode.
- `SKETCHUP_NODE_QUEUE_TIMEOUT_MS` defaults to `120000`.
- `SKETCHUP_NODE_QUEUE_POLL_MS` defaults to `500`.

Endpoints:

- `GET /health`
- `POST /v1/jobs`

The in-memory replay store is intentionally suitable only for local prototype
verification. A durable store and explicit execution adapter are required
before any real SketchUp integration.

`src/execution-adapter.js` is wired into the HTTP service but remains disabled
by default. Execution requires all three gates: the explicit environment flag,
matching per-job manager approval from `getManagerApproval`, and an injected
`executePlan` function.

When gated mode is explicitly enabled, `src/runtime.js` provides a local
file-queue adapter:

```text
approvals/{jobId}.json  manager approval written out of band
inbox/{jobId}.json      validated command plan for the SketchUp plugin
outbox/{jobId}.json     plugin result with safe artifacts/... references
```

Files are created atomically and paths/job IDs are constrained. The bridge does
not start a process, load an `.skp`, execute Ruby, or render by itself. A local
SketchUp 2026 Ruby extension must consume the inbox and create the outbox
result. EasyKitchen Demo may be used only inside that licensed local SketchUp
environment; its library files must not be copied into this repository or R2.

## Ruby queue contract finalizer

`ruby/queue_consumer_contract.rb` is a minimal fail-closed helper intended to
run inside, or beside, a future local SketchUp 2026 Ruby extension after that
extension has generated real files. It:

- reads `inbox/{jobId}.json`;
- checks the bridge version, job ID, manager identity, command-plan version, and
  the allowlisted command types;
- reads matching `approvals/{jobId}.json`;
- requires an existing `artifacts/{jobId}/model.skp`;
- requires at least one existing preview or render image;
- atomically writes a render-ready `outbox/{jobId}.json`.

It does not create geometry, call SketchUp APIs, call EasyKitchen, shell out,
upload files, or generate fake artifacts. If Ruby is not installed in the local
development environment, the Node test suite still checks the script's safety
markers; when Ruby is available, the same test also performs a runtime smoke.

## Manual SketchUp envelope consumer

`ruby/sketchup_envelope_consumer.rb` is a first manual SketchUp-side scaffold.
It is intended to be loaded inside SketchUp 2026 Ruby Console or a reviewed
local extension:

```ruby
load "C:/path/to/sketchup-node-service/ruby/sketchup_envelope_consumer.rb"
FurniturePlatform::SketchUpEnvelopeConsumer.run(
  queue_dir: "C:/FurnitureQueue",
  job_id: "job-example-001"
)
```

The consumer:

- requires the SketchUp Ruby API to exist;
- validates the same inbox request and matching approval boundary;
- accepts only the three allowlisted commands from `sketchup-command-plan/v1`;
- creates a simple confirmed overall envelope from `create_envelope`;
- stores metadata from `attach_metadata` on the generated group;
- writes `artifacts/{jobId}/model.skp`;
- writes `artifacts/{jobId}/preview.png`;
- writes render-ready `outbox/{jobId}.json`.

This is not a full furniture generator. It does not place cabinets, doors,
shelves, hardware, EasyKitchen components, materials, dimensions, or final
photorealistic renders. Dynamic component placement remains a future local
SketchUp/EasyKitchen adapter step.

Legacy outbox response:

```json
{
  "jobId": "job-example-001",
  "status": "executed",
  "executed": true,
  "artifact": {
    "type": "skp",
    "reference": "artifacts/job-example-001/model.skp"
  }
}
```

3D render-ready outbox response:

```json
{
  "jobId": "job-example-001",
  "status": "executed",
  "executed": true,
  "artifacts": [
    {
      "type": "skp",
      "reference": "artifacts/job-example-001/model.skp"
    },
    {
      "type": "preview",
      "reference": "artifacts/job-example-001/preview.webp"
    },
    {
      "type": "render",
      "reference": "artifacts/job-example-001/render-main.webp"
    }
  ]
}
```

When `artifacts[]` is used, the response must include a safe `skp` reference
and at least one `preview` or `render` reference. This keeps model generation
and render generation explicit while preserving the older single-SKP response.
