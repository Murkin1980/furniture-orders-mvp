# Furniture Orders MVP

Минимальный backend + тестовый frontend для приёма заявок мебельной мастерской. Проект сделан под Cloudflare Pages Functions и D1: сайт отдаёт форму, Function принимает заявку, сохраняет клиента и заказ, а затем при наличии переменных окружения отправляет уведомление менеджеру в Telegram.

Базовый проект для первого шага: приём мебельных заявок через Cloudflare Pages + Functions.

## Что уже есть

- `POST /api/orders` принимает единый JSON-контракт заявки.
- D1-схема создаёт таблицы `clients` и `orders`.
- Обязательные поля: `name`, `phone`.
- Новая заявка получает статус `new`.
- Ошибки валидации возвращаются с кодом `400`.
- Внутренние ошибки возвращаются с кодом `500` без стека.
- Telegram-уведомление отправляется, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- `public/index.html` даёт тестовую форму для ручной отправки.
- `src/orders-core.js` содержит основную бизнес-логику отдельно от Cloudflare-слоя.
- `tests/orders-core.test.js` проверяет нормализацию, валидацию, создание заказа и Telegram-интеграцию.

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

## Локальная проверка

```bash
npm install
npm run check
npm test
npm run dev
```

После запуска форма будет доступна на локальном адресе Wrangler, обычно `http://127.0.0.1:8788`. В локальном режиме API сам создаёт таблицы `clients` и `orders`, чтобы ручная проверка не зависела от отдельного шага миграции.

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
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

### Вариант B: ручной deploy через Wrangler

```bash
npx wrangler d1 create furniture_orders
npx wrangler d1 migrations apply furniture_orders --remote
npm run deploy
```

После ручного deploy всё равно нужно проверить, что в Pages project подключён D1 binding `DB` и заданы Telegram variables.

## Переменные окружения

Для Telegram в Cloudflare Pages задайте:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Если переменные не заданы, заявка всё равно сохраняется, а в ответе будет `telegramSent: false`.

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
