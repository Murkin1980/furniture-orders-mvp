# Manual SketchUp Envelope Consumer Summary

Date: 2026-06-24

## Goal

Add the first manual SketchUp-side scaffold for turning an approved command plan
into a local `.skp` model and preview image, while keeping real dynamic
components and photorealistic rendering out of this slice.

## Changes

- Added `sketchup-node-service/ruby/sketchup_envelope_consumer.rb`.
- The scaffold is designed to be loaded manually inside SketchUp 2026 Ruby
  Console or a reviewed local extension.
- It validates:
  - safe job ID;
  - `furniture-sketchup-file-queue/v1` inbox request;
  - matching approved manager approval file;
  - `sketchup-command-plan/v1`;
  - exactly three allowlisted commands;
  - required `create_envelope` command.
- It creates a simple overall envelope using confirmed dimensions only.
- It stores metadata from `attach_metadata` on the generated SketchUp group.
- It saves `artifacts/{jobId}/model.skp`.
- It writes `artifacts/{jobId}/preview.png`.
- It publishes render-ready `outbox/{jobId}.json`.
- Updated Ruby/static tests, README, decision document, progress trackers, and
  session notes.

## Safety Boundaries

- The Node service does not invoke this Ruby scaffold.
- Runtime SketchUp verification was not possible in this environment.
- No EasyKitchen integration is included.
- No dynamic component placement is included.
- No cabinet internals, hardware, material assignment, or real render engine is
  included.
- No network calls, shell execution, endpoint, migration, upload, production
  secret, or deploy setting is changed.

## Verification

- `npm.cmd --prefix sketchup-node-service test`: passed, 27 tests
  (26 passed, 1 skipped because Ruby is not installed locally).
- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 511 tests (510 passed, 1 skipped because Ruby is
  not installed locally).
- Static Node tests verify that the scaffold stays manual, allowlist-bound, and
  free of shell/network execution markers.

## Next Step

Run the scaffold inside local SketchUp 2026 with a synthetic approved queue job,
then add dynamic component placement using locally licensed EasyKitchen or an
approved in-house component catalog.
