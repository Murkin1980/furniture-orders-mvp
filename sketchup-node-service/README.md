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
  it does not provide an executor by itself.

Endpoints:

- `GET /health`
- `POST /v1/jobs`

The in-memory replay store is intentionally suitable only for local prototype
verification. A durable store and explicit execution adapter are required
before any real SketchUp integration.

`src/execution-adapter.js` is wired into the HTTP service but remains disabled
by default. Execution requires all three gates: the explicit environment flag,
matching per-job manager approval from `getManagerApproval`, and an injected
`executePlan` function. The repository still contains no real
SketchUp/MCP/process executor, and the normal CLI start remains dry-run.
