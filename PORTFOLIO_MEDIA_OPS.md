# Portfolio Media Production Ops

This runbook closes the operational path for portfolio image uploads.

## Current Decision

- Portfolio URL-based images continue to work without R2.
- Admin uploads require Cloudflare R2 binding `PORTFOLIO_MEDIA_BUCKET`.
- Uploaded files are served either through `PORTFOLIO_MEDIA_PUBLIC_BASE_URL` or
  the built-in `/media/<storage-key>` fallback route.
- Production migration `0010_portfolio_media.sql` must be applied before upload
  metadata is expected in `portfolio_images`.

## Cloudflare Setup

1. Create or confirm the R2 bucket:

```text
furniture-portfolio-media
```

2. In Cloudflare Pages production settings, add an R2 binding:

```text
Binding name: PORTFOLIO_MEDIA_BUCKET
Bucket: furniture-portfolio-media
```

3. Optional: add a public media base URL if a custom R2/CDN domain is ready:

```text
PORTFOLIO_MEDIA_PUBLIC_BASE_URL=https://media.example.com
```

If this variable is empty, uploads use `/media/portfolio/...` and the Pages
Function `functions/media/[[path]].js` serves objects through the app.

## Local Verification

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

Optional smoke runner:

```powershell
$env:PORTFOLIO_SMOKE_BASE_URL="https://furniture-orders-mvp.pages.dev"
$env:PORTFOLIO_SMOKE_ADMIN_TOKEN="<admin token>"
$env:PORTFOLIO_SMOKE_IMAGE="C:\path\to\small-test.webp"
$env:PORTFOLIO_SMOKE_PUBLISH="false"
node scripts/portfolio-media-smoke.mjs
```

The runner creates a draft portfolio item and uploads one image. It publishes
only when `PORTFOLIO_SMOKE_PUBLISH=true`.
Run it against production only after approving creation of a temporary draft
portfolio item and R2 object.

Production write-smoke gate:

- It creates a temporary portfolio draft item.
- It uploads one test JPEG/PNG/WebP into R2.
- It publishes only when `PORTFOLIO_SMOKE_PUBLISH=true`.
- It must not be run against real customer images.
- It needs explicit approval because it writes to production D1 and R2.

Local upload smoke:

1. Start dev server.
2. Open `/admin`.
3. Enter admin token.
4. Create or open a draft portfolio item.
5. Upload a small JPEG/PNG/WebP under 5 MB.
6. Confirm the response returns:
   - `storageKey` starting with `portfolio/`;
   - `mimeType`;
   - `sizeBytes`;
   - `imageUrl`.
7. Open the returned image URL.

## Production Smoke

After deploy and R2 binding:

1. Upload one small WebP from admin.
2. Confirm the portfolio item shows the image in admin.
3. Publish the item.
4. Open the public homepage gallery.
5. Open the uploaded image URL directly.
6. Confirm missing media returns a controlled `404 media_not_found`.
7. Confirm traversal-like paths return `400 invalid_media_key`.

## Production Read-only Smoke Log

2026-06-16:

- Cloudflare account is connected through Wrangler.
- R2 bucket exists: `furniture-portfolio-media`.
- Pages production deployment source is `ea0e2e6`.
- Public portfolio API returned `200`.
- Missing portfolio media path returned `404`, confirming the production R2
  binding is present instead of missing (`503`).
- Encoded traversal path under `/media/portfolio/%2e%2e/...` returned `400`.
- Full write-smoke from admin is still pending.

2026-06-23:

- Remote D1 contains `portfolio_items` and `portfolio_images`.
- R2 bucket info confirms `furniture-portfolio-media` exists in `EEUR`.
- Public `/api/portfolio` returned `200`.
- Missing `/media/portfolio/nonexistent-smoke.webp` returned controlled
  `404 media_not_found`.
- Bucket was still empty at read-only check time (`0 objects`, `0 B`).
- Production write-smoke remains pending explicit approval to create a
  temporary draft portfolio item and R2 object.

## Safety Rules

- Do not store real customer-private images before consent rules are confirmed.
- Do not make the R2 bucket broadly public unless a deliberate CDN policy is in
  place.
- Do not remove URL-based image support; it is the fallback when R2 is missing.
- If `PORTFOLIO_MEDIA_BUCKET` is missing, uploads must fail with
  `503 portfolio_media_not_configured` while the rest of portfolio remains
  usable.
