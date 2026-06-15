# OCR Production Readiness

Date: 2026-06-15
Status: synthetic-only production smoke is ready for separate approval

## Current Safety State

- OCR is manual and write-protected.
- Recognition results are always saved as `draft` or `failed`.
- Manager review is required before `approved`.
- `OCR_RECOGNITION_ENABLED=false` keeps the provider path disabled.
- `OCR_CUSTOMER_IMAGES_ENABLED=false` blocks customer images before any
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

## Production Migration Review

Required migrations:

```text
migrations/0017_ocr_recognitions.sql
migrations/0018_ocr_image_source.sql
```

Before applying them:

```powershell
npx.cmd wrangler d1 execute DB --remote --command "PRAGMA table_info(orders);"
npx.cmd wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='ocr_recognitions';"
```

Apply only after explicit approval:

```powershell
npx.cmd wrangler d1 execute DB --remote --file=migrations/0017_ocr_recognitions.sql --yes
npx.cmd wrangler d1 execute DB --remote --file=migrations/0018_ocr_image_source.sql --yes
```

Verify:

```powershell
npx.cmd wrangler d1 execute DB --remote --command "PRAGMA table_info(ocr_recognitions);"
```

Do not rerun a migration that is already present.

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

## Controlled Production Smoke

Use one synthetic furniture sketch with:

```json
{
  "image": {
    "source": "data:image/png;base64,...",
    "synthetic": true
  }
}
```

Expected result:

- endpoint returns `201`;
- record status is `draft`;
- data URL is not persisted;
- dimensions and warnings are visible for manager review;
- no automatic approval, quote, message, SketchUp action, or retry occurs.

Stop immediately on `429` or any unexpected result. Disable
`OCR_RECOGNITION_ENABLED` after the smoke until the production workflow is
explicitly accepted.

## Rollback

Configuration rollback:

```dotenv
OCR_RECOGNITION_ENABLED=false
OCR_CUSTOMER_IMAGES_ENABLED=false
```

Do not drop OCR tables during routine rollback. Existing draft/review history
must remain available for investigation.
