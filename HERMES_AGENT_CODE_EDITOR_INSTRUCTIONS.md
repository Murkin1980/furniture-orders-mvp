# Инструкция для редактора кода: безопасная интеграция Hermes Agent в Furniture Orders MVP

Дата: 2026-06-24  
Репозиторий: `Murkin1980/furniture-orders-mvp`  
Задача: подготовить и реализовать безопасное подключение Hermes Agent, развёрнутого на Google Cloud VPS, к существующей мебельной платформе.

---

## 1. Главный принцип

`furniture-orders-mvp` — основной продукт и источник истины для мебельной платформы.

Hermes Agent НЕ должен становиться отдельной CRM, отдельной платформой заказов или заменой существующего AI-слоя. Hermes должен быть внешним агентным помощником поверх текущей платформы:

```text
Cloudflare Pages + D1 = сайт, заявки, CRM, калькулятор, портфолио, админка
Google Cloud VPS = Hermes Agent, долгоживущий агентный процесс, gateway/worker
```

Платформа должна оставаться работоспособной, даже если Hermes недоступен.

---

## 2. Перед любыми изменениями прочитать

Редактор кода / Codex обязан сначала прочитать:

```text
AGENTS.md
PRODUCT.md
DESIGN.md
SESSION_NOTES.md
DATA_SOURCES.md
LIVE_SITES.md
README.md
docs/decisions/AI_LAYER_DECISION.md
docs/decisions/AI_INFRA_DECISION.md
docs/decisions/AI_COMMUNICATIONS_DECISION.md
docs/decisions/OPS_AND_LEGACY_DECISION.md
docs/decisions/CALCULATOR_DECISION.md
```

Если меняются admin/CRM интерфейсы, дополнительно прочитать:

```text
skills/saas-product-interface/SKILL.md
```

---

## 3. Текущая архитектура, которую нельзя ломать

Существующий поток заявки:

```text
public form / calculator embed
        ↓
POST /api/orders
        ↓
functions/api/orders.js
        ↓
src/orders-core.js:createOrder()
        ↓
D1: clients + orders
        ↓
Telegram notification, если TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID заданы
```

Нельзя переносить сохранение заявки в Hermes.  
Нельзя делать Hermes обязательным для создания заказа.  
Нельзя блокировать `POST /api/orders`, если Hermes недоступен.

Правильное место для Hermes:

```text
createOrder()
  → сохранить клиента и заказ
  → отправить Telegram как раньше
  → best-effort Hermes event / webhook
```

Hermes должен подключаться только после того, как заказ уже сохранён в D1.

---

## 4. Ограничения безопасности

### Hermes может

На первом этапе Hermes может только:

- получить минимальный контекст заказа;
- классифицировать заявку;
- определить недостающие данные;
- предложить следующий вопрос клиенту;
- сформировать резюме для менеджера;
- сформировать черновик ответа;
- вернуть структурированный JSON;
- сохранить черновик через существующий `communication_drafts` flow после проверки платформой.

### Hermes не может

Hermes НЕ может:

- отправлять сообщения клиенту;
- писать клиенту в WhatsApp, Telegram, email или SMS;
- менять статус заказа;
- менять заметки заказа;
- назначать follow-up;
- запускать расчёт цен с произвольной формулой;
- менять калькулятор;
- деплоить сайт;
- применять миграции;
- работать с реальными клиентскими фото без отдельного privacy/consent решения;
- читать всю базу D1 напрямую;
- получать API-ключи Cloudflare, D1, R2, OpenAI или WhatsApp;
- иметь прямой доступ к production-секретам платформы.

Любое действие за пределами черновика должно требовать отдельного подтверждения менеджера.

---

## 5. Data minimization

Не отправлять Hermes лишние персональные данные.

На первом этапе в Hermes payload НЕ включать:

```text
phone
email
address
raw_payload
client photos
full conversation history
secrets
API keys
admin tokens
```

Разрешённый минимальный payload:

