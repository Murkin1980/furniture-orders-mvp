# Commercial Proposal Production Gate - WIP Handoff

## Current goal

Run one synthetic production proposal lifecycle smoke after migration/deploy.

## Completed

- Proposal Slices 5-7 are committed and pushed to `origin/main` as `d1b8703`.
- Full suite passed: 466 tests.
- Local D1 create/save/publish/approve/history smoke passed.
- Desktop and mobile admin Playwright smoke passed.
- Wrangler OAuth is working for account `ca7e89e2e4e294af2c7db130838cf0e0`.
- Remote D1 migration `0022_commercial_proposals.sql` was applied on 2026-06-23.
- Remote D1 schema now contains `commercial_proposals`,
  `commercial_proposal_versions`, and `order_interactions`.
- Commit `d1b8703` was deployed to Cloudflare Pages:
  `https://ea9bedd1.furniture-orders-mvp.pages.dev`.
- README, project progress, HTML progress, and session notes were updated.

## Current blocker

- No local safe `PROPOSAL_*`/admin smoke environment is configured.
- The production lifecycle smoke still needs a synthetic order id and an admin
  token supplied through environment variables or a secure local shell, not
  committed files or chat.

## Next commands

```powershell
$env:PROPOSAL_SMOKE_BASE_URL='https://ea9bedd1.furniture-orders-mvp.pages.dev'
$env:PROPOSAL_SMOKE_ADMIN_TOKEN='<set locally, do not commit>'
$env:PROPOSAL_SMOKE_ORDER_ID='<synthetic order id>'
# Then run one authenticated create/save/publish/approve/history smoke.
```

After deploy, run only a synthetic authenticated create/save/publish/approve
smoke and verify one order-history record.

## Do not do

- Do not use a real customer order or proposal.
- Do not repeat failed auth/API calls in a loop.
- Do not commit this handoff unless the user explicitly asks for it.
