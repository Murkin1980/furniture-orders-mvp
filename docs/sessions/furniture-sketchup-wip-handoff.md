# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- SketchUp Slice 2 defines and validates `sketchup-command-plan/v1`.
- SketchUp Slice 3 defines short-lived, signature-ready `sketchup-node-job/v1`.
- SketchUp Slice 4 adds an injected, single-attempt fake-node client and local
  accepted/rejected/error smoke.
- Only manager-approved OCR records and ready furniture models can cross these
  boundaries.
- No SketchUp/MCP execution path exists.

## Next safe slice

Build pure HMAC signing/verification and request builder that:

- signs only the canonical `signatureInput` using an injected secret;
- verifies signatures with constant-time comparison where available;
- creates a transport-neutral request object without fetch;
- keeps the secret out of returned jobs and logs;
- performs no real SketchUp/MCP call.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not add automatic execution, endpoint, migration, deploy, or production
  settings.
- Do not commit unrelated existing handoff files.
