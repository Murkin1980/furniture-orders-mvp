# OCR Slice 7 Sender Implementation Summary

Date: 2026-06-14

## Completed

- Added `src/ocr/openai-vision.js`.
- Builds an OpenAI-compatible multimodal request from the provider-neutral OCR
  request.
- Accepts only HTTPS or image data URLs.
- Reuses the existing safe AI transport and injected `fetchFn`.
- Stops after the first HTTP 429 response with no retry.
- Added explicit `OCR_RECOGNITION_ENABLED` endpoint gating.
- Added env examples and focused tests.

## Checks

- Focused OCR sender/core tests: 28 passed.
- Full project tests: 282 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Production boundary

- Production migrations, deploy, and settings remain unchanged.

## Local D1 preparation

- Full local migration runner stopped on historical `updated_at` schema drift.
- Applied only OCR migrations `0017` and `0018` directly to local D1.
- Verified `ocr_recognitions` and `image_source`.
- Remote D1 was not touched.

## Local runtime D1 diagnosis

- Confirmed that the former `npm run dev` command's explicit `--d1 DB`
  override created a separate Pages `local-DB`.
- Configured local D1 migrations and test records were therefore invisible to
  the running Pages application.
- Removed the override from `npm run dev`; it now uses `furniture_orders` from
  `wrangler.toml`.
- Updated README and AI setup guidance to keep CLI migrations and Pages dev on
  the same `.wrangler/state` database.
- Added a regression test that keeps the explicit `--d1 DB` override out of
  the project dev command.
- Applied migrations `0013` and `0014` only to configured local D1 to make the
  current order list usable during local diagnostics.

## First synthetic smoke findings

- Sent exactly one external provider request with a synthetic wardrobe sketch.
- Runtime returned `server_error`; no OCR record was saved.
- Did not retry.
- Fixed two defects discovered by the smoke:
  - data image URLs are not persisted into D1;
  - provider `response_format` now contains only supported fields.
- Added regression tests for both fixes.
- Full project tests after fixes: 281 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
## Final synthetic smoke

- After the local D1 dev-path fix, sent exactly one final synthetic provider
  request.
- Endpoint returned `201` and saved recognition record `2` as `draft`.
- Recognized `wardrobe` with width `2400 mm`, depth `600 mm`, height `2600 mm`,
  and confidence `1`.
- The data URL was not persisted, and no automatic approval occurred.
- No production migration, deploy, customer image, or automatic recognition
  was used.
- Final checks: focused config test passed, full project tests `282` passed,
  `npm.cmd run check` passed, and `git diff --check` passed.