```json
{
  "eventType": "order.created",
  "schemaVersion": 1,
  "order": {
    "id": 123,
    "source": "site",
    "city": "Алматы",
    "furnitureType": "kitchen",
    "budget": 615000,
    "description": "Кухня 3 метра, нужен предварительный расчет",
    "calculatorMeta": {
      "calculatorId": 1,
      "categoryCode": "kitchen",
      "estimate": 615000,
      "formulaVersion": 1,
      "schemaVersion": 1
    },
    "createdAt": "2026-06-24T10:00:00.000Z"
  }
}
```

Если для менеджерского уведомления нужен телефон, он должен оставаться в платформе и Telegram-уведомлении, но не уходить в Hermes без отдельного решения.

---

## 6. Рекомендуемая файловая структура

Добавить новые файлы малыми reviewable-срезами:

```text
docs/decisions/HERMES_AGENT_INTEGRATION_DECISION.md
docs/runbooks/HERMES_AGENT_RUNBOOK.md

src/agents/hermes-result.js
src/agents/hermes-request-builder.js
src/agents/hermes-client.js
src/agents/hermes-order-core.js

functions/api/orders/[id]/agent/hermes.js

tests/hermes-result.test.js
tests/hermes-request-builder.test.js
tests/hermes-client.test.js
tests/hermes-order-core.test.js
tests/hermes-endpoint.test.js
```

Не смешивать Hermes-код с существующим `src/ai/*`, если он отвечает именно за внешний агентный процесс.  
`src/ai/*` остаётся для AI-анализа и AI-черновиков внутри платформы.  
`src/agents/*` использовать для интеграции с внешними агентами.

---

## 7. Переменные окружения

Добавить, но по умолчанию держать выключенными:

```env
HERMES_AGENT_ENABLED=false
HERMES_AGENT_WEBHOOK_URL=
HERMES_AGENT_TOKEN=
HERMES_AGENT_TIMEOUT_MS=4000
```

Правила:

- если `HERMES_AGENT_ENABLED !== "true"`, Hermes не вызывается;
- если нет `HERMES_AGENT_WEBHOOK_URL`, Hermes не вызывается;
- если нет `HERMES_AGENT_TOKEN`, endpoint должен fail-closed;
- timeout должен быть коротким;
- ошибка Hermes не должна ломать создание заявки.

---

## 8. Формат ответа Hermes

Hermes должен возвращать только строгий JSON:

```json
{
  "schemaVersion": 1,
  "requiresHumanApproval": true,
  "summary": "Клиент хочет кухню, есть примерный бюджет, не хватает размеров и фото помещения.",
  "furnitureType": "kitchen",
  "leadTemperature": "warm",
  "missingInfo": [
    "ширина стены",
    "высота потолка",
    "фото помещения",
    "предпочтительный материал фасадов"
  ],
  "nextQuestion": "Пришлите, пожалуйста, ширину стены, высоту потолка и фото помещения.",
  "replyDraft": "Здравствуйте! Спасибо за заявку. Чтобы подготовить предварительный расчёт кухни, пришлите, пожалуйста, ширину стены, высоту потолка и фото помещения.",
  "warnings": []
}
```

Платформа обязана валидировать этот JSON.  
Если JSON невалидный — сохранить безопасный fallback или пометить ошибку, но не падать.

---

## 9. Этапы реализации

### Этап 0 — документация без изменения поведения

Добавить:

```text
docs/decisions/HERMES_AGENT_INTEGRATION_DECISION.md
docs/runbooks/HERMES_AGENT_RUNBOOK.md
```

В decision-файле зафиксировать:

- Hermes разворачивается на Google Cloud VPS;
- платформа остаётся источником истины;
- Hermes не получает прямой доступ к D1;
- автосообщения клиенту запрещены;
- первый MVP — только менеджерские черновики;
- Hermes отключён по умолчанию.

Проверки:

```bash
git diff --check
```

---

### Этап 1 — чистые pure-модули без сети

Добавить:

```text
src/agents/hermes-result.js
src/agents/hermes-request-builder.js
tests/hermes-result.test.js
tests/hermes-request-builder.test.js
```

Требования:

