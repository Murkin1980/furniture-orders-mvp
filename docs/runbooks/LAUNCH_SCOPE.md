# Launch Scope — Furniture Orders MVP

Date: 2026-06-28
Status: Draft — controlled pilot

## 1. Обязательно для живого теста

- [x] Заявка создаётся из публичной формы
- [x] Заявка создаётся из калькулятора
- [x] Заявка видна в админке
- [x] Менеджер может поменять статус
- [x] Менеджер может добавить заметку
- [x] Менеджер может поставить follow-up
- [x] История действий сохраняется
- [x] Можно создать КП
- [x] Можно сохранить новую версию КП
- [x] Можно опубликовать КП
- [x] Можно утвердить КП
- [x] Можно добавить портфолио
- [x] Можно загрузить фото
- [x] Можно опубликовать работу в портфолио
- [x] Админка закрыта токеном
- [x] Опасные действия требуют write/ops scope
- [x] Есть smoke scripts
- [x] Есть manual launch checklist
- [x] CI проходит

## 2. Разрешено в пилоте, но только под контролем

- [ ] AI-анализ заявки — manual only, disabled by default → включён
- [ ] AI-подсказка ответа — manual only, disabled by default → включён
- [x] PDF Intelligence — manual only, disabled by default
- [ ] OCR synthetic/manual tests — synthetic only, customer disabled
- [ ] VPS deploy для тестового лендинга — ops scope
- [x] Twenty manual sync — disabled by default

## 3. Не обещать клиенту на первом запуске

- Автоматическая отправка WhatsApp без менеджера
- Customer OCR без отдельного consent flow
- Автоматическое создание SketchUp/EasyKitchen рендера
- Автоматическое обновление цен поставщиков
- Массовый SaaS self-service

## Ссылки

- Launch readiness checklist: `LAUNCH_READINESS_CHECKLIST.md`
- Launch blockers: `LAUNCH_BLOCKERS.md`
- API access matrix: `API_ACCESS_MATRIX.md`
- Go-live gate: `GO_LIVE_GATE.md`
