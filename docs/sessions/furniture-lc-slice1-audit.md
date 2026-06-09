# LC Slice 1 commercial workflow audit

Date: 2026-06-10

## Confirmed working

- Calculator draft/published pricing, safe rules, schema storage, preview API, embed token, and lead-to-order flow.
- Landing records, generated HTML artifact, domain/status fields, and VPS deploy proxy.

## Gaps blocking paid landing work

- Landing records have no structured customer brief or editable content.
- Template keys change only an accent color; there is no curated template contract.
- Admin cannot edit an existing landing or preview the exact artifact.
- Landing artifact uses placeholder contacts/content and cannot embed a selected calculator.
- Calculator schema exists in D1 but has no admin field editor.
- Embed widget renders hardcoded controls instead of the complete active published schema.
- Desktop/mobile browser verification is missing.

## Delivery decision

- Store normalized structured landing content in `sites.content_json`.
- Keep template definitions and allowed sections in code.
- Add admin editing and artifact preview without arbitrary HTML or formulas.
- Complete the existing safe calculator schema editor and make runtime rendering honor it.
- Keep production VPS/domain/SSL work in LC Slice 6.