- нормализация ответа Hermes;
- строгая валидация `schemaVersion`;
- `requiresHumanApproval` всегда должен быть `true`;
- неизвестные поля игнорировать;
- невалидный ответ превращать в безопасный fallback;
- build request не должен выполнять `fetch`;
- телефон, email, address, raw_payload не должны попадать в payload.

Проверки:

```bash
node --test tests/hermes-result.test.js tests/hermes-request-builder.test.js
npm run check
npm test
git diff --check
```

---

### Этап 2 — Hermes client с injected fetch

Добавить:

```text
src/agents/hermes-client.js
tests/hermes-client.test.js
```

Требования:

- не использовать глобальный `fetch` без явного контроля;
- основной тестовый путь должен работать через injected `fetchFn`;
- Authorization header: `Bearer ${HERMES_AGENT_TOKEN}`;
- timeout / abort;
- no retry на HTTP 429;
- понятные ошибки: disabled, missing_url, missing_token, timeout, http_error, invalid_json;
- не логировать секреты и полные payload с персональными данными.

Проверки:

```bash
node --test tests/hermes-client.test.js
npm run check
npm test
git diff --check
```

---

### Этап 3 — order core для ручного запуска

Добавить:

```text
src/agents/hermes-order-core.js
functions/api/orders/[id]/agent/hermes.js
tests/hermes-order-core.test.js
tests/hermes-endpoint.test.js
```

Endpoint:

```text
POST /api/orders/:id/agent/hermes
```

Требования:

- endpoint admin-protected через существующий Bearer / X-Admin-Token подход;
- если Hermes выключен — вернуть controlled 503;
- загрузить заказ из D1;
- собрать минимальный payload;
- вызвать Hermes client;
- сохранить результат как communication draft, если есть `replyDraft`;
- не отправлять сообщение клиенту;
- не менять статус заказа;
- не менять follow-up;
- не менять notes без отдельного approval flow;
- при ошибке Hermes не менять обычные поля заказа.

Проверки:

```bash
node --test tests/hermes-order-core.test.js tests/hermes-endpoint.test.js
npm run check
npm test
git diff --check
```

---

### Этап 4 — best-effort запуск после создания заявки

Только после успешного ручного endpoint и тестов.

Изменить `src/orders-core.js` осторожно:

```text
createOrder()
  → upsertClient()
  → insertOrder()
  → notifyTelegram()
  → optionally notifyHermesAgent()
```

Требования:

- `createOrder()` должен возвращать `201`, даже если Hermes недоступен;
- в ответ можно добавить `hermesQueued` или `hermesSent`, но не ломать существующий API;
- при ошибке Hermes писать только safe log без секретов;
- никаких production-автодействий без `HERMES_AGENT_ENABLED=true`.

Проверки:

```bash
node --test tests/orders-core.test.js tests/hermes-order-core.test.js
npm run check
npm test
git diff --check
```

---

### Этап 5 — CRM/Admin UI только после backend MVP

Добавлять UI только после стабильного backend.

В CRM можно добавить:

```text
Hermes summary
Missing info
Next question
Draft reply
Hermes status
```

Требования:

- применить `skills/saas-product-interface/SKILL.md`;
- не менять текущую идентичность admin/CRM;
- не добавлять AI-градиенты, декоративные dashboards, лишние графики;
- черновик должен редактироваться менеджером;
- отправка клиенту всё ещё запрещена.

Проверки:

```bash
npm run check
npm test
manual desktop/mobile CRM review
git diff --check
```

---

## 10. VPS-часть Hermes

Hermes разворачивать на Google Cloud VPS отдельно от Cloudflare Pages.

Рекомендуемая схема:

```text
Google Cloud Debian VPS
  ├─ hermes user
  ├─ Hermes Agent process
  ├─ optional Hermes gateway
  ├─ lightweight HTTPS webhook adapter
  └─ systemd service
```

Платформа должна обращаться к VPS только через HTTPS endpoint:

```text
POST https://<hermes-domain>/webhook/order
Authorization: Bearer <HERMES_AGENT_TOKEN>
```

