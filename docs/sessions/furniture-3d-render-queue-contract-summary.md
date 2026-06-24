# 3D Render Queue Contract Summary

Date: 2026-06-24

## Goal

Prepare the local SketchUp node file queue for future render-ready results
without starting SketchUp, executing Ruby, uploading files, or changing
production settings.

## Changes

- Extended `sketchup-node-service/src/file-queue-executor.js` so
  `outbox/{jobId}.json` can return either the legacy single `artifact` response
  or a render-ready `artifacts[]` list.
- Preserved backward compatibility for existing model-only SKP responses.
- Added validation that render-ready `artifacts[]` responses include:
  - one safe `skp` reference;
  - at least one safe `preview` or `render` reference.
- Extended `sketchup-node-service/src/execution-adapter.js` to pass normalized
  `artifacts[]` through the gated execution adapter result.
- Updated node-service tests for legacy SKP, render-ready artifacts, invalid
  artifact lists, and adapter normalization.
- Updated the node-service README with legacy and render-ready outbox examples.
- Updated project progress trackers and session notes.

## Safety Boundaries

- No SketchUp process is started.
- No Ruby code is executed.
- No MCP call is made.
- No render engine is connected.
- No file upload or R2 write is introduced.
- No D1 migration is added.
- No production secret or deploy setting is changed.

## Verification

- `npm.cmd --prefix sketchup-node-service test`: passed, 24 tests.
- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 508 tests.

## Next Step

Build or review the local SketchUp Ruby consumer / approved render executor
that consumes `inbox/{jobId}.json` and writes the validated outbox response.
