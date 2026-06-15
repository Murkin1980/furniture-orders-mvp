# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- SketchUp Slice 2 defines and validates `sketchup-command-plan/v1`.
- SketchUp Slice 3 defines short-lived, signature-ready `sketchup-node-job/v1`.
- SketchUp Slice 4 adds an injected, single-attempt fake-node client and local
  accepted/rejected/error smoke.
- SketchUp Slice 5 adds Web Crypto HMAC signing/verification and a signed HTTPS
  request builder without fetch.
- Only manager-approved OCR records and ready furniture models can cross these
  boundaries.
- No SketchUp/MCP execution path exists.

## Next safe slice

Build an injected HTTPS sender that:

- accepts only the signed request object;
- requires injected `fetchFn` and never falls back to global fetch;
- calls it once and does not retry, including on 429;
- normalizes accepted/rejected/error responses;
- performs no real SketchUp/MCP call in tests.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not add automatic execution, endpoint, migration, deploy, or production
  settings.
- Do not commit unrelated existing handoff files.
