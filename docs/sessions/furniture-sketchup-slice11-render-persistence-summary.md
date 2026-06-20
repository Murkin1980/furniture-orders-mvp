# SketchUp Slice 11 Render Persistence Summary

Date: 2026-06-20

## Goal

Close the platform-side gap between the safe SketchUp job boundary and the 3D
render module by persisting validated render artifact metadata for accepted
SketchUp jobs.

## What changed

- Added migration `migrations/0021_sketchup_render_artifacts.sql`.
- Added `src/sketchup/render-core.js`.
- Added `functions/api/orders/[id]/sketchup/render-artifacts.js`.
- Added `tests/sketchup-render-core.test.js`.
- Updated `README.md`.
- Updated `SKETCHUP_INTEGRATION_DECISION.md`.
- Updated `PROJECT_PROGRESS.md` and `PROJECT_PROGRESS.html`.
- Updated `SESSION_NOTES.md`.

## Behavior

The new endpoint is:

```text
POST /api/orders/:id/sketchup/render-artifacts
```

It:

- requires operations scope;
- checks that the referenced `sketchup_jobs` row belongs to the order;
- allows persistence only for jobs with status `accepted`;
- validates the payload through `sketchup-render-artifact/v1`;
- stores primary render storage key, optional model storage key, manifest JSON,
  and reporter audit;
- updates idempotently by `jobId`.

## Safety

- No real SketchUp call.
- No MCP call.
- No Ruby or child process execution.
- No binary upload.
- No R2 write.
- No production migration applied.
- No public endpoint or customer flow changed.

## Checks

- `node --check src/sketchup/render-core.js`: passed.
- `node --check functions/api/orders/[id]/sketchup/render-artifacts.js`: passed.
- `node --test tests/sketchup-render-core.test.js`: passed, 7 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 416 tests.

## Next

Real render file generation and R2 upload should be added only after an
approved Windows/SketchUp executor exists.
