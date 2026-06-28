# Go-Live Gate

Date: 2026-06-28
Status: GO WITH LIMITATIONS (2026-06-28)

## Code
- [ ] `npm ci` passes
- [ ] `npm run check` passes
- [ ] `npm test` passes (732+ tests)
- [ ] CI green on main
- [ ] No uncommitted changes
- [ ] No secrets in repo
- [ ] No debug console spam in manager flow

## Database
- [ ] D1 migrations audited (`D1_LAUNCH_MIGRATION_AUDIT.md`)
- [ ] Backup/export procedure confirmed
- [ ] Launch-required migrations applied
- [ ] Optional dangerous migrations NOT applied (0020, 0021)

## Security
- [ ] Admin closed (token required)
- [ ] Write endpoints closed
- [ ] Ops endpoints closed
- [ ] Public endpoints limited to intake
- [ ] Tokens not exposed in frontend

## Business flows (LR-01 through LR-10)
- [ ] LR-01: Public order PASS
- [ ] LR-02: Calculator lead PASS
- [ ] LR-03: Admin access PASS
- [ ] LR-04: CRM manager flow PASS
- [ ] LR-05: Proposal lifecycle PASS
- [ ] LR-06: Portfolio media PASS
- [ ] LR-07: Landing publish PASS
- [ ] LR-08: AI manual flow PASS
- [ ] LR-09: Failure recovery PASS
- [ ] LR-10: Manager simulation PASS

## Advanced features
- [ ] AI manual only — no auto-send
- [ ] OCR customer disabled
- [ ] SketchUp real executor disabled
- [ ] WhatsApp/Telegram auto-send disabled
- [ ] Twenty optional/disabled

## Decision

- [x] **GO** — можно начинать живые тесты
- [x] **GO WITH LIMITATIONS** — можно, но с ограничениями:
  - Customer OCR disabled
  - Autonomous AI sending disabled
  - WhatsApp/Telegram auto-send disabled
  - Hermes Agent production automation disabled
  - Twenty CRM automatic sync disabled
  - Real SketchUp/EasyKitchen executor disabled
  - Supplier Catalog automatic price publication disabled
- [ ] **NO GO** — запуск запрещён

## Required before wider launch

1. Resolve or formally waive 3 admin shell test failures
2. Complete LR-01..LR-10 manual checklist
3. Run one synthetic live smoke
4. Confirm production env gates
5. Document all critical/high blockers as closed or non-blocking

Signed: Murat  Date: 2026-06-28
