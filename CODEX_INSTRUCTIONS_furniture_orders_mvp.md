# Инструкция для Codex: furniture-orders-mvp

Дата подготовки: 2026-06-09  
Проект: `furniture-orders-mvp`  
Назначение: MVP-система для мебельщиков — расчёт кухни/шкафа, создание заявки, уведомление мебельщика в Telegram, автоответ клиенту в WhatsApp, локальная админка и подготовка к интеграции с сайтом/CRM.

---

## 1. Главная идея проекта

Этот проект не является отдельным сайтом, CRM или визуальным редактором лендингов.  
Это ядро и runtime-слой для обработки мебельных заявок.

Цепочка работы системы:

```text
клиент на сайте
  ↓
выбор: кухня / шкаф
  ↓
размеры + фасад + контакты
  ↓
предварительный расчёт
  ↓
создание заявки
  ↓
уведомление мебельщику в Telegram
  ↓
ожидание ответа 10 минут
  ↓
если мебельщик ответил — автоответ клиенту не отправляется
  ↓
если мебельщик не ответил — система готовит/отправляет автоответ клиенту в WhatsApp
  ↓
заявка сохраняется
  ↓
админка показывает состояние
```

---

## 2. Границы проекта

### Этот проект должен содержать

```text
- доменную логику заявок;
- расчёт предварительной цены;
- тарифы мебельщика;
- обработку order records;
- notification workflow;
- Telegram payload/runtime;
- WhatsApp payload/runtime;
- локальный backend/runtime;
- локальное JSON-хранение;
- простую demo-админку;
- API для будущего подключения сайта.
```

### Этот проект НЕ должен дублировать

```text
- furniture-landing-editor-skill;
- готовые сайты Salamat Mebel / Bek Mebel;
- полноценную CRM;
- Twenty CRM runtime;
- WhatsApp bot runtime как отдельный большой продукт;
- визуальный HTML-редактор;
- дизайн-систему конкретного бренда.
```

Связь с другими проектами должна быть через API, contracts и adapter-слои.

---

## 3. Уже пройденные этапы

### Этап 1 — MVP Core

Этап 1 был разбит на подэтапы `1-2A` → `1-2T`.

```text
1-2A  site-brief
1-2B  sites-core
1-2C  project boundaries
1-2D  calculators-core
1-2E  pricing contract
1-2F  orders-core
1-2G  basic pricing formula
1-2H  tariff catalog
1-2I  pricing options
1-2J  pricing summary
1-2K  notification workflow + editable rates
1-2L  Telegram / WhatsApp adapter contracts
1-2M  notification dispatch plan
1-2N  Telegram manager callback handling
1-2O  order lifecycle helpers
1-2P  MVP end-to-end scenario
1-2Q  persistence contract
1-2R  public API facade
1-2S  documentation and handoff cleanup
1-2T  simple HTML demo
```

Итог этапа 1: чистое ядро, которое умеет бриф, лендинг, калькулятор, цену, заявку, уведомления, автоответ, persistence-ready snapshot и demo.

---

## 4. Этап 2 — Local Runtime / Backend Foundation

Цель этапа 2: превратить ядро в локально запускаемый backend.

Добавлены:

```text
README.md
src/runtime-config.js
src/in-memory-store.js
src/deadline-worker.js
src/runtime-api.js
src/server.js

tests/runtime-config.test.js
tests/in-memory-store.test.js
tests/deadline-worker.test.js
tests/runtime-api.test.js
```

Endpoints:

```text
GET  /health
POST /api/calculate
POST /api/orders
POST /api/notification/dispatch-plan
POST /api/telegram/callback
POST /api/worker/check-pending
GET  /api/demo-state
```

Главный сценарий этапа 2:

```text
1. Клиент создаёт заявку через /api/orders.
2. Система сохраняет заявку в in-memory storage.
3. Worker /api/worker/check-pending создаёт Telegram dispatch event.
4. Если мебельщик нажал кнопку — /api/telegram/callback обновляет заявку.
5. Если ответа нет после 10 минут — worker создаёт WhatsApp auto-reply dispatch event.
6. /api/demo-state показывает состояние.
```

Важно: на этапе 2 реальная отправка в Telegram/WhatsApp ещё не выполнялась.

---

## 5. Этап 3 — Real Telegram Runtime Adapter

Цель этапа 3: добавить реальную интеграцию Telegram Bot API, но безопасно через dry-run по умолчанию.

Добавлены:

```text
src/telegram-runtime.js
src/notification-executor.js
tests/telegram-runtime.test.js
tests/notification-executor.test.js
```

Добавлены endpoints:

```text
POST /api/notification/execute
POST /api/telegram/execute-pending
POST /api/telegram/webhook
```

Настройки:

```bash
TELEGRAM_BOT_TOKEN=""
TELEGRAM_API_BASE_URL="https://api.telegram.org"
TELEGRAM_DRY_RUN=true
TELEGRAM_WEBHOOK_SECRET=""
MANAGER_TELEGRAM_CHAT_ID=""
```

