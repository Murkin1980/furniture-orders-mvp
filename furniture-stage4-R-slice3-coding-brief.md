# Stage 4-R Slice 3 Coding Brief

## Goal

Move the large inline admin script from `public/admin.html` into `public/admin.js` without changing backend behavior or endpoint contracts.

## Scope

- Extract inline JS to `public/admin.js`.
- Keep `public/admin.html` as HTML/CSS plus a module script include.
- Centralize admin request helpers enough that direct `fetch` stays inside helper functions.
- Add placeholder files for future ES module split.
- Update README Stage 4-R notes.

## Boundaries

- Do not change backend endpoints.
- Do not change admin UI behavior intentionally.
- Do not refactor business flows deeply in this slice.
- Do not commit old handoff/review/log files automatically.

## Checks

- `npm.cmd run check`
- `npm.cmd test`
