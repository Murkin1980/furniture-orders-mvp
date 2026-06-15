# SketchUp Integration WIP Handoff

## Current state

- SketchUp Slice 1 defines `furniture-model/v1`.
- SketchUp Slice 2 defines and validates `sketchup-command-plan/v1`.
- SketchUp Slice 3 defines short-lived, signature-ready `sketchup-node-job/v1`.
- SketchUp Slice 4 adds an injected, single-attempt fake-node client and local
  accepted/rejected/error smoke.
- SketchUp Slice 5 adds Web Crypto HMAC signing/verification and a signed HTTPS
  request builder without fetch.
- SketchUp Slice 6 adds an injected single-attempt HTTPS sender without global
  fetch fallback or retries.
- SketchUp Slice 7 adds an ops-scoped manual endpoint and pending-first audit
  storage. Migration `0020` is not applied.
- SketchUp Slice 8 adds a pure receiving fake node with HMAC, expiry, and
  replay checks. It always returns `executed=false`.
- SketchUp Slice 9A adds a separate local Windows-side HTTP service around the
  fake node. It binds to loopback by default and keeps execution disabled.
- Only manager-approved OCR records and ready furniture models can cross these
  boundaries.
- No SketchUp/MCP execution path exists.

## Next safe slice

Add a narrow injected execution-adapter contract that remains disabled by
default. Keep migration `0020`, production deploy, real SketchUp/MCP, and
process execution disabled.

## Do not do yet

- Do not connect a real SketchUp node.
- Do not generate arbitrary Ruby.
- Do not enable automatic execution or real endpoint transport, apply migration
  `0020`, deploy, or change production settings.
- Do not commit unrelated existing handoff files.
