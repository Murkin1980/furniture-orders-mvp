# Furniture Orders MVP

Минимальный backend + тестовый frontend для приёма заявок мебельной мастерской. Проект сделан под Cloudflare Pages Functions и D1: сайт отдаёт форму, Function принимает заявку, сохраняет клиента и заказ, а затем при наличии переменных окружения отправляет уведомление менеджеру в Telegram.

Проект сейчас закрывает Этап 1, Этап 2, рабочий проход Этапа 3 и подэтап 4.01:

- Этап 1: приём входящих заявок.
- Этап 2: минимальная операционная панель для просмотра заказов и смены статусов.
- Этап 3: проектные шаги заказа по шаблонам мебели.
- Этап 4.01: мебельный калькулятор как embeddable widget.
- Этап 4.02: редактор цен, коэффициентов и формул калькулятора в админке.
- Этап 4.03: безопасный VPS control layer через внешний лёгкий control API.
- Этап 4.04A: модуль лендингов мебельщиков как отдельная сущность с доменами, статусом и dry-run publish flow через VPS layer.
- Этап 4.05: портфолио и публичная галерея работ с категориями и publish/unpublish flow.
- Этап 4-R: начат стабилизационный refactor lane для админки и API-контрактов без изменения продуктового поведения.

## Production

- Сайт: `https://furniture-orders-mvp.pages.dev`
- Админка: `https://furniture-orders-mvp.pages.dev/admin`
- Preview deployment URLs смотрите в Cloudflare Pages deployments.
- GitHub: `https://github.com/Murkin1980/furniture-orders-mvp`

## Что уже есть

- `POST /api/orders` принимает единый JSON-контракт заявки.
- `GET /api/orders` возвращает список заказов для менеджера.
- `POST /api/orders/status` обновляет статус и заметку заказа.
- `GET /api/order-steps` возвращает шаги проекта заказа.
- `POST /api/order-steps/update` обновляет статус и заметку шага.
- `POST /api/orders/project/init` создаёт проектные шаги для заказа вручную.
- `GET /api/calculators` и `POST /api/calculators` управляют калькуляторами.
- `GET /api/calculators/:id/embed` генерирует embed-код для админки или отдаёт публичный widget script по token.
- `POST /api/calculators/:id/lead` сохраняет расчёт из виджета как обычную заявку.
- `GET /api/calculators/:id/pricing` и `PUT /api/calculators/:id/pricing` читают и сохраняют draft pricing для калькулятора.
- `GET /api/calculators/:id/rules` и `PUT /api/calculators/:id/rules` управляют коэффициентами и надбавками.
- `POST /api/calculators/:id/preview` считает draft preview без публикации.
- `POST /api/calculators/:id/publish` теперь копирует draft pricing/rules в published, и embed использует published-версию.
- Calculator leads сохраняют `calculatorMeta` в `raw_payload`: `calculatorId`, `categoryCode`, `units`, `materialRuleCode`, `materialMultiplier`, `estimate`, `formulaVersion`.
- `GET /api/vps/health`, `GET /api/vps/services`, `POST /api/vps/deploy/site`, `POST /api/vps/reload/webserver`, `GET /api/vps/deploy/logs` дают admin proxy к внешнему VPS control API.
- `GET /api/sites`, `POST /api/sites`, `GET /api/sites/:id`, `POST /api/sites/:id/deploy`, `GET /api/sites/:id/status` управляют лендингами, доменами и статусами публикации.
- `GET /api/portfolio`, `POST /api/portfolio`, `PUT /api/portfolio/:id`, `POST /api/portfolio/:id/images`, `POST /api/portfolio/:id/publish` управляют портфолио работ.
- `GET /api/portfolio` без admin token отдаёт только опубликованные работы для публичного gallery block на главной странице.
- D1-схема создаёт таблицы `clients` и `orders`.
- Обязательные поля: `name`, `phone`.
- Новая заявка получает статус `new`.
- Ошибки валидации возвращаются с кодом `400`.
- Внутренние ошибки возвращаются с кодом `500` без стека.
- Telegram-уведомление отправляется, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- `public/index.html` даёт тестовую форму для ручной отправки.
- `public/admin.html` даёт минимальную админку со списком заказов.
- `public/admin.html` использует общий `adminFetchJson` helper для admin JSON-запросов; Stage 4-R slice 1-2 покрывают portfolio, sites, VPS, orders, project steps и calculators/pricing panels.
- `src/orders-core.js` содержит основную бизнес-логику отдельно от Cloudflare-слоя.
- `src/order-statuses.js` содержит единый список допустимых статусов.
- `src/project-templates.js` содержит шаблоны проектных шагов.
- `src/calculators-core.js` содержит бизнес-логику калькуляторов, embed token и lead flow.
- `src/calculators-pricing.js` содержит единые defaults, версию runtime/formula и чистую формулу расчёта для preview/runtime/lead.
- `src/vps-control.js` содержит безопасный клиент VPS control API и валидацию deploy/reload payload.
- `src/sites-core.js` содержит бизнес-логику Stage 4.04A для сайтов, доменов и записей публикации.
- `src/portfolio-core.js` содержит бизнес-логику Stage 4.05 для категорий, работ портфолио, изображений и публикации.
- `vps-control-service/` содержит Ubuntu-side MVP сервиса, который принимает запросы Cloudflare proxy и выполняет только allowlisted VPS actions.
- `src/phone.js` содержит общую нормализацию и проверку телефона для заявок и calculator leads.
- `tests/orders-core.test.js` проверяет intake flow, список заказов, фильтр, смену статуса, проектные шаги, калькуляторы, негативные embed/lead сценарии, `400` и `404`.
- `tests/sites-core.test.js` проверяет создание лендинга, уникальность slug, primary domain, publish dry run и статус публикации.
- `tests/portfolio-core.test.js` проверяет создание работ, категории, изображения, публичный список, фильтр и запрет публикации без фото.

