# Native CRM follow-up WIP handoff

Date: 2026-06-12

## Goal

Add a manager follow-up date and task to native CRM, including due-today and
overdue indicators.

## Current state

- Native CRM pipeline, priority filters, inline notes, tests, deploy complete.
- Latest commit: `637ef0c`.
- Twenty remains a separate optional module and disabled.

## Planned files

- `migrations/0014_order_follow_up.sql`
- `src/orders-core.js`
- `functions/api/orders/status.js`
- `public/crm-core.js`
- `public/crm.js`
- `public/crm.html`
- focused tests and project docs

## Safety

- Keep existing order intake unchanged.
- Follow-up fields are optional.
- No automatic notifications or external calls.
- Do not commit unrelated existing handoff/instruction files.
