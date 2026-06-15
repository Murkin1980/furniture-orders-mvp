# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- SketchUp Slice 2 defines and validates `sketchup-command-plan/v1`.
- SketchUp Slice 3 defines short-lived, signature-ready `sketchup-node-job/v1`.
- Only manager-approved OCR records and ready furniture models can cross these
  boundaries.
- No SketchUp/MCP execution path exists.

## Next safe slice

Build an injected fake-node client and local smoke that:

- accepts only a valid, unexpired `sketchup-node-job/v1`;
- requires an injected sender and never falls back to global fetch;
- returns a normalized accepted/rejected result;
- performs no real SketchUp/MCP call;
- stops after one failed request and does not retry.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not add automatic execution, endpoint, migration, deploy, or production
  settings.
- Do not commit unrelated existing handoff files.
