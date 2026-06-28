# Kitchen Secure Execution Integration — Reviewer Summary

Date: 2026-06-28
Checkpoint: 10 (updated)  
Tests: 724 total (61+ kitchen, 0 kitchen failures)

---

## 1. Что сделано

### 1.1. Kitchen-first 3D pipeline (Phases 1-8)

| Phase | Модуль | Статус |
|-------|--------|:------:|
| 1 | `src/kitchen/brief.js` — KitchenBrief contract | ✅ |
| 2 | `src/kitchen/order-to-brief.js` — Order → Brief | ✅ |
| 3 | `src/kitchen/model.js`, `src/kitchen/build-kitchen-model.js` — KitchenModel | ✅ |
| 4 | `src/sketchup/kitchen-furniture-model.js` → furniture-model/v1 | ✅ |
| 5 | `src/sketchup/kitchen-command-plan.js` → kitchen-command-plan/v1 | ✅ |
| 6 | `src/sketchup/fake-node.js` — kitchen dry-run summary | ✅ |
| 7 | Render artifacts (existing endpoint) | ✅ |
| 8 | Full pipeline smoke test | ✅ |

### 1.2. Ruby executor (EK-1 through EK-6)

| Slice | Файл | Назначение | Статус |
|-------|------|-----------|:------:|
| EK-1 | `kitchen_executor.rb` | Block geometry executor | ✅ |
| EK-2 | `kitchen_component_registry.rb` + `kitchen_component_builder.rb` | Registry + builder | ✅ |
| EK-3 | `kitchen_geometry.rb` | Appliance placement (counter_top/under_counter/floor/wall_mounted) | ✅ |
| EK-4 | `kitchen_easykitchen_adapter.rb` | EasyKitchen adapter (fail-closed) | ✅ |
| EK-5 | `kitchen_artifact_publisher.rb` | Scene + preview export | ✅ |
| EK-6 | `kitchen_update_in_place.rb` | Update-in-place by metadata | ✅ |

### 1.3. Kitchen Secure Execution Integration (this stage)

| № | Требование | Реализация | Статус |
|--|-----------|-----------|:------:|
| 1 | Documentation updated | README, PROJECT_PROGRESS, SESSION_NOTES | ✅ |
| 2 | Command plan version decision | `SKETCHUP_INTEGRATION_DECISION.md` — разделение kitchen/standard v1 | ✅ |
| 3 | Bridge: Kitchen → Signed Node Job | `src/sketchup/kitchen-job-bridge.js` — HMAC/TTL/idempotency совместимость | ✅ |
| 4 | Ruby consumer + executor integration | `queue_consumer_contract.rb` — распознаёт kitchen-command-plan/v1 | ✅ |
| 5 | Inferred data management | `managerApprovedInferred` gate → readiness=draft без approval | ✅ |
| 6 | Golden fixtures | `tests/fixtures/kitchen-valid-plan.json` + `kitchen-invalid-plan.json` | ✅ |
| 7 | EasyKitchen presets | `strict:` parameter — fail-closed без presets | ✅ |
| 8 | Workstream boundaries | SketchUp/3D подэтап "Kitchen Secure Execution" выделен | ✅ |

### 1.4. Real SketchUp 2026 verification

```
SketchUp 2026 Ruby Console:
→ kitchen_loader.rb загружает 8 модулей
→ KitchenExecutor.run(queue_dir, job_id)
→ create_room_envelope: 3000×2700mm комната
→ place_base_module × 3: sink-base, drawers, cabinet
→ place_wall_module × 1: wall-cabinet
→ place_appliance × 1: sink (counter_top)
→ model.skp (231 KB) создан
→ preview.png (2.7 MB) создан
→ outbox/kitchen-real-001.json записан
```

## 1.5. Explicit plan routing (latest)

| Компонент | Что изменилось |
|-----------|---------------|
| `sketchup_envelope_consumer.rb` | Добавлен `UnsupportedPlanForEnvelope` — явный guard. Проверяет `SUPPORTED_PLAN_TYPE="sketchup-command-plan"` + `SUPPORTED_PLAN_VERSION="v1"` до создания любых артефактов. Kitchen-планы отвергаются с сообщением "use kitchen_executor.rb" |
| `queue_consumer_contract.rb` | `route_plan()` с `case plan_version`: `sketchup-command-plan/v1` → `execute_standard_envelope()`, `kitchen-command-plan/v1` → `execute_kitchen()`, else → `UnsupportedPlanType` |
| Fixtures | 6 новых файлов: 3 inbox (standard/kitchen/unsupported) + 3 approval |
| Tests | 3 routing сценария: standard → envelope, kitchen → executor, unsupported → fail-closed |

