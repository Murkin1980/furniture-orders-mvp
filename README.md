# Furniture Orders MVP

Visual roadmap and current readiness:
[`PROJECT_PROGRESS.html`](PROJECT_PROGRESS.html) ·
[`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md).

After every completed stage, update the visual HTML dashboard, the canonical
Markdown progress tracker, and `SESSION_NOTES.md`.

Repository navigation:

- active product and architecture decisions remain in the repository root;
- historical stage instructions and handoffs live in
  [`docs/internal/`](docs/internal/README.md);
- architecture attachments live in
  [`docs/architecture/`](docs/architecture/README.md);
- completed session summaries live in `docs/sessions/`;
- runtime logs and local archives are ignored and must not be committed.

Auth hardening is now staged behind a pure shared scope helper in `src/auth.js`.
It defines separate read, write, and operations permissions plus a temporary
legacy `ADMIN_TOKEN` fallback. Existing endpoints have not been migrated yet,
so current production authorization behavior remains unchanged until the next
reviewed slice.

The future OCR and sketch-recognition path is defined in
[`OCR_SKETCH_DECISION.md`](OCR_SKETCH_DECISION.md). OCR extraction, furniture
sketch interpretation, and SketchUp automation remain separate, manual-first
layers. OCR Slices 1-7 add a pure strict result parser, provider-neutral
prompt/request builder, injected-sender orchestration, safe draft/approved
storage, protected manual API, manager review UI, and an explicitly gated real
vision sender. Migrations `0017_ocr_recognitions.sql` and
`0018_ocr_image_source.sql` define the deployed D1 storage model. A
write-protected manual endpoint,
`POST /api/orders/:id/ocr/recognize`, accepts an already stored image reference
and can use an injected sender or the gated real sender. Recognition treats
submitted images as furniture-related by default, but must warn or use `other`
instead of inventing unclear details. The admin OCR review panel lists records,
shows the original image or stored reference, allows structured JSON correction,
and requires an explicit manager approve/reject action.

The first real OCR transport is an explicitly gated OpenAI-compatible vision
sender. It accepts only HTTPS or image data URLs, stops immediately on HTTP 429,
and remains disabled unless `OCR_RECOGNITION_ENABLED=true`. The local synthetic
provider smoke passed on June 14, 2026: a wardrobe sketch was saved as a draft
with dimensions `2400 x 600 x 2600 mm`. Production recognition is disabled
after the controlled smoke.

OCR Slice 8A adds a safety gate before the provider call. Synthetic images can
be used for controlled manual smoke tests. Customer images remain blocked by
default through `OCR_CUSTOMER_IMAGES_ENABLED=false`; enabling them also
requires durable consent metadata and a stored HTTPS image reference. Customer
image production use remains disabled. See
[`OCR_PRODUCTION_READINESS.md`](OCR_PRODUCTION_READINESS.md).

OCR Slice 8B completed the synthetic-only production path on June 15, 2026.
Remote migrations `0017` and `0018` are applied. Synthetic order `8` produced
recognition draft `1` with wardrobe dimensions `2400 x 600 x 2600 mm`.
Production recognition was disabled after the smoke by deleting the enable
secret and redeploying; the final disabled check returned
`503 ocr_recognition_disabled`. Customer images remain disabled.

OCR Slice 9 adds durable customer consent metadata, future retention deadlines,
and fail-closed manual deletion of the original image plus recognition data.
The admin OCR review exposes the destructive action only with explicit manager
confirmation and a deletion reason. Migration
`0019_ocr_consent_retention.sql` and the `OCR_MEDIA_BUCKET` production binding
remain intentionally unapplied; customer-image recognition remains disabled.

The controlled SketchUp path is defined in
[`SKETCHUP_INTEGRATION_DECISION.md`](SKETCHUP_INTEGRATION_DECISION.md).
SketchUp Slice 1 maps only manager-approved OCR records into
`furniture-model/v1`. Slice 2 converts only ready models into a validated
`sketchup-command-plan/v1` with three declarative allowlisted commands:
millimeter units, confirmed overall envelope, and safe metadata. Unknown
commands, extra fields, incomplete dimensions, arbitrary Ruby, MCP execution,
and production changes remain blocked. Slice 3 wraps only a validated plan in
a short-lived, idempotent, signature-ready `sketchup-node-job/v1`; it detects
payload tampering and expiry but does not sign the job. Slice 4 adds a
single-attempt injected fake-node client for local contract smoke testing. It
never falls back to global fetch and still does not connect MCP, SketchUp, or
production. Slice 5 adds Web Crypto HMAC signing/verification and a signed
HTTPS request builder without fetch; no production secret or node URL is
configured. Slice 6 adds a single-attempt injected HTTPS sender that never
falls back to global fetch and never retries, including on HTTP 429. Slice 7
adds the operations-scoped manual endpoint
`POST /api/orders/:id/sketchup/jobs` and pending-first job audit contract.
The endpoint still accepts only an injected sender; migration `0020` is not
applied and no real SketchUp node is connected. Slice 8 adds the pure receiving
fake-node boundary with HMAC/expiry verification, injected replay protection,
and an explicitly non-executable dry-run summary. Slice 9A adds the separate
[`sketchup-node-service`](sketchup-node-service/README.md) Windows-side HTTP
wrapper. It binds to `127.0.0.1` by default, validates transport headers and
signed jobs, rejects replay in memory, and still always reports
`executionEnabled=false`. Slice 9B adds a disabled-by-default injected
execution-adapter contract requiring matching explicit manager approval. It is
not wired into HTTP and no real SketchUp/MCP/process executor exists. Slice 10
adds the pure `sketchup-render-artifact/v1` manifest and future order-attachment
payload with allowlisted media types, safe storage keys, byte counts, and
SHA-256 hashes. It does not write or upload files.

Production landing/VPS operations, known failures, and verified solutions:
[`LANDING_VPS_OPS_RUNBOOK.md`](LANDING_VPS_OPS_RUNBOOK.md).

Verified public landing demo: `https://demo.salamat-mebel.kz`.

LC Slice 7 production calculator verification is complete:

- production calculator `1` is published and embedded into the demo landing;
- the demo artifact was redeployed through the VPS control path;
- a real calculator smoke lead created production order `5`;
- D1 stored estimate `615000 KZT` and `calculatorMeta` with
  `formulaVersion: 1` and `schemaVersion: 1`.

## Twenty CRM integration

Twenty CRM is planned as a separate optional CRM service. Its module repository
is [`Murkin1980/furniture-twenty-integration`](https://github.com/Murkin1980/furniture-twenty-integration).
`furniture-orders-mvp` remains the source of truth for lead intake and
furniture-specific workflows.

The platform now also has a native CRM MVP at `/crm.html`. It provides a
manager-oriented order pipeline with search, summary counters, AI/CRM signals,
quick status movement, priority views, and inline manager notes through the
existing protected order APIs. Follow-up dates and tasks highlight contacts due
today or overdue. Quick actions record calls, messages, and measurements in the
order interaction history. CRM summary shows active value, conversion, due
contacts, and overdue contacts. Twenty is packaged as a separate integration
module/repository and is not required for the native CRM.

The admin panel and native CRM now share a Serenite-inspired operational shell:
a persistent desktop sidebar, compact mobile navigation, clearer section
hierarchy, and a restrained furniture-workshop palette. Existing forms, IDs,
API contracts, and manager workflows remain unchanged.

Future admin/CRM interface work follows the repository skill
`skills/saas-product-interface/`. It turns SaaS UX guidance into a practical
workflow and review checklist focused on frequent tasks, system states, error
recovery, responsive behavior, and accessibility.

The admin/CRM interface workstream is complete for the current MVP: admin
modules open as focused workspaces, the orders overview has actionable summary
metrics and combined search/status filtering, order tables reflow into mobile
cards, and CRM cards keep status/quick actions visible while progressively
disclosing notes, follow-up, history, and AI drafts.

- CRM Slice 1: architecture and safety decision in `CRM_INTEGRATION_DECISION.md`.
- CRM Slice 2: pure person, opportunity, note, and sync payload mapping in `src/crm/twenty-mapper.js`.
- CRM Slice 3: pure request objects for people, opportunities, and notes in
  `src/crm/twenty-request-builder.js`.
- CRM Slice 4: guarded sender with required injected `fetchFn` in
  `src/crm/send-twenty-request.js`.
- CRM Slices 5-7: sequential manual sync core, admin-protected endpoint, order
  sync persistence, and the manual `Отправить в CRM` admin control.

Twenty sync remains disabled by default. Failed or unavailable CRM sync never
breaks order intake. A real successful production sync still requires a
verified Twenty workspace API contract, base URL, and API key.

Production safety test completed on 2026-06-12: the disabled endpoint recorded
a controlled failed status on smoke order `5` while preserving its normal order
fields. Deployment: `https://a25ae4ff.furniture-orders-mvp.pages.dev`.

Минимальный backend + тестовый frontend для приёма заявок мебельной мастерской. Проект сделан под Cloudflare Pages Functions и D1: сайт отдаёт форму, Function принимает заявку, сохраняет клиента и заказ, а затем при наличии переменных окружения отправляет уведомление менеджеру в Telegram.

Проект сейчас закрывает Этап 1, Этап 2, рабочий проход Этапа 3 и подэтап 4.01:

- Этап 1: приём входящих заявок.
- Этап 2: минимальная операционная панель для просмотра заказов и смены статусов.
- Этап 3: проектные шаги заказа по шаблонам мебели.
- Этап 4.01: мебельный калькулятор как embeddable widget.
- Этап 4.02: редактор цен, коэффициентов и формул калькулятора в админке.
- Этап 4.03: безопасный VPS control layer через внешний лёгкий control API.
- Этап 4.04A/B: модуль лендингов мебельщиков с доменами, статусом, generated HTML artifact и live single-file deploy через VPS layer.
- Этап 4.05: портфолио и публичная галерея работ с категориями и publish/unpublish flow.
- Этап 4-R: начат стабилизационный refactor lane для админки и API-контрактов без изменения продуктового поведения.
- Этап 4.02B: добавлен schema-driven calculator layer с draft/published fields, `schemaVersion` и безопасными enum-контрактами без arbitrary formulas/user-defined code execution.
- LC Slices 1-5: добавлены structured landing brief/content model, allowlisted furniture templates, редактирование и exact artifact preview в админке, выбор calculator для лендинга, полноценный field schema editor и mobile-verified calculator embed.
- AI layer: добавлены строгий parser, qualification prompt, provider abstraction, OpenAI-compatible sender, ручной admin endpoint и сохранение AI-результата в заказ. AI запускается только вручную; autorun для новых заявок отключён.
- Admin/CRM UI Slice 1: добавлена единая responsive-оболочка Furniture OS с
  боковой навигацией и сохранением существующих рабочих сценариев.

## Production

- Сайт: `https://furniture-orders-mvp.pages.dev`
- Админка: `https://furniture-orders-mvp.pages.dev/admin`
- Native CRM pipeline: `https://furniture-orders-mvp.pages.dev/crm.html`
- Preview deployment URLs смотрите в Cloudflare Pages deployments.
- GitHub: `https://github.com/Murkin1980/furniture-orders-mvp`

## Что уже есть

- `POST /api/orders` принимает единый JSON-контракт заявки.
- `GET /api/orders` возвращает список заказов для менеджера.
- `POST /api/orders/status` обновляет статус и заметку заказа.
- `GET /api/order-steps` возвращает шаги проекта заказа.
- `POST /api/order-steps/update` обновляет статус и заметку шага.
- `POST /api/orders/project/init` создаёт проектные шаги для заказа вручную.
- `POST /api/orders/:id/ai/analyze` вручную запускает AI-квалификацию заказа из admin flow и сохраняет нормализованный success/failed результат.
- `POST /api/orders/:id/ai/suggest-reply` вручную готовит черновик ответа для
  проверки менеджером; не отправляет сообщение и по умолчанию выключен.
- `GET /api/communication-drafts?orderId=:id` и
  `POST /api/communication-drafts` сохраняют, показывают и позволяют явно
  одобрить или отклонить отредактированный черновик.
- `POST /api/orders/:id/crm/twenty` вручную запускает one-way Twenty CRM sync,
  сохраняет success/failed статус и не влияет на обычный order intake.
- `GET /api/calculators` и `POST /api/calculators` управляют калькуляторами.
- `GET /api/calculators/:id/embed` генерирует embed-код для админки или отдаёт публичный widget script по token.
- `POST /api/calculators/:id/lead` сохраняет расчёт из виджета как обычную заявку.
- `GET /api/calculators/:id/pricing` и `PUT /api/calculators/:id/pricing` читают и сохраняют draft pricing для калькулятора.
- `GET /api/calculators/:id/rules` и `PUT /api/calculators/:id/rules` управляют коэффициентами и надбавками.
- `POST /api/calculators/:id/preview` считает draft preview без публикации.
- `POST /api/calculators/:id/publish` теперь копирует draft pricing/rules в published, и embed использует published-версию.
- Calculator leads сохраняют `calculatorMeta` в `raw_payload`: `calculatorId`, `categoryCode`, `units`, `materialRuleCode`, `materialMultiplier`, `estimate`, `formulaVersion`, `schemaVersion`.
- `GET /api/vps/health`, `GET /api/vps/services`, `POST /api/vps/deploy/site`, `POST /api/vps/reload/webserver`, `GET /api/vps/deploy/logs` дают admin proxy к внешнему VPS control API.
- `scripts/vps-readonly-smoke.mjs` can verify the production VPS proxy with
  admin credentials using only read-only GET endpoints.
- `GET /api/sites`, `POST /api/sites`, `GET /api/sites/:id`, `GET /api/sites/:id/artifact`, `POST /api/sites/:id/deploy`, `GET /api/sites/:id/status` управляют лендингами, доменами, HTML artifact и статусами публикации.
- `GET /api/portfolio`, `POST /api/portfolio`, `PUT /api/portfolio/:id`, `POST /api/portfolio/:id/images`, `POST /api/portfolio/:id/publish` управляют портфолио работ.
- `POST /api/portfolio/:id/images/upload` добавляет admin-only multipart upload для JPEG/PNG/WebP фото через R2-compatible storage binding.
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
- `src/calculators-pricing.js` содержит единые defaults, версии runtime/formula/schema и чистую формулу расчёта для preview/runtime/lead.
- `src/vps-control.js` содержит безопасный клиент VPS control API и валидацию deploy/reload payload.
- `src/sites-core.js` содержит бизнес-логику Stage 4.04A/B для сайтов, доменов, generated HTML artifact и записей публикации.
- `src/site-brief.js` нормализует и проверяет структурированный коммерческий бриф лендинга.
- `src/site-templates.js` содержит allowlisted библиотеку мебельных шаблонов без admin-authored HTML/JavaScript.
- `src/portfolio-core.js` содержит бизнес-логику Stage 4.05 для категорий, работ портфолио, изображений и публикации.
- `vps-control-service/` содержит Ubuntu-side MVP сервиса, который принимает запросы Cloudflare proxy и выполняет только allowlisted VPS actions.
- `src/phone.js` содержит общую нормализацию и проверку телефона для заявок и calculator leads.
- `src/ai/` содержит безопасный AI layer: prompt builder, provider abstraction, request sender, parser, orchestration и mapping результата в поля заказа.
- AI communications foundation добавляет policy-контракт и ручной reply
  suggestion flow с историей черновиков и manager approval. Отправка сообщений
  и изменение заказа AI-агентом запрещены.
- AI-анализ поддерживает `openai`, `groq`, `gemini`, `openrouter` и `nvidia` через OpenAI-compatible request contract.
- Ошибки provider, rate limit, invalid JSON и отсутствующие ключи сохраняются как `ai_status=failed`, не ломая заказ.
- Подробная настройка AI описана в `AI_SETUP.md`; реальные API keys не хранятся в репозитории.
- `tests/orders-core.test.js` проверяет intake flow, список заказов, фильтр, смену статуса, проектные шаги, калькуляторы, негативные embed/lead сценарии, `400` и `404`.
- `tests/sites-core.test.js` проверяет создание лендинга, уникальность slug, primary domain, generated artifact, publish flow и статус публикации.
- `tests/portfolio-core.test.js` проверяет создание работ, категории, изображения, публичный список, фильтр и запрет публикации без фото.

## Структура проекта

```text
furniture-orders-mvp/
  functions/api/orders.js
  functions/api/orders/status.js
  functions/api/orders/project/init.js
  functions/api/orders/[id]/ai/analyze.js
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
  functions/api/portfolio/[id]/images/upload.js
  functions/api/portfolio/[id]/publish.js
  functions/media/[[path]].js
  src/orders-core.js
  src/order-statuses.js
  src/project-templates.js
  src/calculators-core.js
  src/calculators-pricing.js
  src/vps-control.js
  src/sites-core.js
  src/portfolio-core.js
  src/phone.js
  src/ai/parse-ai-response.js
  src/ai/qualification-prompt.js
  src/ai/providers.js
  src/ai/send-ai-request.js
  src/ai/analyze-lead.js
  src/ai/order-ai-result.js
  src/ai/order-ai-core.js
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
  migrations/0009_calculator_schema_fields.sql
  migrations/0010_portfolio_media.sql
  migrations/0011_order_ai_results.sql
  tests/orders-core.test.js
  tests/sites-core.test.js
  tests/portfolio-core.test.js
  tests/ai-parse-response.test.js
  tests/qualification-prompt.test.js
  tests/ai-providers.test.js
  tests/send-ai-request.test.js
  tests/ai-analyze-lead.test.js
  tests/order-ai-result.test.js
  tests/order-ai-core.test.js
  AI_SETUP.md
  .env.example
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
| `/api/orders/:id/ai/analyze` | `POST` | Ручной AI-анализ заказа и сохранение результата | `ADMIN_TOKEN` |
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
| `/api/sites/:id/artifact` | `GET` | Публичный generated HTML artifact для VPS deploy | Нет |
| `/api/sites/:id/deploy` | `POST` | Создание deployment-записи и запуск VPS deploy; admin UI отправляет live HTML deploy (`dryRun: false`) | `ADMIN_TOKEN` |
| `/api/sites/:id/status` | `GET` | Короткий статус сайта, primary domain и последний deployment | `ADMIN_TOKEN` |
| `/api/portfolio` | `GET` | Публичный список published работ; с admin token возвращает все работы | Нет / `ADMIN_TOKEN` |
| `/api/portfolio?category=kitchens` | `GET` | Фильтр портфолио по категории | Нет / `ADMIN_TOKEN` |
| `/api/portfolio` | `POST` | Создание работы портфолио с URL изображений | `ADMIN_TOKEN` |
| `/api/portfolio/:id` | `GET` | Детали published работы; с admin token доступен draft | Нет / `ADMIN_TOKEN` |
| `/api/portfolio/:id` | `PUT` | Обновление работы, категории, описания, сортировки и фото | `ADMIN_TOKEN` |
| `/api/portfolio/:id/images` | `POST` | Добавление нескольких URL фото к работе | `ADMIN_TOKEN` |
| `/api/portfolio/:id/images/upload` | `POST` | Multipart upload одного JPEG/PNG/WebP фото в Storage/R2 binding | `ADMIN_TOKEN` |
| `/api/portfolio/:id/publish` | `POST` | Publish/unpublish работы портфолио | `ADMIN_TOKEN` |

## Контракт калькулятора Stage 4.02

- Draft pricing редактируется через admin endpoints и не влияет на публичный embed до публикации.
- `POST /api/calculators/:id/publish` копирует draft `calculator_prices` и `calculator_rules` в `published`.
- Публичный runtime `/api/calculators/:id/embed?token=...` отдаёт только published категории/правила/поля.
- В runtime есть `runtimeVersion`, `formulaVersion` и `schemaVersion`, сейчас все версии равны `1`.
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
- Real deploy для `artifactType: "html"` реализован: сервис скачивает allowlisted HTML artifact, пишет staging `index.html` и атомарно заменяет site directory.
- Reload webserver использует allowlisted `sudo /bin/systemctl reload nginx|caddy`, поэтому на VPS нужен узкий `sudoers` rule из README сервиса.
- Router проверяет bearer token до чтения POST body и ограничивает body size через `VPS_CONTROL_MAX_BODY_BYTES`.

## Контракт landing sites Stage 4.04A

- `sites` хранит сайт как отдельную сущность: `name`, `slug`, `ownerName`, `templateKey`, `status`.
- `site_domains` хранит домены сайта, primary flag и `sslStatus`. В MVP SSL status начинается как `unknown`.
- `site_deployments` хранит историю publish-запросов: `status`, `sourceUrl`, `targetPath`, `dryRun`, upstream status и JSON-ответ VPS layer.
- `POST /api/sites` нормализует `slug` из имени, проверяет уникальность slug и может сразу создать primary domain.
- `POST /api/sites/:id/deploy` формирует deploy payload с `artifactType: "html"` и source URL на generated artifact.
- Admin UI содержит блок Landing sites: создание сайта, список сайтов, status, live publish и open domain link.

## LC Slices 1-5: коммерческий редактор лендингов и калькуляторов

- `sites.content_json` хранит нормализованный structured brief: бренд, контакты, город, offer, аудитория, направления мебели, преимущества, секции, CTA, цвет и выбранный calculator.
- `PUT /api/sites/:id` обновляет существующий landing без редактирования исходного HTML.
- Allowlisted templates: `default-furniture`, `kitchen`, `wardrobe`, `casework`.
- Admin Landing sites поддерживает создание, редактирование и exact preview generated artifact.
- Artifact использует structured content и подключает опубликованный calculator embed при выборе calculator.
- Admin pricing editor теперь редактирует разрешённые published form fields: label, type, role, binding, required и active.
- Calculator embed уважает active/required schema fields и проверен на mobile viewport.
- Публикация incomplete landing brief блокируется validation error.
- Migration `0012_site_content.sql` должна быть применена перед production-использованием нового content model.
- LC Slice 6 остаётся отдельным ops-этапом: production migration, VPS/domain/SSL/live deploy verification.

## Контракт landing sites Stage 4.04B

- `GET /api/sites/:id/artifact` отдаёт generated static HTML artifact из данных сайта.
- Artifact содержит только безопасно экранированные данные site/domain и не выполняет admin-authored code.
- Default deploy source теперь указывает на `/api/sites/:id/artifact`.
- VPS control service поддерживает live single-file HTML deploy для `dryRun: false` и `artifactType: "html"`.
- Zip/package deploy остаётся follow-up; Stage 4.04B намеренно использует single-file HTML artifact без zip-зависимостей.

## Контракт portfolio gallery Stage 4.05

- `portfolio_categories` хранит категории работ. Базовый seed: kitchens, wardrobes, dressers, hallways, closets, cabinets, kids, office, tables, other.
- `portfolio_items` хранит работу: `title`, `description`, `categoryCode`, `status`, `sortOrder`, `isFeatured`.
- `portfolio_images` хранит несколько фото по URL: `imageUrl`, `altText`, `sortOrder`, `isCover`.
- `POST /api/portfolio` создаёт draft-работу. Изображения в MVP передаются URL-ами, без бинарной загрузки.
- `POST /api/portfolio/:id/publish` переводит работу в `published`; публикация без хотя бы одного изображения возвращает `400 validation_error`.
- Публичный `GET /api/portfolio` возвращает только `published` работы, а admin-запрос с токеном возвращает draft и published.
- `public/index.html` рендерит gallery block и фильтры по категориям из публичного API.
- `public/admin.html` содержит блок Portfolio gallery: создание работы, список, фильтр, добавление URL фото, publish/unpublish.

## Stage 4.05B portfolio media/storage upgrade

- `POST /api/portfolio/:id/images/upload` adds admin-only multipart upload for one JPEG/PNG/WebP image.
- Uploads are limited to 5 MB and reject unsupported MIME types before writing to storage.
- The endpoint writes to the Cloudflare R2-compatible binding `PORTFOLIO_MEDIA_BUCKET`.
- `portfolio_images` keeps URL compatibility and now also supports nullable uploaded-media metadata: `storageKey`, `mimeType`, `sizeBytes`.
- Public image URLs for uploaded files use `PORTFOLIO_MEDIA_PUBLIC_BASE_URL` plus the generated storage key when set; otherwise they use the local `/media/...` read-only Pages route.
- `GET /media/:path` reads from `PORTFOLIO_MEDIA_BUCKET`, serves only keys under `portfolio/`, and rejects path traversal.
- If `PORTFOLIO_MEDIA_BUCKET` is not configured, upload returns `503 portfolio_media_not_configured`; URL-based portfolio images still work.
- `public/admin.html` now has both `Upload photo` and URL-based `Add photos` actions.
- The portfolio creation form also exposes `Upload first photo`; when selected,
  the admin creates the draft work and immediately uploads the file to R2.
- Migration `0010_portfolio_media.sql` adds the storage metadata columns and a storage-key index.
- `PORTFOLIO_MEDIA_OPS.md` documents production R2 setup and smoke checks.
- `src/portfolio-media-ops.js` provides a pure readiness helper for the R2
  binding and optional public media URL.
- Production read-only smoke on 2026-06-16 confirmed the R2 bucket exists and
  the Pages media route sees the binding; admin upload write-smoke remains the
  final operational check.
- `scripts/portfolio-media-smoke.mjs` can run the explicit write-smoke when an
  admin token and test image are provided.

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
- После slice 2 прямой `fetch` в admin script остался только внутри request helper-слоя.
- Slice 3: move admin inline script into `public/admin.js` and group logic by domain (orders, calculators, sites/VPS, portfolio) while keeping behavior unchanged.
- Slice 4: split admin logic into ES modules (`admin-core`, `admin-orders`, `admin-calculators`, `admin-sites-vps`, `admin-portfolio`).

## Stage 4.02B schema-driven calculator layer

- План реализации записан в `furniture-stage4-02B-implementation-plan.md`.
- Реализация описана в `furniture-stage4-02B-implementation-summary.md`.
- Существующий задел `calculator_fields` превращён в draft/published schema layer для runtime rendering, draft preview и lead submission.
- `calculator_fields` получил state-aware columns: `state`, `role`, `binding`, `options_source`, `is_required`.
- Publish flow копирует draft fields в published fields вместе с prices/rules.
- Runtime возвращает `schemaVersion` рядом с существующими `runtimeVersion` и `formulaVersion` как additive field без удаления текущих `categories`, `rules` и `fields`.
- Widget использует published field labels/defaults/required flags, но по-прежнему работает через безопасную hardcoded rendering model без arbitrary formulas, user-defined JavaScript, SQL, templates, expressions или admin-authored runtime code.

## AI layer: текущий статус

- AI-квалификация является дополнительным слоем над существующим заказом и запускается только вручную из админки.
- Автоматический AI-анализ при создании новой заявки не включён.
- Ручной endpoint: `POST /api/orders/:id/ai/analyze`.
- Результат сохраняется в nullable `orders.ai_*` fields из migration `0011_order_ai_results.sql`.
- Поддерживаемые providers: `openai`, `groq`, `gemini`, `openrouter`, `nvidia`.
- Provider выбирается через `AI_PROVIDER`; `AI_MODEL` опционально переопределяет default model.
- Для выбранного provider нужен соответствующий key: `OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` или `NVIDIA_API_KEY`.
- Parser принимает только структурированный JSON-контракт и безопасно возвращает default result при неправильном ответе.
- При missing key, authorization error, rate limit, provider error или invalid response заказ остаётся целым, а результат сохраняется с `ai_status=failed` и `ai_error`.
- Локальные smoke tests подтвердили ручной endpoint, безопасные failure paths для authorization error/HTTP 429 и successful OpenAI path.
- Successful OpenAI smoke test вернул `ai_status=success`, score `75`, temperature `warm`, заполненные summary/next question, валидный missing-info JSON и пустой `ai_error`.
- Production migration `0011` применена, provider secrets настроены, и ручной
  AI-анализ успешно проверен на синтетическом production-заказе `6`.
- AI autorun остаётся отключённым; реальные клиентские данные не использовались
  в production smoke test.
- Полная настройка и команды проверки находятся в `AI_SETUP.md`.
- Правила AI-коммуникаций и human approval находятся в
  `AI_COMMUNICATIONS_DECISION.md`. Для включения только черновиков используется
  `AI_COMMUNICATIONS_ENABLED=true`.
- Safe AI communications MVP включён и production-проверен на синтетическом
  заказе `6`: draft создан, отредактированным manager flow одобрен и сохранён
  в истории; внешняя отправка сообщений отсутствует.

## Локальная проверка

```bash
npm install
npm run check
npm test
npm run dev
```

После запуска форма будет доступна на локальном адресе Wrangler, обычно `http://127.0.0.1:8788`. В локальном режиме API сам создаёт таблицы заказов, проектных шагов и калькуляторов, чтобы ручная проверка не зависела от отдельного шага миграции.

Runtime-создание схемы включается только в `npm run dev` через `RUNTIME_SCHEMA_INIT=true`. Для production используйте D1 migrations; это основной способ закреплять схему базы.

`npm run dev` использует configured local D1 `furniture_orders` из `wrangler.toml`.
Применяйте нужные миграции к той же базе через
`wrangler d1 execute DB --local --persist-to=.wrangler/state ...`. Не добавляйте
к Pages dev override `--d1 DB`: он создаёт отдельную `local-DB`, из-за чего
runtime не видит миграции и тестовые данные configured D1.

Локальная админка доступна по адресу `http://127.0.0.1:8788/admin`. Dev token по умолчанию:

```text
dev-admin-token
```

## Рекомендованная инфраструктура (cheap start architecture)

Этот проект изначально спроектирован так, чтобы запускаться и расти с минимальными фиксированными затратами, опираясь на Cloudflare и один недорогой VPS.

### 1. Core backend & hosting (Cloudflare)

- **Cloudflare Pages + Pages Functions (Workers)** — основной слой для публичного сайта, embed-виджетов калькулятора и admin-панели.
  - Free tier покрывает MVP и ранний рост.
  - При увеличении нагрузки логичный апгрейд — Workers paid plan.
- **Cloudflare D1** — SQL-база для клиентов, заказов, статусов, project steps, калькуляторов, landing sites и портфолио. Подходит для MVP с умеренной конкуренцией по записи.
- **Cloudflare R2** — объектное хранилище для фото, эскизов, статических артефактов сайтов и будущих uploads.
  - Stage 4.05B уже добавляет R2-ready upload flow для portfolio media.
  - R2 также может использоваться для будущих статических артефактов и template assets.

### 2. VPS-узел (VPS control, deploy, SketchUp)

- **Минимальная конфигурация:** 1 vCPU / 1 GB RAM / около 20 GB disk, Ubuntu 22.04 LTS. Это совместимо с текущим `vps-control-service`.
- **Назначение:**
  - `vps-control-service` для Stage 4.03A-C: health, services, deploy, reload webserver, logs.
  - Live HTML deploy для landing sites Stage 4.04B через артефакт `/api/sites/:id/artifact`.
  - В перспективе — узел для SketchUp MCP и других MCP-модулей Stage 4.08/4.09.
- **Масштабирование:** при росте нагрузки тариф VPS можно увеличить по CPU/RAM через панель провайдера без переустановки системы.

### 3. AI layer (pay-as-you-go)

- **Принцип:** не поднимать тяжёлые модели локально на VPS, а использовать внешние API.
- **Рекомендуемый роутер:** OpenRouter или аналогичный API-router как единая точка доступа к нескольким LLM/vision/STT-провайдерам.
- **Оплата:** pay-as-you-go — оплата только за фактические вызовы OCR, STT, классификации сообщений, генерации подсказок и эскизов. Это удобно для экспериментов в рамках Stage 4.07+.
- **Интеграция:**
  - вызовы AI идут как HTTP API из Cloudflare Functions или с VPS;
  - при недоступности модели или исчерпании кредитов платформа продолжает работать в режиме без AI: intake, CRM, landing, portfolio.

### 4. Templates & frontend (Stage 4.06)

- **Источник шаблонов:** бесплатные HTML-шаблоны, например HTML5 UP, BootstrapMade и аналогичные каталоги, используются как исходные `template_assets` для модуля шаблонов Stage 4.06, а не как внешний SaaS-конструктор.
- **Интеграция в систему:**
  - шаблон попадает в `site_templates` / `template_versions`;
  - далее через уже существующий pipeline превращается в артефакт `/api/sites/:id/artifact`;
  - затем деплоится через `vps-control-service`, как реализовано в Stage 4.04A/B.

### 5. Свойства архитектуры

- **Модульность:** калькулятор, VPS control, landing sites, portfolio, AI, MCP/SketchUp развиваются отдельными этапами, но используют одну базу: Cloudflare Pages + D1 + R2 + единый admin.
- **Градиент стоимости:** базовые компоненты Pages, D1 и R2 дают долгий период низкой стоимости; VPS и AI добавляют расходы только когда соответствующие фичи реально используются.
- **Graceful degradation:** даже если AI или SketchUp MCP временно недоступны или не оплачены, ядро платформы остаётся работоспособным: заявки, статусы, project steps, калькулятор, лендинги и портфолио.

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

AI variables не нужны для обычного intake flow. Для ручного AI-анализа задайте `AI_PROVIDER`, опциональный `AI_MODEL` и key выбранного provider. До успешного локального smoke test эти variables и migration `0011` не включаются в production.

Список AI variables и безопасный local setup находятся в `AI_SETUP.md` и `.env.example`.

Если Telegram-переменные не заданы, заявка всё равно сохраняется, а в ответе будет `telegramSent: false`.

`ADMIN_TOKEN` защищает операционные endpoints:

- `GET /api/orders`
- `POST /api/orders/status`
- `GET /api/order-steps`
- `POST /api/order-steps/update`
- `POST /api/orders/project/init`
- `POST /api/orders/:id/ai/analyze`
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

### Stage 4.05B media environment

For portfolio uploads in production, configure a Cloudflare R2 binding in the Pages project. Current bucket:

```text
Variable name: PORTFOLIO_MEDIA_BUCKET
R2 bucket: furniture-portfolio-media
```

Optional custom public media URL:

```text
PORTFOLIO_MEDIA_PUBLIC_BASE_URL=https://<public-r2-or-cdn-host>
```

If `PORTFOLIO_MEDIA_PUBLIC_BASE_URL` is not set, uploaded image URLs use `/media/<storage-key>` and are served through `functions/media/[[path]].js`. Without `PORTFOLIO_MEDIA_BUCKET`, the upload and media endpoints return `503 portfolio_media_not_configured`; URL-only portfolio flows remain available.

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
0009_calculator_schema_fields.sql  Добавляет draft/published schema metadata для calculator_fields.
0010_portfolio_media.sql     Добавляет storage metadata к portfolio_images для Stage 4.05B uploads.
0011_order_ai_results.sql    Добавляет nullable AI analysis fields к orders для ручного AI flow.
0012_site_content.sql        Добавляет structured content_json к sites для коммерческого landing editor.
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

## Локальная AI-инфраструктура

Первый безопасный этап описан в `AI_INFRA_DECISION.md`.

Добавлены `DESIGN.md`, `DATA_SOURCES.md`, проверяемая база `knowledge/`, повторяемые процессы в `skills/`, локальный CodeGraph в игнорируемой `.codegraph/` и локальный MarkItDown в игнорируемой `.tools/markitdown-venv/`.

```powershell
npx.cmd --yes @colbymchenry/codegraph status .
npx.cmd --yes @colbymchenry/codegraph query analyzeLead
.\.tools\markitdown-venv\Scripts\markitdown.exe docs\raw\source.docx -o docs\markdown\source.md
```

После конвертации документа обязательно проверить таблицы, числа и юридические формулировки, затем добавить источник в `DATA_SOURCES.md`. Supermemory и Headroom намеренно не подключены к runtime до появления стабильной схемы клиентской памяти, правил приватности и измерений токенов/стоимости.

На момент обновления README тестовый набор:

```text
137 tests
137 pass
```

## Следующий этап

Логичный порядок следующих работ с учётом cheap start architecture:

1. Stage 4.03C: установить/обновить `vps-control-service/` на Ubuntu 22.04, задать `VPS_CONTROL_BASE_URL`/`VPS_CONTROL_TOKEN`, проверить health/services/live deploy/reload/logs.
2. Stage 4.05B ops: подключить реальный R2 bucket/custom domain в Cloudflare Pages production settings, задать `PORTFOLIO_MEDIA_BUCKET` и `PORTFOLIO_MEDIA_PUBLIC_BASE_URL`, проверить upload из админки.
3. Stage 4.06: template import/library на базе статических HTML-шаблонов и текущего artifact pipeline.
4. Stage 4.07: AI layer через внешние pay-as-you-go API, без тяжёлых моделей на стартовом VPS.
5. Stage 4.08/4.09: MCP module registry и SketchUp MCP, где VPS сначала остаётся orchestration/control node.
6. Stage 4.10: integration checklist и consolidation pass.

Опциональные технические ветки между продуктовыми этапами:

- Stage 4.04C: расширить artifact pipeline до multi-file package/zip deploy, если single-file HTML перестанет хватать.
- LC Slice 6: production admin proxy, artifact generation, VPS live deploy, deploy logs, and a public smoke landing are verified end-to-end. Smoke URL: `http://lc6-production.194-32-140-229.sslip.io`. Let’s Encrypt primary validation reaches nginx, but secondary validation times out; customer-domain SSL remains an infrastructure follow-up.
- Stage 4-R next slice: вынести admin helper/request utilities из inline script в отдельный JS-модуль и затем уменьшать размер `public/admin.html` без изменения поведения.
