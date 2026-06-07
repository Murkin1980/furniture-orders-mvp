# Furniture Orders MVP - Stage 4.04A implementation summary

Date: 2026-05-31

## Scope

Implemented the first safe slice of Stage 4.04: landing sites as a separate product entity with domains, deployment records, admin UI controls and a dry-run publish flow through the existing VPS control layer.

Real VPS publication is intentionally not enabled in this slice because Stage 4.03C still needs live Ubuntu service installation and deploy implementation.

## Changes applied

- Added D1 migration `migrations/0007_sites.sql` with:
  - `sites`;
  - `site_domains`;
  - `site_deployments`;
  - indexes for slug, domains and deployment history.
- Added `src/sites-core.js` with:
  - site payload normalization;
  - slug generation and duplicate slug validation;
  - site creation and listing;
  - site details with domains and deployments;
  - short publication status response;
  - deployment record creation;
  - integration with `deployVpsSite()` from `src/vps-control.js`;
  - dry-run publish default.
- Added Cloudflare Functions:
  - `GET /api/sites`;
  - `POST /api/sites`;
  - `GET /api/sites/:id`;
  - `POST /api/sites/:id/deploy`;
  - `GET /api/sites/:id/status`.
- Added admin UI block in `public/admin.html`:
  - create landing site;
  - set slug/domain/template;
  - list landing sites;
  - view status;
  - run publish dry run;
  - open primary domain link.
- Added `tests/sites-core.test.js` for:
  - normalization;
  - create/list with primary domain;
  - duplicate slug rejection;
  - successful VPS dry-run deploy status;
  - failed VPS deploy status.
- Updated `package.json` check script to include new Stage 4.04 files.
- Updated `README.md` with Stage 4.04A status, endpoints, schema, files, migration and test count.
- Applied production D1 migration `0007_sites.sql` to `furniture_orders`.
- Committed and pushed the code as `d41612a stage4: add landing sites module`.
- Deployed Cloudflare Pages preview `https://aa001a80.furniture-orders-mvp.pages.dev`.

## Verification

Passed:

```bash
npm.cmd run check
npm.cmd test
```

Result:

```text
58 tests
58 pass
```

Production smoke:

```text
https://furniture-orders-mvp.pages.dev/admin -> 200 OK
https://furniture-orders-mvp.pages.dev/api/sites without token -> 401 unauthorized
```

## Known limits

- `POST /api/sites/:id/deploy` defaults to `dryRun: true`.
- Real static artifact generation is not implemented yet.
- Real publication depends on Stage 4.03C and Ubuntu-side service work:
  - install `vps-control-service/` on the VPS;
  - configure `VPS_CONTROL_BASE_URL`;
  - configure `VPS_CONTROL_TOKEN`;
  - implement real deploy in the Ubuntu-side service.
- SSL status is stored but not yet actively checked against DNS/HTTPS.

## Reviewer notes

This is a data/API/admin foundation for landing sites, not the final landing builder. The important contract added here is that sites, domains and deployments are now first-class records. Future Stage 4.04B can focus on generating deployable artifacts and switching from dry-run publish to live VPS deploy without changing the admin-facing API shape.
