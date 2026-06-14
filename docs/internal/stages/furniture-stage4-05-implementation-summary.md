# Furniture Orders MVP - Stage 4.05 implementation summary

Date: 2026-05-31

## Scope

Implemented Stage 4.05 MVP: portfolio categories, furniture work records, multiple image URLs per work, admin publish/unpublish and a public gallery block with category filters.

This pass intentionally keeps image input URL-based. Binary upload/storage is left for Stage 4.05B because the project does not yet have R2 or another file storage layer.

## Changes applied

- Added D1 migration `migrations/0008_portfolio.sql`:
  - `portfolio_categories`;
  - `portfolio_items`;
  - `portfolio_images`;
  - default category seed;
  - indexes for categories, item status/category and image ordering.
- Added `src/portfolio-core.js`:
  - default category definitions;
  - payload normalization;
  - create/list/get/update portfolio item flow;
  - image URL normalization and validation;
  - image replacement/addition;
  - publish/unpublish with guard that published works must have at least one image.
- Added Cloudflare Functions:
  - `GET /api/portfolio`;
  - `POST /api/portfolio`;
  - `GET /api/portfolio/:id`;
  - `PUT /api/portfolio/:id`;
  - `POST /api/portfolio/:id/images`;
  - `POST /api/portfolio/:id/publish`.
- Public API behavior:
  - unauthenticated `GET /api/portfolio` returns only `published` works;
  - admin-authenticated `GET /api/portfolio` returns all works.
- Added admin UI section in `public/admin.html`:
  - create work;
  - select category;
  - paste multiple image URLs;
  - mark featured;
  - filter by category;
  - publish/unpublish;
  - add more photo URLs.
- Added public gallery block in `public/index.html`:
  - fetches `/api/portfolio`;
  - renders published work cards;
  - renders category filter buttons.
- Added `tests/portfolio-core.test.js` for:
  - payload normalization;
  - draft creation with images;
  - public published-only visibility;
  - category filtering;
  - publish validation without images.
- Updated `package.json` check script.
- Updated `README.md` with Stage 4.05 schema, endpoints, files and test count.
- Applied production D1 migration `0008_portfolio.sql` to `furniture_orders`.
- Committed and pushed the code as `015bf47 stage4: add portfolio gallery module`.
- Deployed Cloudflare Pages preview `https://1cf52e18.furniture-orders-mvp.pages.dev`.

## Follow-up fix after deployment

After deployment, the public homepage showed mojibake in the new portfolio gallery text, for example `РџРѕСЂС‚...` instead of Russian copy.

Applied a follow-up fix:

- Rewrote visible Russian text in `public/index.html` as valid UTF-8.
- Fixed the public portfolio section text:
  - `Портфолио работ`;
  - `Опубликованные проекты из админки с фильтром по категориям.`;
  - `Все`;
  - `Пока нет опубликованных работ`;
  - empty-state helper text.
- Also cleaned the homepage order-form copy that had the same encoding issue.
- Re-ran checks successfully:

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
62 tests
62 pass
```

- Committed and pushed the fix as `f13895e fix public portfolio text encoding`.
- Deployed Cloudflare Pages preview `https://b97b93af.furniture-orders-mvp.pages.dev`.
- Verified production `/` returns `200 OK`.

## Verification

Passed:

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
62 tests
62 pass
```

Production smoke:

```text
https://furniture-orders-mvp.pages.dev/ -> 200 OK
https://furniture-orders-mvp.pages.dev/admin -> 200 OK
https://furniture-orders-mvp.pages.dev/api/portfolio -> 200 OK, returns default categories and published items array
```

## Known limits

- The MVP accepts photo URLs, not file uploads.
- No image resizing/optimization pipeline exists yet.
- Public gallery only shows works after an admin publishes them.
- Browser screenshot/manual UI smoke was not run in this pass.

## Reviewer notes

The main architectural decision is keeping portfolio media storage out of this stage. The new API and DB model are ready for a future R2-backed upload endpoint because image metadata is already separate in `portfolio_images`.
