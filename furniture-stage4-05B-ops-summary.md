# Stage 4.05B Ops Summary

Date: 2026-06-02

## Goal

Finish the operational part of Stage 4.05B so portfolio uploads can use Cloudflare R2 in production without requiring a public R2 bucket URL.

## Changes Applied

- Created Cloudflare R2 bucket:
  - `furniture-portfolio-media`
- Added R2 binding to `wrangler.toml`:
  - binding: `PORTFOLIO_MEDIA_BUCKET`
  - bucket: `furniture-portfolio-media`
- Added read-only media endpoint:
  - `GET /media/:path`
  - implementation file: `functions/media/[[path]].js`
- The media endpoint:
  - reads objects from `PORTFOLIO_MEDIA_BUCKET`;
  - serves only keys under `portfolio/`;
  - rejects traversal attempts;
  - supports `GET`, `HEAD`, and `OPTIONS`;
  - returns `503 portfolio_media_not_configured` if the binding is missing.
- Updated `package.json` check script to include the new media function.
- Updated README Stage 4.05B notes:
  - R2 bucket is now `furniture-portfolio-media`;
  - `PORTFOLIO_MEDIA_PUBLIC_BASE_URL` is optional;
  - fallback uploaded image URLs use `/media/<storage-key>`.

## Files Changed

- `wrangler.toml`
- `functions/media/[[path]].js`
- `package.json`
- `README.md`

## Checks

- `npm.cmd run check` passed.
- `npm.cmd test` passed: 68 tests.

## Remaining Ops

- Deploy updated Pages project so the R2 binding is active.
- Smoke-check production:
  - `/`
  - `/admin`
  - `/api/portfolio`
  - `/media/not-found` or another missing media key should return a controlled error.
- Full upload smoke needs an admin token and a real image upload through `/admin`.

## Reminder

Stage 4.03C is still blocked on SSH/VPS access and must be resumed later.
