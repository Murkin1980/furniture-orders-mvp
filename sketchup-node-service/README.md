# Furniture SketchUp Node Service

Local Windows-side dry-run receiver for signed `sketchup-node-job/v1` jobs.
It validates transport headers, HMAC, expiry, command-plan shape, and replay
protection. It does not start SketchUp, MCP, Ruby, or any executable command.

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
outbox/{jobId}.json     plugin result with a safe artifacts/.../*.skp reference
```

Files are created atomically and paths/job IDs are constrained. The bridge does
not start a process, load an `.skp`, execute Ruby, or render by itself. A local
SketchUp 2026 Ruby extension must consume the inbox and create the outbox
result. EasyKitchen Demo may be used only inside that licensed local SketchUp
environment; its library files must not be copied into this repository or R2.
