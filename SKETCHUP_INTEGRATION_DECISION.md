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

## Safety Boundaries

- No MCP call.
- No SketchUp process or plugin.
- No generated Ruby commands.
- No automatic model creation.
- No endpoint, UI, migration, deploy, or production change.
- Only manager-approved OCR data can cross the mapping boundary.

## Future Slices

1. Pure approved OCR -> `furniture-model/v1` mapper. Complete.
2. Pure validated command-plan builder without MCP/network calls. Complete.
3. SketchUp node request builder and signature-ready job contract. Complete.
4. Injected client and local fake-node smoke.
5. Manual protected endpoint and job audit storage.
6. Windows SketchUp/MCP prototype with explicit manager execution.
7. Render artifact return and order attachment.