Telegram умеет:

```text
- отправлять заявку мебельщику;
- показывать inline-кнопки;
- принимать callback_query;
- обрабатывать действия:
  - Взять в работу
  - Отправить автоответ
  - Позвонить
  - Отклонить
- отвечать через answerCallbackQuery.
```

Для реальной отправки:

```bash
TELEGRAM_BOT_TOKEN="твой_токен_бота"
TELEGRAM_DRY_RUN=false
MANAGER_TELEGRAM_CHAT_ID="chat_id_мебельщика"
```

---

## 6. Этап 4 — WhatsApp Runtime

Цель этапа 4: добавить WhatsApp runtime с dry-run по умолчанию.

Добавлены:

```text
src/whatsapp-runtime.js
tests/whatsapp-runtime.test.js
```

Добавлен endpoint:

```text
POST /api/whatsapp/execute-pending
```

Настройки:

```bash
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_API_BASE_URL="https://graph.facebook.com"
WHATSAPP_API_VERSION="v20.0"
WHATSAPP_DRY_RUN=true
WHATSAPP_TEMPLATE_LANGUAGE_CODE="ru"
WHATSAPP_REQUIRES_TEMPLATE=false
WHATSAPP_TEMPLATE_NAME="furniture_auto_reply"
```

WhatsApp runtime умеет:

```text
- формировать wa.me ссылку для ручной отправки;
- формировать payload для WhatsApp Cloud API;
- работать в dry-run режиме;
- отправлять через Cloud API только если WHATSAPP_DRY_RUN=false;
- поддерживать шаблонные сообщения.
```

Важно: WhatsApp Cloud API должен включаться осторожно. Если клиент не писал первым или 24-часовое окно недоступно, нужен approved template.

---

## 7. Этап 5 — Persistence Layer

Цель этапа 5: сохранять состояние не только в памяти, но и в локальный JSON-файл.

Добавлены:

```text
src/json-file-store.js
tests/json-file-store.test.js
```

Сохраняются:

```text
orders
pricingResults
notificationWorkflows
dispatchEvents
```

Настройки:

```bash
PERSISTENCE_DRIVER="memory"
PERSISTENCE_FILE_PATH=".data/furniture-orders-runtime-state.json"
PERSISTENCE_AUTO_SAVE=true
```

Для включения JSON persistence:

```bash
PERSISTENCE_DRIVER=json-file npm start
```

Endpoints:

```text
GET  /api/persistence/status
POST /api/persistence/save
POST /api/persistence/load
```

---

## 8. Этап 6 — Simple Admin / Demo Interface

Цель этапа 6: добавить локальную админку для просмотра состояния.

Добавлены:

```text
src/admin-dashboard.js
tests/admin-dashboard.test.js
```

После запуска:

```bash
npm start
```

Открыть:

```text
http://127.0.0.1:3000/admin
```

Endpoints:

```text
GET /admin
GET /api/admin/summary
```

Админка умеет:

```text
- показывать количество заявок, расчётов, workflow и dispatch events;
- показывать последние заявки;
- показывать dispatch events;
- запускать worker проверки 10 минут;
- выполнять pending Telegram events;
- выполнять pending WhatsApp events;
- запускать сохранение JSON-файла, если включён json-file persistence.
```

Важно: это локальная demo-админка, не production CRM. Авторизация пока не добавлена.

---

## 9. Текущие тарифы расчёта

Базовые тарифы за погонный метр:

```text
ЛДСП фасад      — 159 500 тг / пог.м
Фасад плёнка    — 247 500 тг / пог.м
Фасад краска    — 319 000 тг / пог.м
```

Эти тарифы применяются к:

```text
kitchen-basic
wardrobe-basic
```

Поддерживается переопределение тарифов мебельщиком:

```js
calculatePrice({
  calculatorId: 'kitchen-basic',
  inputs: {
    lengthMeters: 3,
    facadeType: 'лдсп',
    rateOverrides: {
      'лдсп': 180000,
      'плёнка': 260000,
      'краска': 350000
    }
  }
})
```

Важно: базовые цены должны быть дефолтными, а не жёстко неизменяемыми.

---

## 10. Логика уведомлений

Основное правило:

```text
Сначала заявка отправляется мебельщику в Telegram.
Если мебельщик отвечает в течение 10 минут — автоответ клиенту не отправляется.
Если ответа нет 10 минут — система готовит/отправляет автоответ клиенту в WhatsApp.
```

Notification actions:

```text
notify_manager
wait_for_manager
send_client_auto_reply
none
```

Dispatch plan types:

```text
send_telegram_manager_notification
wait_for_manager_response
send_whatsapp_client_auto_reply
none
```

Telegram кнопки:

```text
Взять в работу
Отправить автоответ
Позвонить
Отклонить
```

---

## 11. Команды проверки

