# OCR Production Readiness

Date: 2026-06-15
Status: synthetic-only production smoke completed; customer images disabled

## Current Safety State

- OCR is manual and write-protected.
- Recognition results are always saved as `draft` or `failed`.
- Manager review is required before `approved`.
- Absence of `OCR_RECOGNITION_ENABLED` keeps the provider path disabled.
- Absence of `OCR_CUSTOMER_IMAGES_ENABLED` blocks customer images before any
  provider network request.
- An explicitly synthetic image may be used for a controlled smoke.
- HTTP 429 stops immediately; there is no automatic retry loop.

## Customer Image Policy

Customer image recognition is not ready to enable.

Before setting `OCR_CUSTOMER_IMAGES_ENABLED=true`, the project must add and
review:

1. durable consent audit fields;
2. an approved consent text and policy version;
3. an approved retention period;
4. deletion operations for original media and recognition data;
5. a manager-facing confirmation workflow;
6. a privacy review for the selected provider.

The current request-level `consentConfirmed=true` gate is defense in depth. It
is not a durable consent audit record.

Customer recognition also requires a stored HTTPS image reference. Temporary
data URLs are accepted only for explicitly synthetic tests and are never
persisted into D1.

## Production Migration Status

Applied on 2026-06-15:

```text
migrations/0017_ocr_recognitions.sql
migrations/0018_ocr_image_source.sql
```

Verification commands:

```powershell
npx.cmd wrangler d1 execute DB --remote --command "PRAGMA table_info(orders);"
npx.cmd wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='ocr_recognitions';"
```

npx.cmd wrangler d1 execute DB --remote --command "PRAGMA table_info(ocr_recognitions);"
npx.cmd wrangler d1 migrations list DB --remote
```

Remote D1 has no pending migrations. Do not rerun these migrations.

## Synthetic-Only Production Configuration

Keep customer images disabled:

```dotenv
OCR_RECOGNITION_ENABLED=true
OCR_CUSTOMER_IMAGES_ENABLED=false
OCR_PROVIDER=openai
OCR_MODEL=gpt-4o-mini
```

Provider API keys and admin tokens must be Cloudflare secrets, never committed
files.

## Controlled Production Smoke Result

Use one synthetic furniture sketch with:

```json
{
  "image": {
    "source": "data:image/png;base64,...",
    "synthetic": true
  }
}
```

Completed on synthetic order `8`:

- endpoint returned `201`;
- record `1` status is `draft`;
- data URL is not persisted;
- wardrobe dimensions `2400 x 600 x 2600 mm` are visible for manager review;
- no automatic approval, quote, message, SketchUp action, or retry occurs.

The endpoint was disabled after the smoke.

## Rollback

Reliable Pages rollback:

```powershell
npx.cmd wrangler pages secret delete OCR_RECOGNITION_ENABLED --project-name furniture-orders-mvp
npx.cmd wrangler pages secret delete OCR_CUSTOMER_IMAGES_ENABLED --project-name furniture-orders-mvp
npm.cmd run deploy
```

Do not rely on updating an existing Pages enable secret to the string
`"false"` as the kill switch. During Slice 8B that update did not reliably
disable the deployed endpoint. Deleting the enable secrets and redeploying
returned the expected `503 ocr_recognition_disabled`.

Do not drop OCR tables during routine rollback. Existing draft/review history
must remain available for investigation.
