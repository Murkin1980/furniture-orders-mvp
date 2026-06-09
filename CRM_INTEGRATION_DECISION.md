# Twenty CRM integration decision

## Decision

- Twenty CRM is a separate CRM service alongside `furniture-orders-mvp`.
- Do not copy Twenty CRM into this repository.
- Do not make Twenty CRM a required dependency for the platform MVP.
- `furniture-orders-mvp` remains the source of truth for lead intake and furniture-specific workflows.
- Twenty CRM will be used for contacts, companies, opportunities, tasks, and communication history.

## Architecture

```text
Website / landing / calculator
-> furniture-orders-mvp
-> orders table
-> manual AI analysis
-> manual sync to Twenty CRM
-> manager works with contact / opportunity / task in Twenty CRM
```

Twenty CRM is an optional downstream service. Its availability must not affect order intake, calculators, landing sites, portfolio, or manual AI analysis.

## First integration mode

The first integration stage will be one-way manual sync through a future admin-protected endpoint:

```text
POST /api/orders/:id/crm/twenty
```

This endpoint will later:

1. Load the order by id.
2. Map the order to a Twenty person/contact payload.
3. Map the order to a Twenty opportunity/deal payload.
4. Include the AI result as a note or custom fields.
5. Send the payload to the Twenty API.
6. Save the sync status back to the order.

## What not to do now

- Do not implement Twenty API calls yet.
- Do not add `fetch`.
- Do not add dependencies.
- Do not add UI.
- Do not add the sync endpoint in this slice.
- Do not add migrations in this slice.
- Do not add two-way sync.
- Do not use Twenty MCP in production.
- Do not replace the current admin panel with Twenty CRM.
- Do not auto-sync every new order.
- Do not change the AI endpoint.

## Field mapping draft

### Order to Twenty person/contact

| Order field | Twenty target |
|---|---|
| `name` | name |
| `phone` | phones / phone |
| `email` | emails / email |
| `city`, `district`, `address` | address/location fields or note |
| `source` | source/custom field |

### Order to Twenty opportunity/deal

| Order field | Twenty target |
|---|---|
| `description` | opportunity name/description |
| `furniture_type` / `ai_furniture_type` | custom field |
| `budget` / `budget_range` | amount/custom field |
| `deadline` | expected close date or note |
| `status` | stage mapping |
| `calculatorMeta` | note/custom field |

### AI result to Twenty note/custom fields

- `ai_score`
- `ai_temperature`
- `ai_summary`
- `ai_next_question`
- `ai_missing_info_json`
- `ai_urgency`
- `ai_potential_value`
- `ai_recommended_status`

## Future slices

1. CRM Slice 2: create pure mapper `src/crm/twenty-mapper.js` with tests.
2. CRM Slice 3: create a Twenty client request builder without `fetch`.
3. CRM Slice 4: create `sendTwentyRequest` with injected `fetchFn` and tests.
4. CRM Slice 5: add a manual sync core function.
5. CRM Slice 6: add `POST /api/orders/:id/crm/twenty`.
6. CRM Slice 7: add admin button `Отправить в CRM`.
7. CRM Slice 8: add optional webhooks from Twenty back to the platform.
8. CRM Slice 9: consider MCP/AI agents only after stable sync.

## Safety rules

- Start with manual sync.
- Make no production changes during the planning slices.
- Do not enable auto-sync until the manual flow is stable.
- A failed CRM sync must not break order intake.
- An unavailable Twenty CRM service must not break `furniture-orders-mvp`.
- Keep all CRM credentials in environment variables or `.dev.vars`, never in code.

## Environment variables draft

Future integration variables:

```dotenv
TWENTY_API_BASE_URL=
TWENTY_API_KEY=
TWENTY_WORKSPACE_ID=
TWENTY_SYNC_ENABLED=false
```

`TWENTY_WORKSPACE_ID` is optional until the selected Twenty API flow requires it. `TWENTY_SYNC_ENABLED` must default to `false`.

## Local verification for this slice

This is a documentation-only decision slice. No code tests are required beyond the existing project checks:

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

