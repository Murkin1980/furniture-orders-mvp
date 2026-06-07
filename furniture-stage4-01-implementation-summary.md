# Furniture Orders MVP - Stage 4.01 implementation summary

Date: 2026-05-30

## Goal

Implement the first Stage 4 substage: an embeddable furniture calculator widget that can be created from the admin panel, published as embed code, and can submit calculation results into the existing order intake system as leads.

## Implemented

- Added calculator business logic in `src/calculators-core.js`.
- Added D1 migration `migrations/0005_calculators.sql`.
- Added admin API:
  - `GET /api/calculators`
  - `POST /api/calculators`
  - `GET /api/calculators/:id`
  - `POST /api/calculators/:id/publish`
  - `GET /api/calculators/:id/embed`
- Added public widget lead API:
  - `POST /api/calculators/:id/lead`
- Added public embed script response from `/api/calculators/:id/embed?token=...`.
- Split admin embed-code lookup and public widget runtime into separate core functions:
  - `getCalculatorEmbedCode()`;
  - `getPublishedCalculatorRuntime()`.
- Added default category-based calculator data:
  - kitchen;
  - wardrobe;
  - cabinet furniture.
- Added estimate formula:
  - `estimate = (basePrice + unitPrice * units) * materialMultiplier`.
- Connected calculator lead submission to the existing `createOrder()` flow.
- Added shared phone normalization in `src/phone.js` and reused it in orders and calculator leads.
- Added calculator lead validation for invalid phone, unsupported category, and `materialMultiplier < 1`.
- Preserved calculator metadata structurally in order `raw_payload.calculatorMeta`.
- Added an admin calculator panel in `public/admin.html`:
  - calculator list;
  - create calculator button;
  - preview;
  - publish/embed action;
  - readonly embed code field.
- Updated `package.json` check script to include the new functions and core module.
- Extended `tests/orders-core.test.js` with calculator tests.
- Updated `README.md` to reflect Stage 3 and Stage 4.01 current functionality.

## Files changed

- `src/calculators-core.js`
- `src/phone.js`
- `functions/api/calculators.js`
- `functions/api/calculators/[id].js`
- `functions/api/calculators/[id]/publish.js`
- `functions/api/calculators/[id]/embed.js`
- `functions/api/calculators/[id]/lead.js`
- `migrations/0005_calculators.sql`
- `public/admin.html`
- `tests/orders-core.test.js`
- `package.json`
- `README.md`

Stage 3 WIP files were already present before Stage 4.01 work and were not separated into a commit during this pass.

## Checks passed

```bash
npm.cmd run check
npm.cmd test
```

Test result:

```text
22 tests
22 pass
```

## Review recommendations applied

- Separated admin embed-code flow from public widget runtime flow in the core API.
- Unified phone normalization/validation with the order intake flow.
- Blocked invalid `materialMultiplier` values below `1`.
- Stored calculator metadata structurally in `raw_payload.calculatorMeta`.
- Added negative tests for invalid embed token, disabled calculator runtime, invalid phone, unsupported category, and invalid multiplier.

Local smoke test:

```text
GET /admin -> 200 OK
POST /api/calculators -> success, calculator id 1
POST /api/calculators/1/publish -> success, embed code generated
GET /api/calculators/1/embed?token=... -> 200 OK
POST /api/calculators/1/lead?token=... -> 201 Created, orderId 6, estimate 300000 KZT
```

## Known notes

- The first attempt to start dev server with `cmd start` used `stage4-dev` incorrectly and Windows reported that it could not find that file. This was a command invocation issue only; the server was later started with `Start-Process`, tested, and stopped.
- The Stage 3 handoff still records a previous suspicion around manual `GET /api/order-steps?orderId=5` returning an empty array. Unit tests for project steps pass, but the Stage 3 manual follow-up should remain on the reviewer checklist before production deployment.

## Not committed automatically

Per workspace rules, instruction files, review notes, handoff files, and this summary file should not be committed automatically with code unless the user explicitly asks.
