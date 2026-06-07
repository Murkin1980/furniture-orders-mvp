# Stage 4.05B Coding Brief

## Goal

Add a media/storage upgrade for portfolio items: admin image uploads, storage metadata, and Cloudflare R2-ready runtime boundaries, while keeping the current URL-based image flow working.

## Scope

- Add nullable storage metadata to `portfolio_images`.
- Add a safe upload helper for image files with strict MIME/size limits.
- Add an admin-only multipart upload endpoint.
- Keep existing URL image APIs unchanged.
- Update admin UI with an upload action.
- Update tests and README.

## Boundaries

- No arbitrary file types.
- No image processing pipeline in this slice.
- No R2 bucket creation unless explicitly requested.
- Do not commit working handoff/reviewer files automatically.

## Expected Checks

- `npm.cmd run check`
- `npm.cmd test`
- Remote D1 migration apply if migration is added.
- Cloudflare deploy after commit/push.