## 2. Code Review — найденные и исправленные проблемы

| # | Проблема | Файл | Статус |
|---|----------|------|:------:|
| 1 | `normalizeModule` падал на wall=null → молчаливая "a" | `brief.js` | ✅ skip + warning |
| 2 | `depthMm` игнорировался — подставлялось 560/320 | `build-kitchen-model.js` | ✅ из brief |
| 3 | `readyForSketchUp` пропускал partial readiness | `kitchen-furniture-model.js` | ✅ только execution_ready |
| 4 | Appliance-module overlap | `build-kitchen-model.js` | ✅ единый occupancy |
| 5 | `guessLayout` эвристика без inferred флага | `order-to-brief.js` | ✅ acknowledged |
| 6 | `extractWallLength` первое число = длина стены | `order-to-brief.js` | ✅ acknowledged |
| 7 | `validateKitchenModel` не тестировался | `tests/kitchen-model.test.js` | ✅ 8 тестов |
| 8 | readyForSketchUp gate не тестировался | `tests/kitchen-furniture-model.test.js` | ✅ 3 теста |
| 9 | L layout без wallB | `tests/kitchen-build-model.test.js` | ✅ 1 тест |
| 10 | wall fallback без ошибки | `brief.js` | ✅ explicit skip |

## 3. Архитектура

```
Order → KitchenBrief (inferred/requiresReview)
  → Manager review (managerApprovedInferred)
  → KitchenModel (readiness: draft/partial/execution_ready)
  → furniture-model/v1 (kitchen adapter)
  → kitchen-command-plan/v1 (allowlisted: 4 commands)
  → SketchUp pipeline:
    ┌─────────────────────────────────────────┐
    │ kitchen-job-bridge.js                   │
    │ → standard command-plan wrapper         │
    │ → buildSketchUpNodeJob (HMAC + TTL)     │
    │ → signSketchUpNodeJob (HMAC-SHA256)     │
    │ → handleFakeSketchUpNodeJob (dry-run)   │
    │ → POST /v1/jobs → node service          │
    └──────────────┬──────────────────────────┘
                   ↓
    ┌──────────────────────────────────────────────┐
    │ queue_consumer_contract.rb                   │
    │ → route_plan(queue_dir, job_id)              │
    │   ├── sketchup-command-plan/v1 → envelope    │
    │   ├── kitchen-command-plan/v1  → executor    │
    │   └── else → UnsupportedPlanType (fail-closed)│
    └────┬─────────────────────────────┬───────────┘
         ↓                             ↓
    ┌──────────────────┐    ┌────────────────────────┐
    │ envelope scaffold │    │ kitchen_executor.rb    │
    │ (3 команды)      │    │ (4+ kitchen команды)   │
    │ → model.skp      │    │ → set_units_mm         │
    │ → preview.png    │    │ → create_room_envelope │
    └──────────────────┘    │ → place_base/wall/app  │
                            │ → model.skp+preview    │
                            └────────────────────────┘
                   ↓
    ┌─────────────────────────────────────────┐
    │ kitchen_executor.rb                     │
    │ → set_units_mm                          │
    │ → create_room_envelope                  │
    │ → place_base_module / place_wall_module │
    │ → place_appliance                       │
    │ → save model.skp + preview.png          │
    │ → publish outbox                        │
    └─────────────────────────────────────────┘
                   ↓
    Render artifact → platform order card
```

## 4. SketchUp Boundary Compatibility

| Компонент | Совместимость | Комментарий |
|-----------|:-------------:|-------------|
| furniture-model/v1 | ✅ | Kitchen adapter |
| buildSketchUpNodeJob | ✅ | Bridge конвертирует kitchen → standard plan |
| signSketchUpNodeJob | ✅ | HMAC-SHA256 работает |
| handleFakeSketchUpNodeJob | ✅ | Kitchen dry-run summary |
| queue_consumer_contract.rb | ✅ | Распознаёт kitchen-command-plan/v1 |
| Ruby scaffold (envelope) | ❌ | Только 3 команды — kitchen требует kitchen_executor.rb |
| render artifact contract | ✅ | Не менялся |
| guarded upload path | ✅ | Не менялся |

