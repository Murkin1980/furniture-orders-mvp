# Furniture Orders MVP - Stage 4.01 WIP handoff

Date: 2026-05-30

## Current goal

Finish Stage 4.01: embeddable furniture calculator widget with admin creation, embed publication, and lead submission into the order system.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status before work.
- Read Stage 4 overview from `C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\README-stage4-files.md`.
- Read Stage 4.01 instruction from `C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\4 этап\stage4-01-calculator-widget.md`.
- Added calculator core module.
- Added D1 calculator migration.
- Added Cloudflare Pages Functions for calculator admin/public APIs.
- Added calculator panel to admin UI.
- Added tests for calculator create/publish/lead flow.
- Applied Stage 4.01 review recommendations:
  - split admin embed-code flow from public widget runtime in core;
  - unified phone normalization through `src/phone.js`;
  - blocked invalid `materialMultiplier < 1`;
  - stored `calculatorMeta` structurally in order `raw_payload`;
  - added negative tests for invalid token, disabled calculator, invalid phone, category, and multiplier.
- Updated README for Stage 3/4.01 current state.
- Created reviewer summary file `furniture-stage4-01-implementation-summary.md`.

## Files changed in this pass

- `README.md`
- `package.json`
- `public/admin.html`
- `tests/orders-core.test.js`
- `src/calculators-core.js`
- `src/phone.js`
- `functions/api/calculators.js`
- `functions/api/calculators/[id].js`
- `functions/api/calculators/[id]/publish.js`
- `functions/api/calculators/[id]/embed.js`
- `functions/api/calculators/[id]/lead.js`
- `migrations/0005_calculators.sql`
- `furniture-stage4-01-implementation-summary.md`

Stage 3 WIP files already existed before this pass:

- `src/orders-core.js`
- `src/project-templates.js`
- `migrations/0004_project_steps.sql`
- `functions/api/order-steps.js`
- `functions/api/order-steps/update.js`
- `functions/api/orders/project/init.js`
- `furniture-stage3-wip-handoff.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
22 tests
22 pass
```

Local smoke test passed:

```text
GET /admin -> 200 OK
POST /api/calculators -> success
POST /api/calculators/1/publish -> success, embed code generated
GET /api/calculators/1/embed?token=... -> 200 OK
POST /api/calculators/1/lead?token=... -> 201 Created, orderId 6, estimate 300000 KZT
```

## Checks not completed

- Browser visual screenshot of admin calculator panel was not captured.
- Production D1 migration was not applied.
- Production deploy was not run.
- No commit/push was made because Stage 3 WIP is still mixed in the same working tree.

## Known issues or suspicions

- Windows printed an error that it could not find `stage4-dev`. This came from an incorrect `cmd start` invocation and is not a project code issue.
- `stage4-dev.err.log` and `stage4-dev.out.log` remain untracked and could not be deleted immediately because a process still held the file handles. Port 8788 is closed. Delete these logs later before staging.
- Stage 3 handoff still contains a manual-check suspicion: `GET /api/order-steps?orderId=5` returned an empty list during the earlier manual run.

## Exact next commands

```bash
npm.cmd run check
npm.cmd test
git status --short
```

Optional cleanup once file handles are released:

```powershell
Remove-Item -LiteralPath stage4-dev.err.log,stage4-dev.out.log -Force
```

Before production:

```bash
npx.cmd wrangler d1 migrations apply furniture_orders --remote
npm.cmd run deploy
```

## Do not commit without separate user decision

- Instruction files and review notes:
  - `furniture-mvp-stage1-review-notes.md`
  - `furniture-mvp-stage2-instructions.md`
  - `furniture-mvp-stage2-recommendations.md`
  - `furniture-mvp-stage3-instructions.md`
- Reviewer summaries and handoff files unless user asks:
  - `furniture-stage1-review-fixes-summary.md`
  - `furniture-stage2-implementation-summary.md`
  - `furniture-stage3-wip-handoff.md`
  - `furniture-stage4-01-implementation-summary.md`
  - `furniture-stage4-01-wip-handoff.md`
- Temporary logs:
  - `stage4-dev.err.log`
  - `stage4-dev.out.log`
