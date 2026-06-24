# SketchUp Ruby Outbox Finalizer Summary

Date: 2026-06-24

## Goal

Add a minimal Ruby-side contract helper for the future local SketchUp adapter
without starting SketchUp, executing generated Ruby commands, calling
EasyKitchen, or changing production settings.

## Changes

- Added `sketchup-node-service/ruby/queue_consumer_contract.rb`.
- The helper validates:
  - safe job ID;
  - `furniture-sketchup-file-queue/v1` bridge request;
  - matching request/approval job identity;
  - manager identity and ISO approval time;
  - `sketchup-command-plan/v1`;
  - allowlisted commands only: `set_units`, `create_envelope`,
    `attach_metadata`;
  - existing `artifacts/{jobId}/model.skp`;
  - at least one existing preview or render image.
- The helper atomically writes render-ready `outbox/{jobId}.json` only after
  those checks pass.
- Added `sketchup-node-service/tests/ruby-consumer-contract.test.js`.
- Updated `sketchup-node-service/README.md`,
  `docs/decisions/SKETCHUP_INTEGRATION_DECISION.md`, `README.md`,
  `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html`, and `SESSION_NOTES.md`.

## Safety Boundaries

- No SketchUp process is started.
- No SketchUp API call is made.
- No EasyKitchen call or asset copy is made.
- No shell command is executed by the Ruby helper.
- No fake model/render artifacts are generated.
- No upload, D1 migration, endpoint, secret, or deploy setting is changed.
- The Node HTTP service still does not invoke Ruby.

## Verification

- `ruby --version`: Ruby is not installed in the current Windows environment.
- `npm.cmd --prefix sketchup-node-service test`: passed, 26 tests
  (25 passed, 1 skipped because Ruby is not installed locally).
- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 510 tests (509 passed, 1 skipped because Ruby is
  not installed locally).
- The added Node test checks the Ruby script's safety markers when Ruby is
  unavailable.
- The same test will run a runtime Ruby smoke automatically when Ruby is
  available.

## Next Step

Build the real local SketchUp/EasyKitchen geometry and render adapter that
creates `model.skp`, preview, and render files before calling this finalizer.
