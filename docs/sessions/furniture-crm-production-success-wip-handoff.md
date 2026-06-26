# Twenty CRM successful production test handoff

## Current state

- CRM Slices 1-7 are implemented.
- Production migration `0013_order_twenty_sync.sql` is applied.
- Production endpoint and admin control are deployed.
- Disabled-by-default production safety test passed on smoke order `5`.
- No external Twenty request has been made.

## External blocker

A successful real production sync requires a Twenty workspace and API key.
Twenty generates its API contract from each workspace schema, so exact
resources, fields, response shapes, and relations must be verified first.

## Required user/external setup

1. Create or select a separate Twenty CRM service/workspace.
2. Open `Settings -> API & Webhooks`.
3. Verify people, opportunities, notes, and relation API contracts.
4. Create a restricted API key.
5. Provide/configure production secrets without committing them:
   - `TWENTY_API_BASE_URL`
   - `TWENTY_API_KEY`
6. Keep `TWENTY_SYNC_ENABLED=false` until a controlled test is ready.

## Controlled success test

1. Verify request builder fields against workspace docs.
2. Set secrets.
3. Set `TWENTY_SYNC_ENABLED=true`.
4. Sync only smoke order `5`.
5. Confirm person, opportunity, and note in Twenty.
6. Confirm created IDs and `crm_sync_status=success` in the platform.
7. Disable sync again if any contract mismatch appears.

## Do not commit

- API keys or workspace secrets.
- This WIP handoff unless explicitly requested.