## Структура проекта

```text
furniture-orders-mvp/
  functions/api/orders.js
  functions/api/orders/status.js
  functions/api/orders/project/init.js
  functions/api/order-steps.js
  functions/api/order-steps/update.js
  functions/api/calculators.js
  functions/api/calculators/[id].js
  functions/api/calculators/[id]/publish.js
  functions/api/calculators/[id]/embed.js
  functions/api/calculators/[id]/lead.js
  functions/api/calculators/[id]/pricing.js
  functions/api/calculators/[id]/rules.js
  functions/api/calculators/[id]/preview.js
  functions/api/vps/health.js
  functions/api/vps/services.js
  functions/api/vps/deploy/site.js
  functions/api/vps/deploy/logs.js
  functions/api/vps/reload/webserver.js
  functions/api/sites.js
  functions/api/sites/[id].js
  functions/api/sites/[id]/deploy.js
  functions/api/sites/[id]/status.js
  functions/api/portfolio.js
  functions/api/portfolio/[id].js
  functions/api/portfolio/[id]/images.js
  functions/api/portfolio/[id]/publish.js
  src/orders-core.js
  src/order-statuses.js
  src/project-templates.js
  src/calculators-core.js
  src/calculators-pricing.js
  src/vps-control.js
  src/sites-core.js
  src/portfolio-core.js
  src/phone.js
  vps-control-service/
  public/index.html
  public/admin.html
  migrations/0001_orders.sql
  migrations/0002_orders_updated_at.sql
  migrations/0003_order_notes.sql
  migrations/0004_project_steps.sql
  migrations/0005_calculators.sql
  migrations/0006_calculator_pricing.sql
  migrations/0007_sites.sql
  migrations/0008_portfolio.sql
  tests/orders-core.test.js
  tests/sites-core.test.js
  tests/portfolio-core.test.js
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

## Endpoints

| Endpoint | Method | Назначение | Auth |
|---|---:|---|---|
| `/api/orders` | `POST` | Создание новой заявки | Нет |
| `/api/orders` | `GET` | Список заказов для admin | `ADMIN_TOKEN` |
| `/api/orders?status=new` | `GET` | Список заказов с фильтром по статусу | `ADMIN_TOKEN` |
| `/api/orders/status` | `POST` | Смена статуса и заметки | `ADMIN_TOKEN` |
| `/api/order-steps?orderId=1` | `GET` | Шаги проекта заказа | `ADMIN_TOKEN` |
| `/api/order-steps/update` | `POST` | Смена статуса шага проекта | `ADMIN_TOKEN` |
| `/api/orders/project/init` | `POST` | Ручное создание шагов проекта | `ADMIN_TOKEN` |
| `/api/calculators` | `GET` | Список калькуляторов | `ADMIN_TOKEN` |
| `/api/calculators` | `POST` | Создание калькулятора | `ADMIN_TOKEN` |
| `/api/calculators/:id` | `GET` | Детали калькулятора с категориями | `ADMIN_TOKEN` |
| `/api/calculators/:id/publish` | `POST` | Включение калькулятора и выдача embed-кода | `ADMIN_TOKEN` |
| `/api/calculators/:id/embed` | `GET` | Embed-код для admin или публичный widget script с `token` | `ADMIN_TOKEN` или embed token |
| `/api/calculators/:id/lead` | `POST` | Сохранение результата расчёта как заявки | embed token |
| `/api/calculators/:id/pricing` | `GET` | Draft/published цены, правила и поля калькулятора | `ADMIN_TOKEN` |
| `/api/calculators/:id/pricing` | `PUT` | Сохранение draft цен, правил и полей | `ADMIN_TOKEN` |
| `/api/calculators/:id/rules` | `GET` | Draft/published правила калькулятора | `ADMIN_TOKEN` |
| `/api/calculators/:id/rules` | `PUT` | Сохранение draft правил | `ADMIN_TOKEN` |
| `/api/calculators/:id/preview` | `POST` | Расчёт draft preview без публикации | `ADMIN_TOKEN` |
| `/api/vps/health` | `GET` | Health внешнего VPS control API | `ADMIN_TOKEN` |
| `/api/vps/services` | `GET` | Список сервисов VPS control node | `ADMIN_TOKEN` |
| `/api/vps/deploy/site` | `POST` | Запуск deploy статического сайта через VPS control API | `ADMIN_TOKEN` |
| `/api/vps/reload/webserver` | `POST` | Reload `nginx` или `caddy` через VPS control API | `ADMIN_TOKEN` |
| `/api/vps/deploy/logs` | `GET` | Логи deploy worker | `ADMIN_TOKEN` |
| `/api/sites` | `GET` | Список лендингов с primary domain и SSL status | `ADMIN_TOKEN` |
| `/api/sites` | `POST` | Создание лендинга с optional primary domain | `ADMIN_TOKEN` |
| `/api/sites/:id` | `GET` | Детали лендинга, домены и история публикаций | `ADMIN_TOKEN` |
| `/api/sites/:id/deploy` | `POST` | Создание deployment-записи и запуск VPS deploy dry run по умолчанию | `ADMIN_TOKEN` |
| `/api/sites/:id/status` | `GET` | Короткий статус сайта, primary domain и последний deployment | `ADMIN_TOKEN` |
| `/api/portfolio` | `GET` | Публичный список published работ; с admin token возвращает все работы | Нет / `ADMIN_TOKEN` |
| `/api/portfolio?category=kitchens` | `GET` | Фильтр портфолио по категории | Нет / `ADMIN_TOKEN` |
| `/api/portfolio` | `POST` | Создание работы портфолио с URL изображений | `ADMIN_TOKEN` |
| `/api/portfolio/:id` | `GET` | Детали published работы; с admin token доступен draft | Нет / `ADMIN_TOKEN` |
| `/api/portfolio/:id` | `PUT` | Обновление работы, категории, описания, сортировки и фото | `ADMIN_TOKEN` |
| `/api/portfolio/:id/images` | `POST` | Добавление нескольких URL фото к работе | `ADMIN_TOKEN` |
| `/api/portfolio/:id/publish` | `POST` | Publish/unpublish работы портфолио | `ADMIN_TOKEN` |

## Контракт калькулятора Stage 4.02

- Draft pricing редактируется через admin endpoints и не влияет на публичный embed до публикации.
- `POST /api/calculators/:id/publish` копирует draft `calculator_prices` и `calculator_rules` в `published`.
- Публичный runtime `/api/calculators/:id/embed?token=...` отдаёт только published категории/правила/поля.
- В runtime есть `runtimeVersion` и `formulaVersion`, сейчас обе версии равны `1`.
- `materialRuleCode` является каноническим способом выбрать материал. `materialMultiplier` остаётся legacy-полем для старых lead payload без кода материала.
- Неизвестный `materialRuleCode` возвращает `400 validation_error` в preview и lead flow.
- Единая формула расчёта находится в `src/calculators-pricing.js`: `((basePrice + unitPrice * units) * materialMultiplier + fixedAddons) - discountPercent`.

## Контракт VPS control Stage 4.03

- Текущий Cloudflare app не подключается к VPS по SSH. Он проксирует admin actions во внешний лёгкий VPS control API.
- Для включения live-интеграции нужны env-переменные `VPS_CONTROL_BASE_URL` и `VPS_CONTROL_TOKEN`.
- Если env не задан, VPS endpoints возвращают `503 vps_control_not_configured`.
- `POST /api/vps/deploy/site` принимает `siteSlug`, `sourceUrl`, `targetPath`, `dryRun`; по умолчанию `dryRun: true`.
- `POST /api/vps/reload/webserver` принимает только `nginx` или `caddy`.
- Admin UI содержит панель VPS control: health, services, deploy site, reload webserver, logs.
- Stage 4.03 deliberately не запускает heavy AI на VPS: Ollama, Open WebUI, image generation, STT/OCR остаются вне этого node.

## Ubuntu-side VPS control service Stage 4.03B

- Код сервиса лежит в `vps-control-service/`.
- Сервис запускается отдельно на Ubuntu 22.04 через `systemd/furniture-vps-control.service`.
- Все endpoints требуют `Authorization: Bearer <VPS_CONTROL_TOKEN>`.
- Поддержаны `/health`, `/services`, `/reload/webserver`, `/deploy/site`, `/deploy/logs`.
- Real deploy пока намеренно не реализован: `dryRun: false` возвращает `501 deploy_not_implemented`.
- Reload webserver использует allowlisted `sudo /bin/systemctl reload nginx|caddy`, поэтому на VPS нужен узкий `sudoers` rule из README сервиса.
- Router проверяет bearer token до чтения POST body и ограничивает body size через `VPS_CONTROL_MAX_BODY_BYTES`.

## Контракт landing sites Stage 4.04A

- `sites` хранит сайт как отдельную сущность: `name`, `slug`, `ownerName`, `templateKey`, `status`.
- `site_domains` хранит домены сайта, primary flag и `sslStatus`. В MVP SSL status начинается как `unknown`.
- `site_deployments` хранит историю publish-запросов: `status`, `sourceUrl`, `targetPath`, `dryRun`, upstream status и JSON-ответ VPS layer.
- `POST /api/sites` нормализует `slug` из имени, проверяет уникальность slug и может сразу создать primary domain.
- `POST /api/sites/:id/deploy` по умолчанию отправляет `dryRun: true` в VPS control layer. Реальная публикация зависит от Stage 4.03C и реализации deploy на Ubuntu-side service.
- Admin UI содержит блок Landing sites: создание сайта, список сайтов, status, publish dry run и open domain link.

## Контракт portfolio gallery Stage 4.05

- `portfolio_categories` хранит категории работ. Базовый seed: kitchens, wardrobes, dressers, hallways, closets, cabinets, kids, office, tables, other.
- `portfolio_items` хранит работу: `title`, `description`, `categoryCode`, `status`, `sortOrder`, `isFeatured`.
- `portfolio_images` хранит несколько фото по URL: `imageUrl`, `altText`, `sortOrder`, `isCover`.
- `POST /api/portfolio` создаёт draft-работу. Изображения в MVP передаются URL-ами, без бинарной загрузки.
- `POST /api/portfolio/:id/publish` переводит работу в `published`; публикация без хотя бы одного изображения возвращает `400 validation_error`.
- Публичный `GET /api/portfolio` возвращает только `published` работы, а admin-запрос с токеном возвращает draft и published.
- `public/index.html` рендерит gallery block и фильтры по категориям из публичного API.
- `public/admin.html` содержит блок Portfolio gallery: создание работы, список, фильтр, добавление URL фото, publish/unpublish.

## Stage 4-R admin stabilization lane

- Stage 4-R не является отдельной продуктовой функцией и не занимает номер существующих Stage 4.04-4.10.
- Первый срез добавляет общий `adminFetchJson(path, options)` helper в `public/admin.html`.
- Helper централизует:
  - чтение admin token;
  - `X-Admin-Token`;
  - JSON body;
  - JSON parsing;
  - error normalization через `json.message || fallbackMessage`.
- Slice 1 перевёл на helper новые панели `Portfolio gallery`, `Landing sites` и `VPS control`.
- Slice 2 перевёл legacy-панели `orders`, `project steps`, `calculators`, pricing draft save и draft preview на тот же request layer.
- После slice 2 прямой `fetch` в admin inline script остался только внутри `adminFetchJson`.
- Старые блоки оставлены в том же inline script; разбиение `public/admin.html` на модули вынесено в следующий стабилизационный проход, чтобы не смешивать request-layer cleanup с крупной перестройкой файла.

## Локальная проверка

```bash
npm install
npm run check
npm test
npm run dev
```

После запуска форма будет доступна на локальном адресе Wrangler, обычно `http://127.0.0.1:8788`. В локальном режиме API сам создаёт таблицы заказов, проектных шагов и калькуляторов, чтобы ручная проверка не зависела от отдельного шага миграции.

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
VPS_CONTROL_BASE_URL
VPS_CONTROL_TOKEN
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
- `GET /api/order-steps`
- `POST /api/order-steps/update`
- `POST /api/orders/project/init`
- `GET /api/calculators`
- `POST /api/calculators`
- `GET /api/calculators/:id`
- `POST /api/calculators/:id/publish`
- `GET /api/calculators/:id/embed` без публичного embed token
- `GET /api/calculators/:id/pricing`
- `PUT /api/calculators/:id/pricing`
- `GET /api/calculators/:id/rules`
- `PUT /api/calculators/:id/rules`
- `POST /api/calculators/:id/preview`
- `GET /api/vps/health`
- `GET /api/vps/services`
- `POST /api/vps/deploy/site`
- `POST /api/vps/reload/webserver`
- `GET /api/vps/deploy/logs`

