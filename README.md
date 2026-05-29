# Furniture Orders MVP

Минимальный backend + тестовый frontend для приёма заявок мебельной мастерской. Проект сделан под Cloudflare Pages Functions и D1: сайт отдаёт форму, Function принимает заявку, сохраняет клиента и заказ, а затем при наличии переменных окружения отправляет уведомление менеджеру в Telegram.

Проект сейчас закрывает Этап 1 и Этап 2:

- Этап 1: приём входящих заявок.
- Этап 2: минимальная операционная панель для просмотра заказов и смены статусов.

## Production

- Сайт: `https://furniture-orders-mvp.pages.dev`
- Админка: `https://furniture-orders-mvp.pages.dev/admin`
- Последний deploy Этапа 2: `https://87aa4af9.furniture-orders-mvp.pages.dev`
- GitHub: `https://github.com/Murkin1980/furniture-orders-mvp`

## Что уже есть

- `POST /api/orders` принимает единый JSON-контракт заявки.
- `GET /api/orders` возвращает список заказов для менеджера.
- `POST /api/orders/status` обновляет статус и заметку заказа.
- D1-схема создаёт таблицы `clients` и `orders`.
- Обязательные поля: `name`, `phone`.
- Новая заявка получает статус `new`.
- Ошибки валидации возвращаются с кодом `400`.
- Внутренние ошибки возвращаются с кодом `500` без стека.
- Telegram-уведомление отправляется, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- `public/index.html` даёт тестовую форму для ручной отправки.
- `public/admin.html` даёт минимальную админку со списком заказов.
- `src/orders-core.js` содержит основную бизнес-логику отдельно от Cloudflare-слоя.
- `src/order-statuses.js` содержит единый список допустимых статусов.
- `tests/orders-core.test.js` проверяет intake flow, список заказов, фильтр, смену статуса, `400` и `404`.

## Структура проекта

```text
furniture-orders-mvp/
  functions/api/orders.js
  functions/api/orders/status.js
  src/orders-core.js
  src/order-statuses.js
  public/index.html
  public/admin.html
  migrations/0001_orders.sql
  migrations/0002_orders_updated_at.sql
  migrations/0003_order_notes.sql
  tests/orders-core.test.js
  wrangler.toml
  package.json
```

## Контракт заявки

```json
{
  "name": "Ерлан",
  "phone": "+77011234567",
  "source": "site",
  "city": "Алматы",
  "furnitureType": "kitchen",
  "budget": 850000,
  "description": "Нужна угловая кухня, белый матовый фасад"
}
```

## Статусы заказов

Допустимые статусы зафиксированы в `src/order-statuses.js`:

```text
new
in_review
quoted
in_production
completed
canceled
```

Любой другой статус возвращает `400 invalid_status`.

## Локальная проверка

```bash
npm install
npm run check
npm test
npm run dev
```

После запуска форма будет доступна на локальном адресе Wrangler, обычно `http://127.0.0.1:8788`. В локальном режиме API сам создаёт таблицы `clients` и `orders`, чтобы ручная проверка не зависела от отдельного шага миграции.

Runtime-создание схемы включается только в `npm run dev` через `RUNTIME_SCHEMA_INIT=true`. Для production используйте D1 migrations; это основной способ закреплять схему базы.

Локальная админка доступна по адресу `http://127.0.0.1:8788/admin`. Dev token по умолчанию:

```text
dev-admin-token
```

## Рекомендуемый деплой

Лучший вариант для этого проекта — Cloudflare Pages:

- Pages напрямую обслуживает папку `public`.
- Pages Functions автоматически подхватывает файлы из `functions`.
- D1 подключается как binding `DB`.
- Telegram-токен и chat id хранятся в переменных окружения Cloudflare, а не в репозитории.
- GitHub-интеграция даёт автоматические деплои после push в `main`.

### Вариант A: через GitHub integration

1. Создайте D1-базу:

```bash
npx wrangler d1 create furniture_orders
```

2. Вставьте полученный `database_id` в `wrangler.toml`.

3. Примените миграцию:

```bash
npx wrangler d1 migrations apply furniture_orders --remote
```

4. В Cloudflare откройте Workers & Pages, создайте Pages project из GitHub-репозитория.

5. Настройки проекта:

