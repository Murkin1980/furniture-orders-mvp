# Карта проектов Murkin1980

Главный фокус: платформа для мебельщиков. Все репозитории должны быть разложены по ролям, чтобы не плодить конкурирующие MVP.

## 1. Main Product

### `furniture-orders-mvp`
Текущий центр тяжести проекта. Содержит приём заявок, админку, статусы, проектные шаги, калькуляторы, портфолио, сайты/лендинги, публикацию и VPS control layer.

**Решение:** развивать как главный репозиторий платформы. Позже можно переименовать в `furniture-platform` или `mebel-platform`.

## 2. Modules to absorb later

### `furniture-ai-agent`
AI-слой для квалификации заявок, анализа, Telegram, CRM, аналитики и multi-tenant логики.

**Решение:** не развивать как отдельный SaaS. Использовать как источник для будущего модуля `/ai` внутри платформы.

Планируемые endpoints внутри main product:

```text
/api/ai/qualify-lead
/api/ai/suggest-reply
/api/ai/generate-offer
/api/ai/extract-dimensions
```

### `furniture-configurator`
Псевдо-3D / 8 ракурсов / deep-link конфигурации / формульный расчёт / WhatsApp.

**Решение:** оставить как side module. Позже перенести лучшие функции в калькулятор платформы.

Кандидаты на перенос:
- 8-angle viewer
- URL serialization / deep link
- WhatsApp summary
- product schema validation
- image naming convention
- price breakdown UX

## 3. Case studies / live examples

### `salamat-mebel-kz`
Главная витрина Salamat Mebel и демонстрационный кейс.

### `bek-mebel`
Сайт клиента Bek Mebel. Использовать как реальный кейс для проверки платформы.

### `tuba-kz`
Отдельный сайт, уже запущенный на Cloudflare. Относится к case studies / live sites. Не смешивать с ядром платформы, но использовать как доказательство умения деплоить Cloudflare-сайты.

## 4. Side brands

### `re-fix-kz`
Сайд-направление ремонта корпусной мебели. Оставить отдельно, позже можно подключить к платформе как нишевой шаблон.

### `Asyl-soft-landing-page`
Экспериментальный/брендовый лендинг мягкой или детской мебели. Оставить как side brand или архивировать после проверки актуальности.

## 5. Internal Ops

### `grand-mebel-accounting-cloudflare`
Отдельный внутренний бухгалтерский модуль: счета, документы, XML ЭСФ, R2, D1, NCALayer.

**Решение:** оставить отдельно. Не смешивать с main product до появления стабильных клиентов.

## 6. Archive candidates

### Strong archive/delete candidates
- `bek-mebel-v2`
- `bek-mebel-3`

Причина: дубли `bek-mebel`.

### Archive after extracting useful pieces
- `mebel-kalkulator`
- `mebel-kalkulator2`
- `grand-mebel`
- `grand-mebel-invoices`

Причина: функции уже частично покрыты главным продуктом, конфигуратором или Cloudflare accounting module.

## Working rule

Новые репозитории не создавать, если функция помещается в эту карту:

- лендинг → module/sites или case study;
- калькулятор → module/calculators;
- AI → module/ai;
- портфолио → module/portfolio;
- счета/документы → internal ops;
- дизайн/эксперименты → side module или archive.
