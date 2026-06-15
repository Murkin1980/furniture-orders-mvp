# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- Only manager-approved OCR records can become furniture models.
- No SketchUp/MCP execution path exists.

## Next safe slice

Build a pure validated command-plan builder that:

- consumes only `readyForSketchUp=true` furniture models;
- supports a small allowlist of geometry operations;
- contains no Ruby/user code and performs no network/MCP call;
- preserves model version and approval audit;
- fails closed on incomplete or unsupported models.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not add automatic execution, endpoint, migration, deploy, or production
  settings.
- Do not commit unrelated existing handoff files.
