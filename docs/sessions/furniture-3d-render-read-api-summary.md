# 3D Render Read API Summary

Date: 2026-06-24

## Goal

Make stored SketchUp/3D render artifacts readable by admin and CRM surfaces
without starting SketchUp, calling MCP, generating files, or changing the
existing guarded upload/executor boundary.

## Changes

- Added `listOrderRenderArtifactsCore({ db }, orderId)` to
  `src/sketchup/render-core.js`.
- Added `GET /api/orders/:id/sketchup/render-artifacts` with read-scoped
  authorization.
- Kept `POST /api/orders/:id/sketchup/render-artifacts` ops-scoped for saving
  artifacts.
- Extended `tests/sketchup-render-core.test.js` for listing, invalid order IDs,
  read-token access, unauthorized access, and manifest parsing.
- Updated README, `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html`, and
  `SESSION_NOTES.md`.

## Safety

- No real SketchUp process.
- No MCP call.
- No render generation.
- No external network call.
- No migration.
- No production secret or deploy setting changed.
- Default node/executor path remains dry-run and fail-closed.

## Verification

- `node --test tests/sketchup-render-core.test.js`: passed, 10 tests.
- `node --check src/sketchup/render-core.js`: passed.
- `node --check functions/api/orders/[id]/sketchup/render-artifacts.js`:
  passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 504 tests.

## Next

- Show render artifact links/status in the admin order view.
- Then connect an approved Windows SketchUp/render executor only behind the
  existing gated execution controls.
