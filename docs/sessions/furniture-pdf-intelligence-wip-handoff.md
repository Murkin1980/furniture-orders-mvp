# Furniture PDF Intelligence WIP Handoff

Date: 2026-06-23

## Current Goal

Continue Project PDF Intelligence after completing the safe pure/injected
foundation. Next planned slice: admin upload draft storage design.

## Done

- Slice 1-2: decision document and pure PDF manifest/schema.
- Slice 3: furniture-first page classification prompt/parser and manifest merge.
- Slice 4: room and furniture-zone extraction prompt/parser and manifest merge.
- Slice 5: injected PDF analysis orchestration with no real network calls.

## Latest Commits

- `c1a712e` - `feat: add PDF room extraction contract`
- `1275a92` - `docs: record PDF room extraction deployment`
- `5df566a` - `feat: add PDF analysis orchestration`

## Latest Deploy

- `https://721c542c.furniture-orders-mvp.pages.dev`

## Changed In Latest Slice

- `src/pdf/analyze-project-pdf.js`
- `tests/project-pdf-analyze.test.js`
- `src/pdf/room-extraction.js`
- `package.json`
- `README.md`
- `docs/decisions/PROJECT_PDF_INTELLIGENCE_DECISION.md`
- `PROJECT_PROGRESS.md`
- `PROJECT_PROGRESS.html`
- `SESSION_NOTES.md`
- `docs/sessions/furniture-pdf-intelligence-slice5-summary.md`

## Checks Passed

- Focused PDF tests: 34 passed.
- Full project suite: 501 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed with CRLF warnings only.
- `npm.cmd run deploy`: passed.

## Production Boundary

No PDF upload, endpoint, migration, UI, storage, binary parser, real provider
sender, or estimate generation has been added yet.

## Next Commands

```powershell
cd "C:\Users\Мурат\OneDrive\Documents\Furniture Web platform\furniture-orders-mvp"
git status --short
npm.cmd test
npm.cmd run check
```

## Next Slice

Design admin upload draft storage:

- decide D1 table shape for project PDF documents/pages/extractions;
- keep raw file storage out of scope unless explicitly approved;
- keep endpoint/UI out of the first storage design slice if token budget is low;
- add migration and pure store tests only after schema is reviewed.

## Do Not Commit Automatically

Old untracked instruction/handoff files still exist and were intentionally not
included in the PDF commits unless explicitly requested by the user.
