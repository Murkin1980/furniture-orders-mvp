# Инструкция для кодера: kitchen-first SketchUp / 3D путь в Furniture Orders MVP

## Цель документа

Этот документ описывает подробный план реализации первого эталонного 3D-сценария для платформы: **кухня как основной профиль бизнеса**. В текущем состоянии платформы уже готовы intake, калькуляторы, native CRM, коммерческие предложения, безопасный OCR boundary, SketchUp boundary, render artifact storage и начат Project PDF Intelligence.[cite:111][cite:112]

Задача кодера — не изобретать новый 3D-стек с нуля, а **довести существующий безопасный pipeline до первого полноценно работающего kitchen-сценария**: заказ кухни -> нормализованный brief -> расчёт -> 3D-модель -> превью/рендер -> привязка к заказу и будущему КП.[cite:111][cite:112]

## Что уже существует в репозитории

Платформа уже имеет контролируемый SketchUp/3D путь:

- утверждённый OCR может маппиться в `furniture-model/v1`;
- `furniture-model/v1` преобразуется в строгий `sketchup-command-plan/v1`;
- план заворачивается в короткоживущий `sketchup-node-job/v1` с подписью и TTL;
- есть защищённый operations endpoint `POST /api/orders/:id/sketchup/jobs`;
- есть Windows-side `sketchup-node-service` с dry-run-first поведением;
- есть локальная file queue (`inbox/approvals/outbox`) и Ruby scaffold/finalizer;
- есть `render-artifact` и `render-files` контракты и storage boundary для уже готовых файлов/превью/рендеров.[cite:111][cite:112]

Это означает, что для kitchen-сценария нужно **не ломать существующую безопасную архитектуру**, а аккуратно расширять её новым типом мебельной модели и новым доменным brief.[cite:111]

## Главный продуктовый результат

Первый целевой результат должен выглядеть так:

1. В платформе создаётся или уже существует заказ кухни.
2. Заказ, lead из калькулятора или PDF-проект кухни нормализуется в единый `KitchenBrief`.
3. На базе `KitchenBrief` строится kitchen-специфичный `furniture-model/v1`.
4. Из него генерируется allowlisted `sketchup-command-plan/v1` для базовой кухни.
5. Windows/Ruby scaffold создаёт безопасную базовую 3D-сцену кухни: помещение, габариты, нижние/верхние модули, базовая техника в виде простых блоков.
6. Создаются `model.skp` и минимум одно preview изображение.
7. Результат привязывается к заказу как render artifact и отображается в админке заказа.[cite:111][cite:112]

Важно: на первом этапе не требуется фотореализм, фурнитура, сложная геометрия фасадов, реальная деталировка корпусов, вырезы под мойку/варку и EasyKitchen automation. Достаточно безопасного и проверяемого **envelope + block-model** уровня.[cite:111][cite:112]

## Общий архитектурный принцип

Реализация должна следовать тем же правилам, что уже используются в OCR, SketchUp и PDF-модулях:

- pure core logic в `src/`;
- минимальный Cloudflare/API слой в `functions/api/`;
- injected dependencies для сетевого транспорта и внешнего окружения;
- fail-closed поведение при невалидных входных данных;
- без произвольного Ruby/JS/формул от администратора;
- без прямого запуска SketchUp из веб-платформы;
- только allowlisted действия и минимальный surface area протоколов.[cite:111]

## Фаза 1. Ввести единый KitchenBrief

### Цель

Нужно создать один нормализованный контракт кухни, который станет **источником правды** для калькулятора кухни, будущего PDF Intelligence и SketchUp-модели кухни.[cite:111][cite:112]

### Новый модуль

Рекомендуемое место:

- `src/kitchen/brief.js`

В этом модуле должны быть:

- валидатор/нормализатор `KitchenBrief`;
- helper для safe defaults;
- enum/allowlist для типов планировок, типов модулей, зон техники и типов фасадов;
- функции преобразования из разных источников.

### Предлагаемая структура `KitchenBrief`