Если `ADMIN_TOKEN` не задан, admin endpoints возвращают `503 admin_not_configured`.

Production `ADMIN_TOKEN` установлен в Cloudflare Pages secrets. Не храните production token в репозитории, README, временных файлах или скриншотах.

Передавать token можно двумя способами:

```text
X-Admin-Token: your-admin-token
Authorization: Bearer your-admin-token
```

Ротация `ADMIN_TOKEN`:

```bash
npx wrangler pages secret put ADMIN_TOKEN --project-name=furniture-orders-mvp
npm run deploy
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
0001_orders.sql              Базовые таблицы clients и orders. Для новых баз уже включает updated_at и notes.
0002_orders_updated_at.sql   Добавляет orders.updated_at для существующей базы Этапа 1.
0003_order_notes.sql         Добавляет orders.notes для существующей базы Этапа 2.
0004_project_steps.sql       Добавляет project_templates, template_steps и order_steps для Этапа 3.
0005_calculators.sql         Добавляет calculators, calculator_categories и calculator_embed_tokens для Этапа 4.01.
0006_calculator_pricing.sql  Добавляет calculator_prices, calculator_rules и calculator_fields для Этапа 4.02.
0007_sites.sql               Добавляет sites, site_domains и site_deployments для Этапа 4.04A.
0008_portfolio.sql           Добавляет portfolio_categories, portfolio_items и portfolio_images для Этапа 4.05.
```

