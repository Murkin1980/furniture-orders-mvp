# CRM Slices 5-7 implementation summary

Date: 2026-06-12

## Goal

Complete the manual platform path from an existing order to a controlled
one-way Twenty CRM sync.

## Completed

- Added sequential manual sync core.
- Added safe partial-failure handling and partial created-ID preservation.
- Added D1 sync status fields through migration `0013_order_twenty_sync.sql`.
- Added admin-protected `POST /api/orders/:id/crm/twenty`.
- Added manual admin button and CRM status display.
- Kept sync disabled by default through `TWENTY_SYNC_ENABLED=false`.
- Kept order intake independent from Twenty availability.

## Safety behavior

- Person, opportunity, and note requests execute sequentially.
- The first error stops the sequence.
- HTTP `429` is never retried automatically.
- Disabled sync makes no Twenty request.
- A failed CRM sync records status/error and does not modify ordinary order
  fields.
- No real Twenty credentials are stored in code.

## Checks

- Targeted CRM core/admin tests: 12 passed.
- Full suite: 185 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.
- Remote D1 audit: only migration `0013_order_twenty_sync.sql` pending.

## Production boundary

The platform path is ready for deployment and a disabled-by-default production
safety test. A successful real Twenty production test remains dependent on:

- a selected Twenty workspace;
- verified workspace-generated API paths and payload fields;
- `TWENTY_API_BASE_URL`;
- `TWENTY_API_KEY`;
- explicit `TWENTY_SYNC_ENABLED=true`.
