# Furniture Orders MVP — Stage 2 implementation summary

Дата: 2026-05-30
Коммит: `e9ff32a stage2: add order operations admin`
Production deploy: `https://87aa4af9.furniture-orders-mvp.pages.dev`
Production admin URL: `https://furniture-orders-mvp.pages.dev/admin`

## Цель этапа

Этап 2 переводит проект от простого приёма заявок к минимальной операционной панели для менеджера мебельной компании.

После этапа менеджер может:

- видеть список заказов;
- фильтровать заказы по статусу;
- менять статус заказа;
- оставлять внутреннюю заметку;
- работать через простую admin page;
- при этом старый intake-поток `POST /api/orders` остаётся совместимым с Этапом 1.

## Что было реализовано

### 1. Единый список статусов

Добавлен файл:

```text
src/order-statuses.js
```

В нём зафиксированы допустимые статусы:

```js
[
  "new",
  "in_review",
  "quoted",
  "in_production",
  "completed",
  "canceled"
]
```

Также добавлена функция `isOrderStatus(value)` для валидации статусов.

### 2. Расширение схемы D1

Добавлена новая миграция:

```text
migrations/0003_order_notes.sql
```

Содержимое:

```sql
ALTER TABLE orders ADD COLUMN notes TEXT;
```

Также обновлена базовая миграция:

```text
migrations/0001_orders.sql
```

Для новых баз колонка `notes` теперь создаётся сразу вместе с таблицей `orders`.

Удалённая D1-миграция применена командой:

```bash
npx.cmd wrangler d1 migrations apply furniture_orders --remote
```

После применения была выполнена проверка схемы:

```bash
npx.cmd wrangler d1 execute furniture_orders --remote --command "PRAGMA table_info(orders)"
```

Результат подтвердил наличие колонки:

```text
notes TEXT
```

### 3. Backend: список заказов

В `src/orders-core.js` добавлена функция:

```js
listOrders({ db, env, status })
```

Она:

- читает заказы из `orders`;
- делает `JOIN` с `clients`;
- возвращает `clientName` и `phone`;
- сортирует по `created_at DESC, id DESC`;
- поддерживает фильтр по статусу;
- возвращает `400 invalid_status`, если статус не входит в `ORDER_STATUSES`.

### 4. API: `GET /api/orders`

Расширен файл:

```text
functions/api/orders.js
```

Теперь он поддерживает:

- `POST /api/orders` — старый intake endpoint;
- `GET /api/orders` — новый admin endpoint списка заказов.

Пример:

```bash
curl "https://your-domain.com/api/orders?status=new" \
  -H "X-Admin-Token: your-admin-token"
```

### 5. Backend: обновление статуса

В `src/orders-core.js` добавлена функция:

```js
updateOrderStatus({ db, env, orderId, status, notes })
```

Она:

- валидирует `orderId`;
- валидирует `status`;
- проверяет существование заказа;
- обновляет `status`, `notes`, `updated_at`;
- возвращает обновлённую запись;
- возвращает `400 invalid_status` при неверном статусе;
- возвращает `404 order_not_found` при несуществующем заказе.

### 6. API: `POST /api/orders/status`

Добавлен файл:

```text
functions/api/orders/status.js
```

Endpoint принимает:

```json
{
  "orderId": 12,
  "status": "in_review",
  "notes": "Клиенту нужно уточнить размеры"
}
```

И обновляет заказ.

### 7. Минимальная защита admin API

Добавлена защита через env secret:

```text
ADMIN_TOKEN
```

Защищены endpoints:

- `GET /api/orders`;
- `POST /api/orders/status`.

Токен можно передавать двумя способами:

```text
X-Admin-Token: <token>
Authorization: Bearer <token>
```

Если токен отсутствует:

- при не настроенном `ADMIN_TOKEN` API возвращает `503 admin_not_configured`;
- при неверном или отсутствующем токене API возвращает `401 unauthorized`.

Для локальной разработки `package.json` теперь передаёт dev token:

```bash
--binding ADMIN_TOKEN=dev-admin-token
```

Для production был сгенерирован новый токен и установлен в Cloudflare Pages secrets:

```bash
npx.cmd wrangler pages secret put ADMIN_TOKEN --project-name=furniture-orders-mvp
```

Локальная копия production token сохранена здесь:

```text
C:\tmp\furniture-orders-admin-token.txt
```

### 8. Admin page

Добавлен файл:

```text
public/admin.html
```

Страница доступна локально:

```text
http://127.0.0.1:8788/admin
```

И в production:

```text
https://furniture-orders-mvp.pages.dev/admin
```

Возможности страницы:

- ввод и сохранение admin token в `localStorage`;
- фильтр по статусу;
- таблица заказов;
- колонки: ID, клиент, телефон, тип, город, бюджет, статус, дата создания, дата обновления, заметка;
- select для смены статуса;
- textarea для заметки;
- кнопка обновления заказа.

UI сделан без SPA-фреймворка, только HTML/CSS/vanilla JS.

### 9. README обновлён

Обновлён файл:

```text
README.md
```

Добавлено:

- описание `GET /api/orders`;
- описание `POST /api/orders/status`;
- описание `ADMIN_TOKEN`;
- структура проекта с новыми файлами;
- адрес локальной админки;
- примеры `curl` для списка, фильтра и смены статуса.

### 10. `.gitignore`

В `.gitignore` добавлено:

```text
output/
```

Это нужно, чтобы Playwright screenshots не попадали в Git.

## Какие проверки были выполнены

### Автоматические проверки

Синтаксис:

```bash
npm.cmd run check
```

Результат: успешно.

Тесты:

```bash
npm.cmd test
```

Результат:

```text
11 tests
11 pass
0 fail
```

### Что покрыто тестами

В `tests/orders-core.test.js` добавлены проверки:

- список допустимых статусов;
- `isOrderStatus()`;
- список заказов с client fields;
- фильтр по статусу;
- `400 invalid_status` для неверного фильтра;
- обновление статуса и `notes`;
- `400 invalid_status` для неверного статуса;
- `404 order_not_found` для несуществующего заказа.

Старые тесты Этапа 1 также продолжают проходить:

- нормализация intake payload;
- обязательные поля `name` и `phone`;
- создание клиента и заказа;
- Telegram integration;
- `400` без записи в БД при невалидной заявке.

### Ручные проверки API локально

Dev server:

```bash
npm run dev -- --port 8788
```

Проверки:

1. Создание нового заказа:

```bash
POST http://127.0.0.1:8788/api/orders
```

Результат:

```text
201 Created
```

2. Получение списка заказов:

```bash
GET http://127.0.0.1:8788/api/orders
X-Admin-Token: dev-admin-token
```

Результат:

```text
200 OK
```

3. Фильтр по статусу:

```bash
GET http://127.0.0.1:8788/api/orders?status=in_review
X-Admin-Token: dev-admin-token
```

Результат:

```text
200 OK
```

4. Смена статуса:

```bash
POST http://127.0.0.1:8788/api/orders/status
X-Admin-Token: dev-admin-token
```

Результат:

```text
200 OK
```

В ответе заказ получил:

```json
{
  "status": "in_review",
  "notes": "Need dimensions"
}
```

5. Неверный статус:

```text
400 Bad Request
invalid_status
```

6. Несуществующий заказ:

```text
404 Not Found
order_not_found
```

7. Запрос без admin token:

```text
401 Unauthorized
unauthorized
```

### Визуальная проверка admin UI

Сделаны Playwright screenshots:

```text
output/playwright/stage2-admin.png
output/playwright/stage2-admin-loaded.png
output/playwright/stage2-admin-mobile.png
```

Проверено:

- admin page не пустая;
- форма token/filter видна;
- таблица заказов отображается;
- данные заказов отображаются после сохранённого token;
- desktop layout читаемый;
- mobile layout не ломается, таблица доступна через горизонтальный скролл.

Папка `output/` добавлена в `.gitignore`.

## Deploy

После коммита выполнен deploy:

```bash
npm.cmd run deploy
```

Cloudflare Pages deployment:

```text
https://87aa4af9.furniture-orders-mvp.pages.dev
```

Deployment привязан к:

```text
branch: main
commit: e9ff32a
```

## Git

Создан и запушен коммит:

```text
e9ff32a stage2: add order operations admin
```

Push выполнен в:

```text
origin/main
https://github.com/Murkin1980/furniture-orders-mvp
```

## Что осталось вне коммита

Следующие markdown-файлы оставлены untracked как входные/рабочие документы и не включены в код приложения:

```text
furniture-mvp-stage1-review-notes.md
furniture-mvp-stage2-instructions.md
furniture-stage1-review-fixes-summary.md
```

Этот файл отчёта тоже создан отдельно для ревьюера.

## Итог

Definition of Done для Этапа 2 закрыт:

- миграция для `notes` есть;
- `updated_at` уже был добавлен на Этапе 1 и используется при update;
- единый список статусов есть;
- `GET /api/orders` работает;
- фильтр по статусу работает;
- endpoint смены статуса работает;
- `updated_at` обновляется при смене статуса;
- admin page показывает список заказов;
- admin page позволяет менять статус и заметку;
- `POST /api/orders` не сломан;
- `npm run check` и `npm test` проходят.