Применить миграции к production D1:

```bash
npx wrangler d1 migrations apply furniture_orders --remote
```

## Fresh Install / Clean Deploy

1. Установить зависимости:

```bash
npm install
```

2. Создать D1:

```bash
npx wrangler d1 create furniture_orders
```

3. Вставить полученный `database_id` в `wrangler.toml`.

4. Применить миграции:

```bash
npx wrangler d1 migrations apply furniture_orders --remote
```

5. Настроить secrets:

```bash
npx wrangler pages secret put ADMIN_TOKEN --project-name=furniture-orders-mvp
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name=furniture-orders-mvp
npx wrangler pages secret put TELEGRAM_CHAT_ID --project-name=furniture-orders-mvp
```

6. Запустить проверки:

```bash
npm run check
npm test
```

7. Выполнить deploy:

```bash
npm run deploy
```

8. Открыть `/admin` и проверить список заказов.

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

Без token:

```text
401 unauthorized
```

Если `ADMIN_TOKEN` не настроен в окружении:

```text
503 admin_not_configured
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
62 tests
62 pass
```

## Следующий этап

Логичный следующий подэтап Stage 4:

- Stage 4.03C: установить `vps-control-service/` на Ubuntu 22.04, выдать `VPS_CONTROL_BASE_URL`/`VPS_CONTROL_TOKEN`, проверить live deploy/reload/logs.
- Stage 4.04B: подключить реальную генерацию/упаковку static landing artifact и заменить текущий publish dry run на live deploy после готовности VPS service.
- Stage 4.05B: подключить реальную загрузку изображений в Storage/R2 вместо URL-only MVP.
- Stage 4-R next slice: вынести admin helper/request utilities из inline script в отдельный JS-модуль и затем уменьшать размер `public/admin.html` без изменения поведения.