```json
{
  "schemaVersion": 1,
  "sourceType": "order|calculator|pdf",
  "sourceRef": {
    "orderId": 123,
    "calculatorId": 5,
    "pdfDraftId": null
  },
  "customer": {
    "name": "Ерлан",
    "phone": "+77011234567",
    "city": "Алматы"
  },
  "kitchen": {
    "layout": "L",
    "room": {
      "wallAmm": 3000,
      "wallBmm": 2100,
      "wallCmm": null,
      "ceilingHeightMm": 2700,
      "areaM2": 10.8,
      "door": {
        "widthMm": 800,
        "offsetFromWallStartMm": 200
      },
      "window": {
        "widthMm": 1200,
        "sillHeightMm": 900,
        "offsetFromWallStartMm": 1300
      }
    },
    "style": {
      "frontMaterial": "MDF",
      "frontFinish": "matte",
      "frontColor": "white",
      "bodyMaterial": "LDSP",
      "bodyColor": "sonoma"
    },
    "appliances": {
      "sink": true,
      "hob": true,
      "oven": true,
      "fridge": true,
      "dishwasher": false,
      "hood": true
    },
    "zones": {
      "sinkWall": "A",
      "hobWall": "A",
      "fridgeWall": "B"
    },
    "modules": [
      {
        "zone": "base",
        "wall": "A",
        "type": "sink-base",
        "widthMm": 800,
        "heightMm": 720,
        "depthMm": 560
      },
      {
        "zone": "base",
        "wall": "A",
        "type": "drawers",
        "widthMm": 600,
        "heightMm": 720,
        "depthMm": 560
      },
      {
        "zone": "wall",
        "wall": "A",
        "type": "wall-cabinet",
        "widthMm": 800,
        "heightMm": 720,
        "depthMm": 320
      }
    ]
  },
  "commercial": {
    "budgetKzt": 1800000,
    "estimateKzt": 1650000,
    "calculatorMeta": {
      "formulaVersion": 1,
      "schemaVersion": 1
    }
  },
  "notes": [
    "Кухня под потолок",
    "Нужен встроенный холодильник"
  ]
}
```

### Минимальные обязательные поля на первом этапе

Если данных мало, pipeline не должен строить псевдо-точную кухню. Минимум для 3D kitchen path:

- `layout`
- длина хотя бы одной стены;
- `ceilingHeightMm`;
- базовый список модулей ИЛИ возможность вывести его из calculator preset;
- тип источника и ссылка на заказ/лид.

Если этих данных нет, должен возвращаться controlled validation error, а не частично выдуманная кухня.[cite:111]

## Фаза 2. Мапперы в KitchenBrief

Нужно сделать три явных маппера:

### 2.1. Order -> KitchenBrief

Рекомендуемый модуль:

- `src/kitchen/order-to-brief.js`

Обязанности:

- принимать order record из `orders-core`;
- допускать только `furnitureType = kitchen` или явно kitchen-like source;
- вытаскивать `name`, `phone`, `city`, `budget`, `description`;
- безопасно парсить `raw_payload` и `calculatorMeta`, если они есть;
- не мутировать входные данные;
- возвращать нормализованный `KitchenBrief` либо `validation_error`.

### 2.2. Calculator lead -> KitchenBrief

Рекомендуемый модуль:

- `src/kitchen/calculator-to-brief.js`

Обязанности:

- читать category/rules/lead-поля из kitchen calculator runtime;
- заполнять `estimateKzt` и ссылку на calculator metadata;
- нормализовать layout и базовые kitchen modules по preset или по введённым размерам.

### 2.3. PDF -> KitchenBrief

Рекомендуемый модуль:

- `src/pdf/pdf-kitchen-to-brief.js`

Этот модуль должен стать следующим шагом после текущих PDF Slices 1-5, где уже есть manifest, page classification, room/furniture-zone extraction и orchestration contract без production AI calls.[cite:112]

Для первого прохода модуль может быть stub/контрактом, но его нужно спроектировать сразу так, чтобы входом был результат Project PDF Intelligence, а выходом — тот же самый `KitchenBrief`.

## Фаза 3. Kitchen domain model поверх brief

### Цель

Нельзя строить SketchUp plan напрямую из грязных order/calculator/pdf данных. Нужна промежуточная кухонная модель.

### Новый модуль

Рекомендуемое место:

- `src/kitchen/model.js`

### Предлагаемый контракт `KitchenModel`

```json
{
  "schemaVersion": 1,
  "layout": "L",
  "roomEnvelope": {
    "wallAmm": 3000,
    "wallBmm": 2100,
    "ceilingHeightMm": 2700
  },
  "walls": [
    { "id": "A", "lengthMm": 3000 },
    { "id": "B", "lengthMm": 2100 }
  ],
  "baseModules": [
    {
      "id": "base-1",
      "wall": "A",
      "kind": "sink-base",
      "xMm": 0,
      "widthMm": 800,
      "heightMm": 720,
      "depthMm": 560
    }
  ],
  "wallModules": [
    {
      "id": "wall-1",
      "wall": "A",
      "kind": "wall-cabinet",
      "xMm": 0,
      "widthMm": 800,
      "heightMm": 720,
      "depthMm": 320,
      "mountBottomMm": 1400
    }
  ],
  "applianceBlocks": [
    {
      "id": "fridge-1",
      "wall": "B",
      "kind": "fridge",
      "xMm": 0,
      "widthMm": 600,
      "heightMm": 2000,
      "depthMm": 650
    }
  ]
}
```

