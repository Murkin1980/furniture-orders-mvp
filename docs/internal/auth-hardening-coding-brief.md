# Auth Hardening Coding Brief

Date: 2026-06-14

## Goal

Replace the single all-powerful `ADMIN_TOKEN` boundary with explicit read,
write, and operations scopes without breaking the existing admin/CRM MVP.

## Current Finding

`ADMIN_TOKEN` checks are duplicated across many Cloudflare Function files.
The browser admin and CRM currently use one token for every action. VPS deploy
and webserver reload are protected by the same platform token as ordinary order
reads.

This is a real privilege-boundary risk. It is not a safe few-line replacement:
the change needs a shared helper, endpoint classification, tests, UI handling,
secret rollout, and a temporary compatibility path.

## Proposed Tokens

- `ADMIN_READ_TOKEN`: read-only order, CRM, calculator, site, and portfolio
  administration.
- `ADMIN_WRITE_TOKEN`: all read permissions plus normal business mutations.
- `OPS_TOKEN`: VPS health/logs/services and all deploy/reload operations.
- `ADMIN_TOKEN`: temporary migration fallback only; remove after production
  verification and token rotation.

No token belongs in code, committed files, screenshots, or logs.

## Permission Matrix

### Public

- Public order intake.
- Published portfolio reads.
- Published calculator runtime/embed and calculator lead intake.
- Public generated site artifacts where already allowed.

### Read

- List/view orders, project steps, interaction history, communication drafts.
- View calculators, pricing/rules, sites/status, and draft portfolio records.

### Write

- Update order status/notes/follow-up and project steps.
- Create interactions and communication drafts; review drafts.
- Run manual AI analysis/suggestions and manual Twenty sync.
- Create/update/publish calculators, sites, and portfolio records.

### Operations

- VPS health, services, and deploy logs.
- Site/VPS deploy.
- Webserver reload.

## Implementation Sequence

1. Add a pure shared auth module with scopes and legacy fallback.
2. Add focused tests proving token hierarchy and denied cross-scope access.
3. Migrate a small representative endpoint set first:
   - read: `GET /api/orders`;
   - write: `POST /api/orders/status`;
   - ops: `POST /api/vps/deploy/site`.
4. Migrate remaining endpoints in bounded groups.
5. Update admin/CRM token handling. A write token may satisfy read actions;
   operations must use a distinct ops token.
6. Update `.env.example`, README, and operations documentation.
7. Add Cloudflare secrets, deploy, run denied/allowed production smoke tests,
   rotate the legacy token, then remove fallback in a later slice.

## Safety Rules

- Default deny when the required scoped token is absent.
- Never silently let a read token perform writes.
- Never let admin read/write tokens perform VPS deploy or reload.
- Preserve public endpoint behavior.
- Keep the legacy fallback time-bounded and documented.
- Do not change D1 schema or business logic.
- Failed authorization must not mutate data or trigger upstream requests.

## Required Checks

- Focused auth and endpoint tests.
- Full `npm.cmd test`.
- `npm.cmd run check`.
- `git diff --check`.
- Production smoke must test both allowed and denied requests.
