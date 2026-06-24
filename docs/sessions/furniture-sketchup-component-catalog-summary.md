# SketchUp Dynamic Component Catalog Summary

Date: 2026-06-24

## Goal

Prepare a safe, expandable platform-side contract for dynamic furniture
components so future SketchUp/EasyKitchen adapters can map approved furniture
model components to real local component libraries.

## Changes

- Added `src/sketchup/component-catalog.js`.
- Added versioned contracts:
  - `sketchup-component-catalog/v1`;
  - `sketchup-component-placement/v1`.
- Supported component sources:
  - `in_house`;
  - `easykitchen`;
  - `external_reference`.
- Normalized safe component definitions with ID, label, family, source,
  adapter key, aliases, defaults, and notes.
- Added `buildComponentPlacementPlan(model, catalog)` to map approved model
  component labels to catalog aliases.
- Placement output is `metadata_only` until a reviewed local SketchUp adapter
  performs real geometry placement.
- Added `tests/sketchup-component-catalog.test.js`.
- Added the module to `npm run check`.
- Updated README, SketchUp decision document, project progress trackers, and
  session notes.

## Safety Boundaries

- No SketchUp API call.
- No EasyKitchen API call.
- No asset copy from EasyKitchen.
- No executable code, Ruby, SQL, template, expression, or file path is accepted
  from the catalog.
- No endpoint, migration, upload, production secret, or deploy setting changed.

## Verification

- `node --test tests/sketchup-component-catalog.test.js`: passed, 8 tests.
- `node --check src/sketchup/component-catalog.js`: passed.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 519 tests (518 passed, 1 skipped because Ruby is
  not installed locally).

## Next Step

Build a reviewed local SketchUp adapter that consumes
`sketchup-component-placement/v1` and maps safe component references to licensed
dynamic components inside SketchUp.