### Правила модели

- Никакой сложной parametric geometry на первом этапе.
- Все размеры только в миллиметрах.
- Для L/U-shaped layouts всегда использовать явный список стен.
- Все блоки должны иметь координаты вдоль стены и проверяемые габариты.
- Никаких автоматически угаданных материалов, фасок, радиусов и сложных углов.
- Любые неполные данные должны останавливать build модели, если без них невозможно построить безопасный envelope.

## Фаза 4. KitchenBrief -> KitchenModel builder

Нужен builder:

- `src/kitchen/build-kitchen-model.js`

### Что делает builder

- принимает `KitchenBrief`;
- валидирует layout;
- строит envelope помещения;
- раскладывает базовые модули по стенам;
- раскладывает верхние модули;
- строит appliance blocks;
- возвращает `KitchenModel`.

### Ограничения первого релиза

Поддержать только:

- `straight`
- `L`
- `U` (опционально вторым шагом)

И только такие типы модулей:

- `sink-base`
- `drawers`
- `base-cabinet`
- `corner-base`
- `oven-base`
- `fridge-box`
- `wall-cabinet`
- `hood-cabinet`

Это даст 80% практической ценности для типовой кухни и не взорвёт сложность.

### Правила fail-closed

Builder должен возвращать controlled error, если:

- layout неизвестен;
- wall length не хватает под сумму модулей;
- есть overlap модулей;
- ceiling height отсутствует;
- модуль с неразрешённым типом;
- wall reference не входит в allowlist.

## Фаза 5. KitchenModel -> `furniture-model/v1`

Текущий SketchUp путь уже использует `furniture-model/v1` как исходную точку для command-plan.[cite:111]

Нужно расширить этот контракт kitchen-подтипом, а не создавать отдельный параллельный 3D pipeline.

### Новый модуль

- `src/sketchup/kitchen-furniture-model.js`

### Задача

- преобразовать `KitchenModel` в совместимый `furniture-model/v1`;
- сохранить все existing safety guarantees;
- не ломать wardrobe / OCR path.

### Принцип

Если сейчас `furniture-model/v1` по смыслу шкафо-ориентирован, расширение должно быть additive:

- добавить `furnitureType: "kitchen"`;
- добавить `layout`, `walls`, `modules`, `appliances`;
- сохранить общие поля типа source/order/metadata/confidence.

## Фаза 6. `furniture-model/v1` -> `sketchup-command-plan/v1` для кухни

### Цель

Командный план должен остаться таким же безопасным и allowlisted, как сейчас, но уметь выражать кухню как набор простых геометрических действий.[cite:111]

### Новый модуль

- `src/sketchup/kitchen-command-plan.js`

### Разрешённые команды первого этапа

На первом этапе рекомендуется не расширять язык слишком сильно. Достаточно 4 типов действий:

- `set_units_mm`
- `create_room_envelope`
- `place_block_module`
- `place_block_appliance`

### Пример фрагмента плана

```json
{
  "schemaVersion": 1,
  "commands": [
    { "type": "set_units_mm" },
    {
      "type": "create_room_envelope",
      "layout": "L",
      "wallAmm": 3000,
      "wallBmm": 2100,
      "ceilingHeightMm": 2700
    },
    {
      "type": "place_block_module",
      "wall": "A",
      "xMm": 0,
      "widthMm": 800,
      "heightMm": 720,
      "depthMm": 560,
      "kind": "sink-base"
    },
    {
      "type": "place_block_appliance",
      "wall": "B",
      "xMm": 0,
      "widthMm": 600,
      "heightMm": 2000,
      "depthMm": 650,
      "kind": "fridge"
    }
  ]
}
```

### Что нельзя делать

- не добавлять arbitrary Ruby;
- не передавать shell commands;
- не добавлять freeform expressions;
- не передавать текстовые скрипты для интерпретации на Windows/Ruby стороне;
- не использовать внешние URL для geometry assets.

## Фаза 7. Ops endpoint и D1 audit не ломать

