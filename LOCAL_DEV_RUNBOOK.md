# Local Dev Runbook

Use this when the local admin UI does not load orders, calculators, portfolio,
or CRM correctly.

## Start

```powershell
npm.cmd run dev
```

Current local URL:

```text
http://127.0.0.1:8788
```

If another dev server is already running, choose another port:

```powershell
npm.cmd run dev -- --port 8795
```

## Local Admin Token

For `npm.cmd run dev`, the local fallback token is:

```text
dev-admin-token
```

If `.dev.vars` defines another `ADMIN_TOKEN`, use that only when the active
server was started without an overriding fallback binding. If the UI says
`Admin token is invalid or missing`, first try `dev-admin-token`, then reload
the page and save the token again.

## Local D1 Schema Drift

Wrangler local D1 can become partially migrated: the schema may contain some
columns while Wrangler migration history still thinks older migrations are
pending. In that state, a full local migration replay can fail with duplicate
column errors.

Observed example:

```text
duplicate column name: updated_at
no such column: retention_until
```

Recovery used on 2026-06-16:

1. Inspect the local table:

```powershell
npx.cmd wrangler d1 execute furniture_orders --local --command "PRAGMA table_info(ocr_recognitions);"
```

2. Add only missing local OCR retention columns if needed:

```powershell
npx.cmd wrangler d1 execute furniture_orders --local --command "ALTER TABLE ocr_recognitions ADD COLUMN consent_status TEXT NOT NULL DEFAULT 'not_required'; ALTER TABLE ocr_recognitions ADD COLUMN consent_policy_version TEXT; ALTER TABLE ocr_recognitions ADD COLUMN consent_confirmed_by TEXT; ALTER TABLE ocr_recognitions ADD COLUMN consent_confirmed_at TEXT; ALTER TABLE ocr_recognitions ADD COLUMN retention_until TEXT; ALTER TABLE ocr_recognitions ADD COLUMN deleted_by TEXT; ALTER TABLE ocr_recognitions ADD COLUMN deleted_at TEXT; ALTER TABLE ocr_recognitions ADD COLUMN deletion_reason TEXT; CREATE INDEX IF NOT EXISTS idx_ocr_recognitions_retention_until ON ocr_recognitions(retention_until);"
```

3. Restart the dev server.

4. Verify:

```powershell
$token="dev-admin-token"
curl.exe -s -o NUL -w "orders %{http_code}`n" -H "X-Admin-Token: $token" http://127.0.0.1:8795/api/orders
curl.exe -s -o NUL -w "calculators %{http_code}`n" -H "X-Admin-Token: $token" http://127.0.0.1:8795/api/calculators
curl.exe -s -o NUL -w "portfolio %{http_code}`n" -H "X-Admin-Token: $token" http://127.0.0.1:8795/api/portfolio
```

Expected result:

```text
orders 200
calculators 200
portfolio 200
```

## Safety

- This runbook is for local `.wrangler/state` only.
- Do not use local schema recovery commands against production.
- Do not infer production migration state from a broken local migration replay.