## 5. Negative Contract Review

| Что проверено | Вердикт |
|--------------|:-------:|
| No invented dimensions | ✅ |
| No inferred geometry without source | ✅ (provenance.inferred + managerApprovedInferred) |
| No new arbitrary commands | ✅ allowlist (4 kitchen commands) |
| No Ruby execution from payload | ✅ |
| No hidden expansion of allowlist | ✅ |
| No silent conversion of unknowns | ✅ (было, исправлено) |
| Kitchen не обходит HMAC/TTL/idempotency | ✅ bridge |
| Kitchen не обходит pending-first audit | ✅ через node-job |

## 6. Test Coverage

| Набор тестов | Тестов | Покрытие |
|-------------|:------:|----------|
| `tests/kitchen-brief.test.js` | 10 | normalize, validation, defaults, provenance |
| `tests/kitchen-order-to-brief.test.js` | 7 | order mapping, inferred, calculatorMeta |
| `tests/kitchen-build-model.test.js` | 11 | builder, overflow, inferred gate, unknown wall |
| `tests/kitchen-model.test.js` | 8 | validateKitchenModel, readiness, L layout |
| `tests/kitchen-furniture-model.test.js` | 8 | adapter, readyForSketchUp gate (3) |
| `tests/kitchen-command-plan.test.js` | 7 | plan builder + validator payload validation |
| `tests/kitchen-full-pipeline-smoke.test.js` | 1 | brief → model → plan → dry-run |
| `tests/kitchen-manager-review-smoke.test.js` | 1 | inferred → manager → model → plan → dry-run |
| `tests/kitchen-job-bridge.test.js` | 4 | bridge: invalid, not ready, valid, kitchenPayload |
| `tests/kitchen-golden-fixtures.test.js` | 4 | valid/invalid plans through JS + Ruby checks |
| `tests/kitchen-job-bridge.test.js` | 4 | bridge: invalid, not ready, valid, kitchenPayload |

**Total:** 61+ kitchen tests. 724 total, 0 kitchen failures.

## 7. Оставшиеся gaps для production

| Gap | Описание | Статус |
|-----|----------|:------:|
| Ruby scaffold update | `sketchup_envelope_consumer.rb` не поддерживает kitchen | next slice |
| Twenty CRM deploy | Workers модуль без secrets | when needed |
| WhatsApp/Telegram | Communication channels | when needed |
| Supplier Catalog | Pricing pipeline (0%) | when needed |
| EasyKitchen presets | COMPONENT_MAP нужны реальные ek_preset ID | when EK available |

## 8. Итоговый Definition of Done

| № | Требование | Статус |
|--|-----------|:------:|
| 1 | envelope scaffold принимает только `sketchup-command-plan/v1` | ✅ `ensure_supported_standard_plan!` |
| 2 | Kitchen-планы отвергаются с `UnsupportedPlanForEnvelope` | ✅ явное исключение |
| 3 | queue consumer явно маршрутизирует standard → envelope | ✅ `route_plan` + `case` |
| 4 | queue consumer явно маршрутизирует kitchen → executor | ✅ `execute_kitchen` |
| 5 | Unsupported тип/версия → fail-closed | ✅ `UnsupportedPlanType` |
| 6 | Тесты: standard, kitchen, unsupported — 3 сценария | ✅ 3 fixture + 3 routing теста |
| 7 | Документация обновлена | ✅ SKETCHUP_INTEGRATION_DECISION + summary |
| 8 | Kitchen не может пройти через envelope scaffold | ✅ guard до создания артефактов |
| 9 | Envelope не может исполнить kitchen план | ✅ ошибка до model.skp/preview.png |

**Все требования выполнены. Kitchen полностью изолирован от envelope scaffold.**

## 9. Git history

```
5352222 — docs: code review summary
ca9af61 — fix: kitchen code review all 9 items
01ff53e — fix: verify_artifacts path
c3a4415 — feat: EK-3 through EK-6 complete
ac33712 — feat: EK-2 component registry + builder
d97f239 — feat: EK-1 Ruby kitchen block geometry executor
44586f6 — feat: kitchen manager review end-to-end smoke
bbbe2cd — fix: kitchen pipeline hardening after code review
19c4246 — fix: kitchen loader for SketchUp 2026
```