Не открывать Hermes на весь интернет без авторизации.  
Не давать Hermes SSH/root доступ к платформе.  
Не хранить Cloudflare API token внутри Hermes без отдельного ops decision.

---

## 11. Что нельзя делать редактору кода

Запрещено:

- копировать целиком `furniture-ai-agent`;
- создавать новую CRM;
- создавать новый репозиторий;
- переписывать `POST /api/orders`;
- переводить платформу с Cloudflare Pages/D1 на Express/SQLite;
- добавлять большие зависимости без обоснования;
- добавлять автоанализ всех заявок без флага и тестов;
- добавлять автоотправку WhatsApp/Telegram клиенту;
- включать production-секреты в код;
- коммитить `.env`, `.dev.vars`, `.wrangler/state`, `.codegraph`, `.tools`;
- менять live repositories `bek-mebel`, `tuba-kz`, `salamat-mebel-kz` в рамках этой задачи;
- менять калькуляторные формулы или published pricing при интеграции Hermes;
- применять production migrations без отдельного explicit approval.

---

## 12. Документация после каждого meaningful change

После каждого завершённого среза обновить:

```text
SESSION_NOTES.md
PROJECT_PROGRESS.md
PROJECT_PROGRESS.html
```

Если меняется архитектура — обновить:

```text
docs/decisions/HERMES_AGENT_INTEGRATION_DECISION.md
README.md
```

Формат записи в `SESSION_NOTES.md`:

```md
## YYYY-MM-DD — Hermes Agent <slice name>

### What changed
- ...

### Files changed
- ...

### Checks
- ...

### Next
- ...
```

---

## 13. Acceptance criteria для безопасного MVP

MVP считается готовым только если:

- Hermes отключён по умолчанию;
- endpoint защищён admin token;
- Hermes не блокирует создание заявки;
- Hermes не получает лишние персональные данные;
- Hermes не отправляет сообщения клиенту;
- Hermes не меняет order status / notes / follow-up;
- результат Hermes валидируется;
- черновик сохраняется в `communication_drafts`;
- менеджер видит, редактирует и утверждает черновик;
- все тесты проходят;
- `SESSION_NOTES.md`, `PROJECT_PROGRESS.md`, `PROJECT_PROGRESS.html` обновлены;
- production smoke проводится только на synthetic/test order.

---

## 14. Короткий рабочий промт для Codex

Используй этот промт в редакторе кода:

```text
You are working in Murkin1980/furniture-orders-mvp.

Task: add a safe Hermes Agent integration plan and then implement it in small reviewed slices.

Read first:
AGENTS.md, PRODUCT.md, DESIGN.md, SESSION_NOTES.md, DATA_SOURCES.md, LIVE_SITES.md, README.md,
docs/decisions/AI_LAYER_DECISION.md,
docs/decisions/AI_INFRA_DECISION.md,
docs/decisions/AI_COMMUNICATIONS_DECISION.md,
docs/decisions/OPS_AND_LEGACY_DECISION.md,
docs/decisions/CALCULATOR_DECISION.md.

Rules:
- The platform remains the source of truth.
- Hermes runs externally on Google Cloud VPS.
- Do not copy furniture-ai-agent wholesale.
- Do not create a second CRM.
- Do not move order intake out of Cloudflare Pages/D1.
- Do not make Hermes required for order creation.
- Do not send customer messages automatically.
- Do not update order status/notes/follow-up from Hermes.
- Use minimal payload; exclude phone/email/address/raw_payload/photos/secrets.
- Keep Hermes disabled by default.
- Use pure modules and tests before network/client/endpoint work.
- Use injected fetch for tests.
- Persist only manager-review drafts through communication_drafts.
- Update SESSION_NOTES.md, PROJECT_PROGRESS.md, and PROJECT_PROGRESS.html after completed slices.

Start with documentation only:
1. Create docs/decisions/HERMES_AGENT_INTEGRATION_DECISION.md.
2. Create docs/runbooks/HERMES_AGENT_RUNBOOK.md.
3. Do not change runtime behavior in the first slice.
4. Run git diff --check.
```