Уже существует ops-scoped endpoint `POST /api/orders/:id/sketchup/jobs` и pending-first audit contract.[cite:111]

### Требование

Kitchen path должен использовать существующий workflow, а не создавать новый endpoint.

### Что может потребоваться

- дописать support kitchen-specific validation перед созданием job;
- добавить в audit metadata `furnitureType: kitchen`, `layout`, `moduleCount`, `hasAppliances`;
- не менять existing auth model и manager confirmation flow.

## Фаза 8. Windows node service: kitchen support

### Где менять

- `sketchup-node-service/`

### Что нужно сделать

Windows node service уже умеет dry-run boundary и guarded execution adapter path.[cite:111][cite:112]

Теперь нужно добавить kitchen-aware dry-run handling:

- принимать `kitchen` jobs;
- валидировать команды `create_room_envelope`, `place_block_module`, `place_block_appliance`;
- формировать dry-run summary по кухне;
- не включать реальное исполнение по умолчанию.

### Dry-run summary должен показывать

- layout;
- размеры помещения;
- сколько base modules;
- сколько wall modules;
- сколько appliances;
- ожидаемые артефакты (`model.skp`, `preview.png`, optional `render.png`).

## Фаза 9. Ruby consumer scaffold для кухни

### Где менять

- local SketchUp Ruby envelope consumer scaffold и/или related queue consumer code path, описанный в SketchUp Slices 13B-13D.[cite:111][cite:112]

### Первая полезная цель

Нужно реализовать базовую сцену кухни:

1. Создать envelope помещения.
2. Создать нижние модули как прямоугольные блоки.
3. Создать верхние модули как прямоугольные блоки.
4. Создать технику как отдельные блоки.
5. Сохранить `model.skp`.
6. Сделать `preview.png`.
7. Записать корректный render-ready outbox.

### Очень важно

На первом этапе Ruby consumer не должен:

- генерировать сложную кухонную геометрию;
- использовать EasyKitchen assets автоматически;
- резать отверстия под мойку/варку;
- делать фотореалистичный render;
- читать произвольные внешние файлы.

## Фаза 10. Render artifacts и возврат в платформу

Платформа уже имеет:

- `POST /api/orders/:id/sketchup/render-artifacts`;
- `GET /api/orders/:id/sketchup/render-artifacts`;
- `POST /api/orders/:id/sketchup/render-files`;
- R2 binding `SKETCHUP_RENDER_BUCKET` для already-generated files.[cite:111]

### Требования к kitchen path

После успешной генерации Ruby/Windows path должен отдавать минимально такой набор:

- `model.skp`
- `preview.png`

Опционально позже:

- `render-1.png`
- `render-2.png`
- `scene.json` / future export format

### Metadata каждого файла

- `role`
- `mimeType`
- `sizeBytes`
- `sha256`
- safe storage key

Ничего в этом контракте придумывать не нужно — надо использовать уже существующий render artifact storage path.[cite:111]

## Фаза 11. Админка и UX заказа кухни

### Минимум для первой версии

Когда kitchen render path завершён, менеджер должен видеть в карточке заказа:

- есть ли 3D model/job;
- статус job;
- список артефактов;
- preview thumbnail или хотя бы link/open action;
- distinction between accepted dry-run and real generated preview.

### Где менять

- existing admin order actions / `3D renders` action, уже описанный в README.[cite:111]

### Не делать сейчас

- сложный 3D viewer;
- webgl просмотрщик;
- редактор сцены в браузере.

Сначала достаточно рабочего и понятного manager workflow.

## Фаза 12. Связка с калькулятором и КП

### Калькулятор

Kitchen path должен использовать уже существующий calculator layer, который хранит `calculatorMeta`, `formulaVersion` и `schemaVersion`, а также сохраняет lead как обычный order.[cite:111]

### Коммерческое предложение

В текущем README описан готовый proposals path с draft/publish/approve и D1 lifecycle.[cite:111][cite:112]

Нужно спроектировать так, чтобы на следующем этапе kitchen 3D preview можно было:

- прикреплять к order proposal workflow;
- использовать как reference image для manager-reviewed proposal;
- не менять proposal security model.

На первой итерации достаточно хранить привязку render artifact к order. Интеграция в proposal UI — следующая задача.

## Фаза 13. Связка с PDF Intelligence

PROJECT_PROGRESS показывает, что текущий product focus — **Project PDF Intelligence**; уже готовы manifest, page classification, room/furniture-zone extraction и orchestration contracts, а следующая meaningful result — design admin upload draft storage.[cite:112]

