# D1 Launch Migration Audit

Date: 2026-06-28

## How to check remote migrations

```bash
npx wrangler d1 migrations list furniture_orders --remote
```

## Required migrations for launch

- [x] 0001_orders.sql — base tables
- [x] 0002_orders_updated_at.sql
- [x] 0003_order_notes.sql
- [x] 0004_project_steps.sql
- [x] 0005_calculators.sql
- [x] 0006_calculator_pricing.sql
- [x] 0007_sites.sql
- [x] 0008_portfolio.sql
- [x] 0009_calculator_schema_fields.sql
- [x] 0010_portfolio_media.sql
- [x] 0011_order_ai_results.sql
- [x] 0012_site_content.sql
- [x] 0013_order_twenty_sync.sql
- [x] 0014_order_follow_up.sql
- [x] 0015_order_interactions.sql
- [x] 0016_communication_drafts.sql
- [x] 0017_ocr_recognitions.sql
- [x] 0018_ocr_image_source.sql
- [x] 0019_ocr_consent_retention.sql — applied
- [ ] 0020_sketchup_jobs.sql — optional (admin-only SketchUp)
- [ ] 0021_sketchup_render_artifacts.sql — optional
- [ ] 0022_commercial_proposals.sql — applied
- [ ] 0023_project_pdf_drafts.sql — optional (PDF Intelligence)

## Backup before mutation

```bash
npx wrangler d1 export furniture_orders --remote --output=./backups/pre-launch-$(date +%Y%m%d).sql
```

## Safety rules

- Do not apply migrations without explicit approval
- Do not apply 0020/0021 unless SketchUp is in launch scope
- Export before any mutation
