# Stage 1 review fixes summary

Дата: 2026-05-30
Коммит: `903f76f stage1: stabilize order intake flow`

## Контекст

Файл `furniture-mvp-stage1-review-notes.md` был использован как чек-лист стабилизации Этапа 1 для проекта `furniture-orders-mvp`.

Цель правок: закрыть замечания перед переходом к Этапу 2, не переписывая архитектуру MVP.

## Что было исправлено

### 1. Подтверждён синтаксис и тесты

Выполнены проверки:

```bash
npm.cmd run check
npm.cmd test
```

Результат:

- синтаксис `functions/api/orders.js` и `src/orders-core.js` валиден;
- тесты проходят;
- после правок тестов стало 5.

### 2. D1 binding оставлен каноническим как `DB`

Имя binding не менялось и осталось единым:

- `wrangler.toml`: `binding = "DB"`;
- `functions/api/orders.js`: использует `context.env.DB`;
- README описывает binding `DB`.

Альтернативные имена вроде `ORDERS_DB` не добавлялись.

### 3. README дополнен структурой проекта

В `README.md` добавлен раздел `Структура проекта`:

```text
furniture-orders-mvp/
  functions/api/orders.js
  src/orders-core.js
  public/index.html
  migrations/0001_orders.sql
  migrations/0002_orders_updated_at.sql
  tests/orders-core.test.js
  wrangler.toml
  package.json
```

### 4. `ensureSchema()` переведён в dev-only режим

До правки runtime-создание схемы выполнялось при каждом вызове `createOrder()`.

После правки:

- `ensureSchema(db, env)` запускается только если `env.RUNTIME_SCHEMA_INIT === "true"`;
- production опирается на D1 migrations;
- `npm run dev` передаёт `--binding RUNTIME_SCHEMA_INIT=true`, чтобы локальная проверка оставалась удобной.

Файлы:

- `src/orders-core.js`
- `package.json`
- `README.md`

### 5. Dev schema upgrade стал устойчивее

Для старых локальных D1-баз добавлена мягкая проверка колонки `orders.updated_at`.

Логика:

- читается `PRAGMA table_info(orders)`;
- если `updated_at` отсутствует, выполняется `ALTER TABLE orders ADD COLUMN updated_at TEXT`;
- это работает только в dev-only режиме через `RUNTIME_SCHEMA_INIT=true`.

### 6. Telegram-сообщение локализовано

Telegram-текст вынесен в отдельную функцию `formatTelegramMessage()`.

Новый формат:

```text
Новая заявка на мебель
Заказ: #123
Клиент: Ерлан
Телефон: +77011234567
Город: Алматы
Тип: kitchen
Бюджет: 850000
Комментарий: Нужна угловая кухня
Источник: site
```

Файлы:

- `src/orders-core.js`
- `tests/orders-core.test.js`
- `README.md`

### 7. Форма сверена с backend-контрактом

Поля формы в `public/index.html` совпадают с `normalizeOrderPayload()`:

- `name`
- `phone`
- `source`
- `city`
- `furnitureType`
- `budget`
- `description`

Изменения в HTML не потребовались.

### 8. Definition of Done добавлен в README

В `README.md` добавлен раздел `Definition of Done для Этапа 1`.

Он фиксирует условия закрытия этапа:

- `npm run check` проходит;
- `npm test` проходит;
- форма отправляет заявку;
- `curl` создаёт заявку;
- в D1 появляется клиент;
- в D1 появляется заказ со статусом `new`;
- Telegram работает при заданных env-переменных;
- секреты не захардкожены.

### 9. Добавлен `updated_at` для заказов

Внесены изменения:

- `migrations/0001_orders.sql`: для новых баз `orders.updated_at` создаётся сразу;
- `migrations/0002_orders_updated_at.sql`: для уже существующей удалённой базы добавляет колонку `updated_at`;
- `src/orders-core.js`: INSERT теперь заполняет `updated_at = CURRENT_TIMESTAMP`.

Удалённая D1-миграция применена:

```bash
npx.cmd wrangler d1 migrations apply furniture_orders --remote
```

Проверка удалённой схемы подтвердила наличие `orders.updated_at`.

## Что проверено вручную

Локальный dev-сервер:

```bash
npm run dev
```

Проверки:

- `GET /` вернул `200`;
- валидный `POST /api/orders` вернул `201`;
- невалидный `POST /api/orders` вернул `400`.

Пример успешного ответа:

```json
{
  "success": true,
  "orderId": 3,
  "clientId": 1,
  "status": "new",
  "telegramSent": false
}
```

## Deploy

После правок выполнен production deploy на Cloudflare Pages:

```bash
npm.cmd run deploy
```

Новый deployment:

```text
https://6b2b2861.furniture-orders-mvp.pages.dev
```

Cloudflare Pages показал production deployment для ветки `main` и коммита `903f76f`.

## Что осталось вне коммита

Файл `furniture-mvp-stage1-review-notes.md` оставлен untracked как входной файл ревью и не включён в приложение.

## Итог

Этап 1 стабилизирован:

- входящий контракт не сломан;
- D1 binding остался `DB`;
- production использует миграции;
- локальная разработка остаётся простой;
- Telegram-сообщение стало понятным менеджеру;
- README теперь пригоден для передачи проекта следующему разработчику или ревьюеру.
