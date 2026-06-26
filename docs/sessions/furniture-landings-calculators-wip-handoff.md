# Landings and calculators completion handoff

Date: 2026-06-09  
Repository: `furniture-orders-mvp`  
Last committed revision: `991dd45 docs: archive AI implementation summaries`

## Current goal

Temporarily focus only on the landing platform and furniture calculators until they form a commercially usable service.

The platform must support this practical flow:

```text
Customer orders a landing page
-> manager records the brief
-> landing is created from a reusable template
-> calculator is configured and embedded when needed
-> preview is reviewed
-> landing is published to a real domain
-> leads from the landing/calculator enter furniture-orders-mvp
```

CRM, new AI features, OCR, SketchUp MCP, and 3D rendering are paused until this goal is complete.

## Already implemented

### Calculators

- Calculator creation and listing.
- Categories, prices, safe rules, and schema fields.
- Draft, preview, and published states.
- Public embed widget with token.
- Calculator lead submission into the normal orders flow.
- Shared preview/runtime/lead formula.
- `runtimeVersion`, `formulaVersion`, and `schemaVersion`.
- Admin calculator/pricing controls.

### Landing sites

- Site records, slugs, owner names, templates, and statuses.
- Primary domains and SSL status fields.
- Generated safe single-file HTML artifact.
- Admin site creation, listing, status, and deploy controls.
- VPS proxy and Ubuntu-side allowlisted deploy service code.
- Deployment history records.

## Completion definition

This workstream is complete only when all items below are verified:

1. A manager can accept and record an order for a new landing page.
2. A useful landing can be created from a reusable furniture template without editing source code.
3. Landing content, contacts, colors, sections, portfolio, CTA, and calculator selection can be configured.
4. A configured calculator can be embedded and tested in preview.
5. Landing and calculator leads reliably enter the main orders table.
6. The manager can preview the exact landing before publication.
7. The landing can be published to a real domain through the production deploy path.
8. Domain, SSL, deploy status, and errors are visible to the manager.
9. At least one complete end-to-end landing order is tested from brief to live lead.
10. Documentation, tests, reviewer summary, README, and progress dashboard match reality.

## Recommended delivery slices

### LC Slice 1 - Commercial workflow audit

- Audit only landing/calculator code, UI, tests, migrations, and production gaps.
- Define the minimal landing-order brief and exact completion backlog.
- Do not redesign unrelated admin modules.

### LC Slice 2 - Landing brief and content model

- Add a safe structured brief/content model for customer, brand, contacts, sections, CTA, and calculator selection.
- Add migration and pure validation only if the current site schema cannot safely store it.

### LC Slice 3 - Reusable furniture template library

- Add a small curated template library suitable for real furniture landing orders.
- Templates must use structured content, not arbitrary admin-authored code.

### LC Slice 4 - Landing editor and preview

- Add practical admin controls for editing structured content and selecting a calculator.
- Add exact preview before publication.

### LC Slice 5 - Calculator completion

- Finish the remaining schema-driven calculator editor gaps.
- Verify embed behavior, mobile layout, validation, and lead submission.

### LC Slice 6 - Production publishing completion

- Complete Stage 4.03C production VPS path required by landing deploy.
- Verify domain, SSL, deploy status, logs, and rollback/retry behavior.

### LC Slice 7 - Commercial end-to-end test

- Create one representative customer landing.
- Configure and embed its calculator.
- Publish it to a controlled real domain.
- Submit and verify landing and calculator leads.
- Record the operating procedure for future paid landing orders.

## Files likely involved

```text
src/sites-core.js
src/calculators-core.js
src/calculators-pricing.js
functions/api/sites/**
functions/api/calculators/**
public/admin-sites-vps.js
public/admin-calculators.js
public/admin.html
tests/sites-core.test.js
tests/orders-core.test.js
migrations/
vps-control-service/
README.md
PROJECT_PROGRESS.md
SESSION_NOTES.md
```

## Checks already passed before handoff

- CRM Slice 2 target tests: 13 passed.
- Full project tests after CRM Slice 2: 150 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.

## Checks still required

- Fresh landing/calculator-focused audit.
- Browser verification of admin, preview, embed, and mobile behavior.
- Production VPS/domain/SSL verification.
- Complete live landing lead smoke test.

## Known risks

- Live deploy code exists, but the real production VPS path is not yet operationally complete.
- Current generated landing artifact is intentionally minimal and single-file.
- The landing content model may be too limited for repeatable paid customer work.
- Calculator backend/runtime is strong, but the admin schema editor may still need completion.
- Existing worktree contains unrelated uncommitted infrastructure and CRM files.

## Exact next commands

```powershell
cd "C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\furniture-orders-mvp"
git status --short
node --test tests/sites-core.test.js tests/orders-core.test.js
npm.cmd run check
```

Then read only the landing/calculator files listed above and perform LC Slice 1.

## Do not commit without a separate decision

- Unrelated AI infrastructure and knowledge-conversion files.
- CRM Slice 2 files if they are not intentionally included in the selected commit.
- Real API keys, VPS tokens, admin tokens, customer private data, or `.dev.vars`.
- Changes to live donor/client repositories.