### Что должен учитывать кодер

Kitchen 3D path нельзя делать в отрыве от PDF Intelligence. Нужно заранее оставить совместимую точку входа:

- `PDF kitchen extraction result -> KitchenBrief`

### Практический вывод

Любая логика нормализации кухни должна сидеть в kitchen domain modules, а не в OCR/PDF/Cloudflare endpoints напрямую. Тогда и order lead, и calculator lead, и PDF result будут собираться одинаково.

## Фаза 14. Тесты

### Обязательные unit tests

Создать тесты для:

- `src/kitchen/brief.js`
- `src/kitchen/order-to-brief.js`
- `src/kitchen/calculator-to-brief.js`
- `src/kitchen/model.js`
- `src/kitchen/build-kitchen-model.js`
- `src/sketchup/kitchen-furniture-model.js`
- `src/sketchup/kitchen-command-plan.js`

### Что тестировать

- валидный straight kitchen;
- валидный L kitchen;
- отсутствие обязательных размеров;
- overlap модулей;
- слишком длинная цепочка модулей для стены;
- неизвестный тип модуля;
- build plan только из allowlisted команд;
- no mutation of inputs.

### Интеграционный smoke

После unit tests нужен один синтетический happy-path сценарий:

- test kitchen order/brief;
- build kitchen model;
- build sketchup command plan;
- create sketchup node job;
- run dry-run/fake-node or Windows queue path;
- register render artifacts.

Этот smoke можно оформить отдельным скриптом в `scripts/`, по аналогии с существующими smoke runners.[cite:111][cite:112]

## Фаза 15. Порядок реализации

Рекомендуемый безопасный порядок:

1. `KitchenBrief` contract + tests.
2. Order/calculator mappers + tests.
3. `KitchenModel` + builder + tests.
4. `KitchenModel -> furniture-model/v1` adapter.
5. `furniture-model/v1 -> sketchup-command-plan/v1` kitchen adapter.
6. Dry-run support in `sketchup-node-service`.
7. Ruby scaffold support for block kitchen scene.
8. Render artifact registration and admin visibility check.
9. Synthetic end-to-end smoke.
10. Только после этого — следующая итерация по PDF input и richer geometry.

## Definition of Done для первого kitchen 3D milestone

Milestone считается завершённым только если выполнено всё ниже:

- есть `KitchenBrief` и kitchen domain modules;
- order и calculator data могут быть преобразованы в kitchen brief;
- `KitchenBrief` превращается в безопасный `KitchenModel`;
- `KitchenModel` превращается в совместимый kitchen `furniture-model/v1`;
- buildится kitchen-specific allowlisted `sketchup-command-plan/v1`;
- Windows service принимает и валидирует kitchen dry-run job;
- Ruby scaffold создаёт safe kitchen envelope + block modules + preview;
- `model.skp` и `preview.png` проходят через existing render artifact path;
- в админке заказа можно увидеть результат;
- есть unit tests и хотя бы один synthetic integration smoke;
- ничего из этого не включает uncontrolled execution, arbitrary Ruby, customer data autorun или unsafe network coupling.[cite:111][cite:112]

## Что делать нельзя

Кодеру запрещено на этом этапе:

- переписывать существующий SketchUp security model;
- обходить manager approval и ops scopes;
- добавлять shell execution в Cloudflare layer;
- использовать arbitrary geometry commands;
- автоматически включать production execution;
- смешивать kitchen domain logic с raw endpoint parsing;
- строить сложную parametric kitchen engine before the first block-model milestone.

## Приоритет после milestone 1

После завершения первого kitchen 3D milestone следующий разумный шаг:

1. kitchen PDF -> KitchenBrief;
2. richer geometry (угловые модули, холодильные колонны, верхние шкафы под потолок);
3. optional EasyKitchen adapter;
4. proposal/CRM UI linkage с 3D preview;
5. supplier pricing integration для более точной оценки кухни.[cite:111][cite:112]

## Краткий итог для кодера

Нужно реализовать **первый безопасный kitchen-first 3D путь**, а не «полноценный мебельный CAD». Основа уже есть: platform boundary, jobs, queue, render artifacts, admin visibility и current product focus на дальнейшую структуризацию входных данных.[cite:111][cite:112]

Успех первого этапа измеряется не красотой рендера, а тем, что кухня из заказа или калькулятора проходит через единый доменный brief, превращается в безопасную 3D-сцену и возвращается в order workflow как понятный управляемый артефакт.[cite:111][cite:112]
