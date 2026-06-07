# Furniture Orders MVP — Stage 3 WIP handoff

Дата: 2026-05-30
Статус: Этап 3 в работе, не коммитить/деплоить без финальной проверки.

## Цель Этапа 3

Добавить project layer поверх заказов:

- шаблоны мебельных проектов;
- шаги шаблона;
- рабочие шаги заказа;
- ленивую инициализацию project steps при переводе заказа в `in_review`;
- API чтения/обновления шагов;
- отображение шагов в `admin.html`;
- обновить README и создать финальный файл для ревьюера после завершения.

## Уже добавлено в код

Новые файлы:

```text
src/project-templates.js
migrations/0004_project_steps.sql
functions/api/order-steps.js
functions/api/order-steps/update.js
functions/api/orders/project/init.js
```

Изменены:

```text
package.json
src/orders-core.js
public/admin.html
tests/orders-core.test.js
```

## Что реализовано

### Project templates

`src/project-templates.js`:

- `PROJECT_TEMPLATES`
- `STEP_STATUSES`
- `isStepStatus(value)`
- `findProjectTemplate(furnitureType)`
- `getTemplateSteps(template)`

Шаблоны:

- `kitchen-basic`
- `wardrobe-basic`
- `casework-basic`

### Migration

`migrations/0004_project_steps.sql` создаёт:

- `project_templates`
- `template_steps`
- `order_steps`

Индексы:

- `idx_template_steps_template_id`
- `idx_order_steps_order_id`
- `idx_order_steps_status`

### Core functions

В `src/orders-core.js` добавлены:

- `createOrderProjectSteps({ db, env, orderId })`
- `listOrderSteps({ db, env, orderId })`
- `updateOrderStep({ db, env, orderId, stepId, status, notes, completedBy })`

Также:

- `ensureSchema()` в dev mode создаёт Stage 3 таблицы;
- `seedProjectTemplates(db)` сидит шаблоны;
- `updateOrderStatus()` при переходе в `in_review` вызывает `createOrderProjectSteps()`.

### API

Добавлены Pages Functions:

- `GET /api/order-steps?orderId=123`
- `POST /api/order-steps/update`
- `POST /api/orders/project/init`

Все защищены `ADMIN_TOKEN`.

### Admin UI

`public/admin.html` расширен:

- кнопка `Открыть проект`;
- панель `Шаги заказа`;
- прогресс `done/total`;
- select статуса шага: `pending`, `done`, `skipped`;
- заметка по шагу;
- сохранение шага через `/api/order-steps/update`.

## Проверки, которые уже прошли

```bash
npm.cmd run check
```

Прошёл успешно.

```bash
npm.cmd test
```

После обновления mock D1 прошёл успешно:

```text
16 tests
16 pass
```

## Локальная ручная проверка

Dev server был поднят:

```bash
npm run dev -- --port 8788
```

Создан тестовый заказ:

```text
POST /api/orders
orderId: 5
```

Перевод в `in_review`:

```text
POST /api/orders/status
```

Вернул `projectSteps` с 11 kitchen steps.

Обновление шага:

```text
POST /api/order-steps/update
```

Для `stepId: 1` вернул:

```json
{
  "status": "done",
  "notes": "Measured",
  "completedBy": "manager"
}
```

Неверный step status вернул:

```text
400 invalid_step_status
```

## Важное подозрение / незакрытая проверка

После инициализации steps ручной запрос:

```text
GET /api/order-steps?orderId=5
```

вернул:

```json
{"success":true,"items":[]}
```

Но `POST /api/order-steps/update` для `stepId: 1` успешно нашёл и обновил шаг.

Нужно разобраться перед коммитом:

- проверить SQL в `listOrderSteps()`;
- проверить, не было ли проблемы с URL quoting в `curl.exe --%`;
- проверить D1 напрямую:

```bash
npx.cmd wrangler d1 execute DB --local --command "SELECT id, order_id, step_code, status FROM order_steps WHERE order_id = 5"
```

Если в D1 строки есть, проблема в endpoint/list query или ручном запросе.

## Следующие шаги

1. Разобраться с `GET /api/order-steps?orderId=5` empty result.
2. Повторить ручные checks:

```bash
curl.exe --% -s -i http://127.0.0.1:8788/api/order-steps?orderId=5 -H "X-Admin-Token: dev-admin-token"
curl.exe --% -s -i -X POST http://127.0.0.1:8788/api/orders/project/init -H "Content-Type: application/json" -H "X-Admin-Token: dev-admin-token" --data "{\"orderId\":5}"
```

3. Проверить admin UI screenshot с token:

```bash
npx.cmd --yes playwright screenshot --viewport-size "1440,1000" --wait-for-timeout 1200 --load-storage C:\tmp\furniture-admin-storage.json http://127.0.0.1:8788/admin output\playwright\stage3-admin-loaded.png
```

4. Обновить README под Этап 3.
5. Создать финальный файл для ревьюера:

```text
furniture-stage3-implementation-summary.md
```

6. Применить remote migration:

```bash
npx.cmd wrangler d1 migrations apply furniture_orders --remote
```

7. Финальные проверки:

```bash
npm.cmd run check
npm.cmd test
```

8. Commit, push, deploy.

## Не трогать без явного решения

Untracked markdown-файлы с инструкциями и отчётами пока оставлены как рабочие документы:

```text
furniture-mvp-stage1-review-notes.md
furniture-mvp-stage2-instructions.md
furniture-mvp-stage2-recommendations.md
furniture-mvp-stage3-instructions.md
furniture-stage1-review-fixes-summary.md
furniture-stage2-implementation-summary.md
```

Их не коммитить вместе с кодом, если пользователь не попросит.
