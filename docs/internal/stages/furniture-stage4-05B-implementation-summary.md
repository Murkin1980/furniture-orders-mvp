# Stage 4.05B Implementation Summary

## Goal

Upgrade portfolio media from URL-only MVP toward Cloudflare Storage/R2-backed uploads, without breaking existing portfolio URL flows.

## Changes Applied

- Added `POST /api/portfolio/:id/images/upload` as an admin-only multipart endpoint.
- Added strict upload validation in `src/portfolio-core.js`:
  - accepted MIME types: JPEG, PNG, WebP;
  - max file size: 5 MB;
  - empty/missing file rejection;
  - missing storage binding returns `503 portfolio_media_not_configured`.
- Added R2-compatible storage write through `PORTFOLIO_MEDIA_BUCKET`.
- Added public uploaded image URL generation from `PORTFOLIO_MEDIA_PUBLIC_BASE_URL`.
- Added generated storage keys under `portfolio/<itemId>/<uuid>.<ext>`.
- Extended `portfolio_images` with nullable media metadata:
  - `storage_key`;
  - `mime_type`;
  - `size_bytes`.
- Kept URL-based image creation and adding unchanged for backward compatibility.
- Updated admin UI:
  - added `Upload photo` action for portfolio items;
  - kept existing `Add photos` URL flow;
  - added `adminFetchFormData` helper for authenticated multipart requests.
- Updated tests for storage upload success, missing binding, and unsupported MIME type.
- Updated `README.md` with Stage 4.05B contract, endpoint, migration, and R2 environment notes.

## Files Changed

- `README.md`
- `package.json`
- `public/admin.html`
- `src/portfolio-core.js`
- `functions/api/portfolio/[id]/images/upload.js`
- `migrations/0010_portfolio_media.sql`
- `tests/portfolio-core.test.js`

## Checks

- `npm.cmd run check` passed.
- `npm.cmd test` passed: 68 tests passing.
- Remote D1 migration applied: `0010_portfolio_media.sql`.

## Deployment Notes

- Code is R2-ready, but a real Cloudflare R2 bucket/custom domain still must be configured in Cloudflare Pages settings:
  - binding: `PORTFOLIO_MEDIA_BUCKET`;
  - variable: `PORTFOLIO_MEDIA_PUBLIC_BASE_URL`.
- Until the R2 binding exists, upload endpoint intentionally returns `503 portfolio_media_not_configured`.
- Existing URL-only portfolio flow continues to work in production.
