# LC Slices 1-5 implementation summary

Date: 2026-06-10

## Completed slices

1. Audited the commercial landing/calculator workflow and recorded exact gaps.
2. Added a structured landing brief/content model and D1 migration `0012_site_content.sql`.
3. Added an allowlisted furniture template library.
4. Added landing create/edit controls and exact generated-artifact preview in admin.
5. Completed the calculator field schema editor and verified published embed behavior on desktop/mobile.

## Main implementation

- Added `src/site-brief.js` and `src/site-templates.js`.
- Extended `sites` with `content_json`; added `PUT /api/sites/:id`.
- Generated landing artifacts now use structured offer/contact/sections/CTA/theme data and can embed a selected published calculator.
- Incomplete commercial briefs are blocked before live deploy.
- Admin can edit landing content and safe calculator field schema.
- Published calculator embed honors active/required fields and has a mobile breakpoint.
- Repaired mojibake in the main admin HTML/JS interface.

## Verification

- Full tests: 156 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed.
- Browser QA: calculator create/publish, site create, exact preview, embedded calculator, and calculator lead-to-order flow passed.
- Mobile QA at 375px: no horizontal overflow; landing calculator width 335px; submit button height 44px.
- Browser console: no errors or warnings in tested flows.

## Operational note

- Production was not changed.
- Migration `0012` was not applied to production.
- The existing default local D1 migration history is inconsistent and attempted to replay `0002`; QA used an isolated clean local D1 state.
- LC Slice 6 must resolve/apply production migration and verify VPS/domain/SSL/live publishing.