Перед каждым handoff обязательно запускать:

```bash
npm test
npm run check
git diff --check
```

Если добавляются новые runtime-файлы, также проверить:

```bash
npm start
```

и открыть:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/admin
```

---

## 12. Как продолжать в Codex

Перед началом любой новой задачи Codex должен прочитать:

```text
AGENTS.md
PRODUCT.md
PROJECT_BOUNDARIES.md
INTEGRATION_MAP.md
PROJECT_PROGRESS.md
SESSION_NOTES.md
DELIVERABLE.md
README.md
```

Правило работы:

```text
1. Не менять всё сразу.
2. Делать маленький безопасный slice.
3. Не смешивать core, runtime, UI, CRM и deploy.
4. Не добавлять внешние API без dry-run.
5. Не добавлять неподтверждённые цены.
6. Не ломать существующие тесты.
7. После каждого этапа обновлять SESSION_NOTES.md и PROJECT_PROGRESS.md.
```

---

## 13. Что делать дальше

Следующий рекомендуемый этап:

# Этап 7 — Site / Landing Integration

Цель: подключить backend к клиентской форме на сайте или демо-лендинге.

План этапа 7:

```text
7A  Public lead form API contract
7B  CORS / безопасный приём заявок с сайта
7C  HTML demo form для клиента
7D  связать форму с /api/orders
7E  показать клиенту предварительный расчёт
7F  передать заявку мебельщику в Telegram
7G  сохранить заявку в JSON
```

Ожидаемые новые файлы:

```text
src/lead-form-contract.js
src/site-integration.js
demo/lead-form.html
tests/lead-form-contract.test.js
tests/site-integration.test.js
```

Ожидаемый сценарий после этапа 7:

```text
Клиент открыл сайт
↓
Выбрал: кухня / шкаф
↓
Указал длину, фасад, имя, WhatsApp
↓
Нажал “Получить расчёт”
↓
Сайт показал предварительную цену
↓
Мебельщик получил заявку в Telegram
↓
Заявка сохранилась в JSON
↓
Если 10 минут нет ответа — подготовился/отправился WhatsApp автоответ
```

---

## 14. Дальнейший roadmap после этапа 7

```text
Этап 8 — CRM Integration Contract
  Подготовить слой для Twenty CRM / Supabase / другой CRM.

Этап 9 — Multi-tenant Furniture Maker Settings
  У каждого мебельщика свои цены, Telegram chat_id, WhatsApp, город, бренд.

Этап 10 — Production Hardening
  Авторизация, защита admin, rate limit, валидация, логирование, backup.

Этап 11 — Deployment
  VPS / Render / Railway / Cloudflare / Netlify Functions.

Этап 12 — Integration with furniture-landing-editor-skill
  Чтобы редактор лендингов мог использовать это ядро.
```

---

## 15. Важные архитектурные правила

### Не делать так

```text
calculatePrice() → сразу отправляет WhatsApp
```

### Делать так

```text
calculatePrice()
  ↓
create order
  ↓
create notification workflow
  ↓
build dispatch plan
  ↓
executor выполняет Telegram/WhatsApp
```

### Почему

Так проект остаётся чистым:

```text
core можно тестировать отдельно;
runtime можно менять отдельно;
Telegram и WhatsApp можно заменить;
CRM можно подключить позже;
UI не смешивается с бизнес-логикой.
```

---

## 16. Короткий промт для следующей сессии Codex

```text
Read AGENTS.md, PRODUCT.md, PROJECT_BOUNDARIES.md, INTEGRATION_MAP.md, PROJECT_PROGRESS.md, SESSION_NOTES.md, DELIVERABLE.md, README.md.

Continue furniture-orders-mvp from Phase 6.

Implement Phase 7 — Site / Landing Integration.

Do not add CRM, production auth, external database, deployment, or unrelated UI framework.
Keep dry-run defaults for all external messaging.
Do not remove existing endpoints or break tests.

Add a safe lead form contract and a simple demo/lead-form.html that can submit to the existing runtime API.
The form should support:
- furniture type: kitchen or wardrobe
- length in meters
- facade type: ldsp / film / painted
- customer name
- WhatsApp phone
- city
- message

The submission should create an order via existing /api/orders flow, return pricing summary, and make the order visible in /admin.

Add focused tests.
Update README.md, PROJECT_PROGRESS.md, SESSION_NOTES.md, and DELIVERABLE.md.

Run:
npm test
npm run check
git diff --check

Return a concise handoff summary with changed files, behavior, tests, and next recommended phase.
```

---

## 17. Финальное состояние на данный момент

Последний готовый архив:

```text
furniture-orders-mvp-phase-6-admin-demo.zip
```

Текущий статус:

```text
MVP-core готов.
Runtime backend готов.
Telegram runtime готов.
WhatsApp runtime готов.
JSON persistence готов.
Локальная admin demo готова.
Следующий шаг: подключение клиентской формы сайта.
```
