# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- SketchUp Slice 2 defines and validates `sketchup-command-plan/v1`.
- Only manager-approved OCR records and ready furniture models can cross these
  boundaries.
- No SketchUp/MCP execution path exists.

## Next safe slice

Build a pure SketchUp node job/request contract that:

- consumes only a validated `sketchup-command-plan/v1`;
- includes plan/source versions, traceable order/recognition IDs, job ID,
  creation time, expiry, and idempotency key;
- defines a signature-ready canonical payload without storing a secret;
- performs no network/MCP call;
- fails closed on invalid, expired, or unsupported plans.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not add automatic execution, endpoint, migration, deploy, or production
  settings.
- Do not commit unrelated existing handoff files.
