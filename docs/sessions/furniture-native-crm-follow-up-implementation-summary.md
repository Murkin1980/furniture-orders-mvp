# Native CRM follow-up MVP implementation summary

Date: 2026-06-12

## Implemented

- Optional follow-up date and manager task on orders.
- Today, overdue, and planned indicators on CRM cards.
- `Контакт сегодня` filter includes due-today and overdue orders.
- Follow-up data saves through the existing protected order update API.
- Migration `0014_order_follow_up.sql`.

## Safety

- Existing intake remains unchanged.
- No automatic notifications or external requests.
- No new dependency or endpoint.

## Verification

- Targeted tests: 38 passed.
- Full suite: 194 passed.
- Syntax check and `git diff --check`: passed.
