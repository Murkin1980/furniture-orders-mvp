# Furniture Orders MVP - Stage 4.02 WIP handoff

Date: 2026-05-30

## Current goal

Implement Stage 4.02: admin pricing editor for calculator prices, coefficients, formulas, draft/published state, and preview calculation. Latest subtask before pause: apply critical recommendations from `stage4-calculators-recommendations.md`.

## Done

- Read workspace `AGENTS.md`.
- Checked repo status and current branch.
- Read Stage 4 overview and Stage 4.02 instruction.
- Confirmed repo code is committed after Stage 4.01; remaining untracked files are working docs and locked local logs.
- Added Stage 4.02 migration, core, API, admin UI, tests, README update, and reviewer summary.
- Read `stage4-calculators-recommendations.md` and applied the critical recommendations:
  - extracted shared pricing formula/defaults to `src/calculators-pricing.js`;
  - added `runtimeVersion` and `formulaVersion`;
  - validated unknown `materialRuleCode`;
  - kept `materialMultiplier` as legacy compatibility only;
  - extended calculator lead metadata and tests.
- Updated `README.md` after recommendation pass.
- Updated reviewer summary after recommendation pass.
- Checked current `git status --short`; code is still uncommitted and not deployed after recommendations.
- Committed Stage 4.02 code as `7876b30 stage4: add calculator pricing editor`.
- Pushed `main` to GitHub.
- Applied remote D1 migration `0006_calculator_pricing.sql` to `furniture_orders`.
- Deployed Cloudflare Pages with `npm.cmd run deploy`.
- Verified production admin URL: `https://furniture-orders-mvp.pages.dev/admin -> 200 OK`.

## Files changed

- `src/calculators-core.js`
- `src/calculators-pricing.js`
- `src/orders-core.js`
- `functions/api/calculators/[id]/pricing.js`
- `functions/api/calculators/[id]/rules.js`
- `functions/api/calculators/[id]/preview.js`
- `functions/api/calculators/[id]/embed.js`
- `migrations/0006_calculator_pricing.sql`
- `public/admin.html`
- `tests/orders-core.test.js`
- `package.json`
- `README.md`
- `furniture-stage4-02-implementation-summary.md`
- `furniture-stage4-02-wip-handoff.md`

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
27 tests
27 pass
```

Local smoke:

```text
GET /admin -> 200 OK
POST /api/calculators -> success
GET /api/calculators/2/pricing -> success
POST /api/calculators/2/preview -> success
```

## Checks not passed yet

- Browser screenshot was not captured after recommendation patch.
- Wrangler deployment URL `https://3133ba01.furniture-orders-mvp.pages.dev/admin` did not respond from local PowerShell even after retry, but production URL responded with `200 OK`.

## Known issues or suspicions

- `stage4-dev.err.log` and `stage4-dev.out.log` are still untracked and locked by Windows file handles from an earlier local dev run. They are not code and should not be committed.
- `stage4-02-dev.err.log` and `stage4-02-dev.out.log` may also remain locked by Windows handles after local smoke. They are not code and should not be committed.

## Exact next commands

```bash
npm.cmd run check
npm.cmd test
git status --short
```

If user asks to inspect production after deploy:

```bash
Invoke-WebRequest -Uri https://furniture-orders-mvp.pages.dev/admin -UseBasicParsing | Select-Object StatusCode,StatusDescription
git status --short
```

## Do not commit without separate user decision

- Instruction files and old review notes.
- Stage summary and handoff markdown files unless the user asks.
- `stage4-dev.err.log`
- `stage4-dev.out.log`
- `stage4-02-dev.err.log`
- `stage4-02-dev.out.log`
