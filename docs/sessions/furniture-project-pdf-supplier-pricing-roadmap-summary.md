# Project PDF and Supplier Pricing Roadmap Summary

## Scope

This documentation pass adds two planned product workstreams without changing
application code, database migrations, deployment, or production settings.

## Decisions

- Project PDF Intelligence starts from one designer PDF uploaded to an order.
- The platform returns a preliminary estimate grouped by room and furniture
  item, including assumptions, confidence, missing information, and source
  evidence.
- A furniture maker must review the draft before it becomes an approved
  estimate or creates SketchUp/3D jobs.
- Supplier Catalog and Pricing imports supplier API/file/site data into a
  staging batch and publishes only a manager-approved immutable price version.
- Existing orders and approved estimates never change silently.
- Supplier web access must respect terms, rate limits, and retry safety.
- MCP mutations now require a separate read/list/get verification before an
  agent reports success.

## Files

- `docs/decisions/PROJECT_PDF_INTELLIGENCE_DECISION.md`
- `docs/decisions/SUPPLIER_PRICING_DECISION.md`
- `AGENTS.md`
- `PRODUCT.md`
- `README.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `SESSION_NOTES.md`

## Checks

- `git diff --check`: passed with line-ending warnings only.
- `PROJECT_PROGRESS.html` inline script syntax: passed.

## Not changed

- Application code and dependencies
- API endpoints and UI
- D1 migrations and Cloudflare bindings
- Deployment and production data