```text
Framework preset: None
Build command: npm run check && npm test
Build output directory: public
Root directory: /
```

6. В Settings добавьте D1 binding:

```text
Variable name: DB
D1 database: furniture_orders
```

7. В Settings добавьте переменные окружения:

```text
ADMIN_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

### Вариант B: ручной deploy через Wrangler

```bash
npx wrangler d1 create furniture_orders
npx wrangler d1 migrations apply furniture_orders --remote
npm run deploy
```

После ручного deploy всё равно нужно проверить, что в Pages project подключён D1 binding `DB` и заданы production variables.

## Переменные окружения

Для production в Cloudflare Pages задайте:

- `ADMIN_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Если Telegram-переменные не заданы, заявка всё равно сохраняется, а в ответе будет `telegramSent: false`.

`ADMIN_TOKEN` защищает операционные endpoints:

- `GET /api/orders`
- `POST /api/orders/status`

Если `ADMIN_TOKEN` не задан, admin endpoints возвращают `503 admin_not_configured`.

Production `ADMIN_TOKEN` уже установлен в Cloudflare Pages secrets. Локальная копия токена для ручной проверки сохранена в:

```text
C:\tmp\furniture-orders-admin-token.txt
```

Telegram-сообщение отправляется в прикладном формате для менеджера:

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

## Definition of Done для Этапа 1

- `npm run check` проходит без ошибок.
- `npm test` проходит без ошибок.
- Форма отправляет заявку через UI.
- `curl` из README успешно создаёт заявку.
- В D1 появляется клиент.
- В D1 появляется заказ со статусом `new`.
- Telegram-уведомление приходит при заданных env-переменных.
- Секреты не захардкожены в коде.

## Definition of Done для Этапа 2

- Есть миграция `0003_order_notes.sql`.
- В коде есть единый список допустимых статусов.
- `GET /api/orders` возвращает список заказов.
- Фильтр `GET /api/orders?status=new` работает.
- `POST /api/orders/status` меняет статус и заметку.
- `updated_at` обновляется при смене статуса.
- `public/admin.html` показывает список заказов.
- Админка позволяет сменить статус и заметку.
- `POST /api/orders` из Этапа 1 продолжает работать.
- `npm run check` и `npm test` проходят.

## Миграции D1

```text
0001_orders.sql          Базовые таблицы clients и orders.
0002_orders_updated_at   Добавляет orders.updated_at для существующей базы.
0003_order_notes.sql     Добавляет orders.notes для Этапа 2.
```

Применить миграции к production D1:

```bash
npx wrangler d1 migrations apply furniture_orders --remote
```

## Ручной тест API

```bash
curl -X POST https://your-domain.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ерлан",
    "phone": "+77011234567",
    "source": "site",
    "city": "Алматы",
    "furnitureType": "kitchen",
    "budget": 850000,
    "description": "Нужна угловая кухня"
  }'
```

## Ручной тест admin API

Список заказов:

```bash
curl https://your-domain.com/api/orders \
  -H "X-Admin-Token: your-admin-token"
```

Фильтр по статусу:

```bash
curl "https://your-domain.com/api/orders?status=new" \
  -H "X-Admin-Token: your-admin-token"
```

Обновление статуса:

```bash
curl -X POST https://your-domain.com/api/orders/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "orderId": 1,
    "status": "in_review",
    "notes": "Клиенту нужно уточнить размеры"
  }'
```

Успешный ответ:

```json
{
  "success": true,
  "orderId": 1,
  "clientId": 1,
  "status": "new",
  "telegramSent": false
}
```

## Ручная проверка админки

1. Откройте `https://furniture-orders-mvp.pages.dev/admin`.
2. Вставьте `ADMIN_TOKEN`.
3. Нажмите `Сохранить`.
4. Проверьте список заказов.
5. Поменяйте статус заказа, например на `in_review`.
6. Добавьте заметку менеджера.
7. Нажмите `Обновить`.

## Проверки перед коммитом

```bash
npm run check
npm test
```

На момент обновления README тестовый набор:

```text
11 tests
11 pass
```

## Следующий этап

Логичный Этап 3:

- шаблоны проектов;
- чек-листы по типу мебели;
- внутренние этапы производства;
- уведомления по ключевым переходам статусов;
- более удобная операционная панель без усложнения текущего intake-контракта.
