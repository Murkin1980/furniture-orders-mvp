# External editor task: Landings and calculators LC Slice 1-2A

Repository: `furniture-orders-mvp`  
Task type: small, reviewable code slice  
Current focus: finish landings and calculators for paid landing-page orders

## Read first

Read only these files before editing:

```text
AGENTS.md
PRODUCT.md
SESSION_NOTES.md
PROJECT_PROGRESS.md
docs/sessions/furniture-landings-calculators-wip-handoff.md
src/sites-core.js
src/calculators-core.js
src/calculators-pricing.js
tests/sites-core.test.js
tests/orders-core.test.js
package.json
```

Do not scan unrelated AI, CRM, portfolio, knowledge, or donor-repository files.

## Product context

We need a repeatable commercial flow:

```text
Customer orders a landing page
-> manager records a structured brief
-> landing is created from a reusable furniture template
-> calculator is selected and embedded when needed
-> exact preview is reviewed
-> landing is published
-> landing and calculator leads enter furniture-orders-mvp
```

The existing repository already has landing site records, generated HTML artifacts, calculator runtime/embed, lead intake, admin panels, and deploy code.

## Your task

Implement the first safe foundation for the commercial landing workflow: a pure structured landing brief module.

Create:

```text
src/site-brief.js
tests/site-brief.test.js
```

Update:

```text
package.json
SESSION_NOTES.md
```

Do not change other files unless a failing test proves a minimal change is required. Explain every additional file change.

## Required exports

Export:

```js
getDefaultSiteBrief()
normalizeSiteBrief(input)
validateSiteBrief(brief)
buildSiteBriefSummary(brief)
```

## Brief contract

The normalized brief must return this stable shape:

```js
{
  businessName: "",
  ownerName: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  domain: "",
  furnitureTypes: [],
  primaryOffer: "",
  audience: "",
  advantages: [],
  sections: [],
  colorPreference: "",
  stylePreference: "",
  portfolioRequired: true,
  calculatorRequired: false,
  calculatorId: null,
  notes: ""
}
```

## Normalization rules

- Accept only a plain object; empty, null, array, or invalid input returns the default shape.
- Support camelCase and these snake_case aliases:
  - `business_name`
  - `owner_name`
  - `furniture_types`
  - `primary_offer`
  - `color_preference`
  - `style_preference`
  - `portfolio_required`
  - `calculator_required`
  - `calculator_id`
- Text values must be trimmed strings.
- Never return the literal strings `undefined` or `null`.
- `furnitureTypes`, `advantages`, and `sections` must always be arrays of non-empty trimmed strings.
- If an array field is supplied as a string, convert it to a one-item array.
- Remove duplicate array values while preserving their original order.
- `portfolioRequired` defaults to `true`.
- `calculatorRequired` defaults to `false`.
- Boolean normalization may accept booleans, `1`/`0`, and strings `true`/`false`.
- `calculatorId` must be a positive integer or `null`.
- If `calculatorRequired` is false, normalized `calculatorId` must be `null`.
- Do not mutate the input.
- Do not return `undefined` anywhere in the normalized result.

## Validation rules

`validateSiteBrief(brief)` must return an array of errors:

```js
[
  {
    field: "businessName",
    message: "..."
  }
]
```

Required fields:

- `businessName`
- `phone` or `whatsapp`: at least one contact number must exist
- `city`
- `primaryOffer`

Conditional validation:

- If `calculatorRequired` is true, `calculatorId` must be a positive integer.

Do not throw for invalid input. Validate a normalized copy internally if needed.

## Summary rules

`buildSiteBriefSummary(brief)` returns a readable manager-facing string.

It must include available values for:

- business name;
- owner;
- contact phone/WhatsApp;
- city;
- domain;
- furniture types;
- primary offer;
- audience;
- advantages;
- requested sections;
- portfolio requirement;
- calculator requirement and calculator ID;
- style/color preferences;
- notes.

Do not include lines for empty optional values. Do not include `undefined` or `null`.

## Required tests

Add focused tests covering:

1. Default brief has the exact stable shape.
2. Normalizes a complete camelCase brief.
3. Supports snake_case aliases.
4. Empty input returns safe defaults.
5. Trims text values.
6. Converts array-field strings to arrays.
7. Removes empty and duplicate array values.
8. Normalizes supported boolean forms.
9. Invalid calculator ID becomes null.
10. Calculator ID is cleared when calculator is not required.
11. Valid brief has no validation errors.
12. Missing required fields produce errors.
13. Phone or WhatsApp satisfies the contact requirement.
14. Required calculator without ID produces an error.
15. Summary includes important supplied values.
16. Summary does not contain `undefined` or `null`.
17. Input object is not mutated.
18. Normalized result contains no `undefined`.

## Restrictions

Do not:

- add `fetch`;
- add external API calls;
- add dependencies;
- add or change endpoints;
- change UI;
- change migrations or D1 schema;
- change deploy configuration;
- change landing artifact generation;
- change calculator formulas/runtime;
- change CRM or AI files;
- touch donor or live-site repositories;
- add real customer data, domains, credentials, or secrets;
- create a new repository.

## Required checks

Run:

```powershell
node --test tests/site-brief.test.js
npm.cmd test
npm.cmd run check
git diff --check
git status --short
```

Add `src/site-brief.js` to the existing `npm run check` command.

## SESSION_NOTES entry

Append a note using the existing format:

```md
## YYYY-MM-DD - Landing structured brief foundation

### What changed
- Added a pure structured landing brief module and focused tests.
- No UI, endpoint, migration, deploy, external API, or production change was made.

### Files changed
- `src/site-brief.js`
- `tests/site-brief.test.js`
- `package.json`
- `SESSION_NOTES.md`

### Checks
- Include exact results.

### Next
- Review the brief contract, then integrate it into landing persistence only in a separately approved slice.
```

## Final response

Return:

1. List of changed files.
2. Short explanation of behavior and design choices.
3. Exact test/check results.
4. Any uncertainty or discovered landing/calculator gap.
5. A diff or commit that can be reviewed later.

Do not proceed to UI, persistence, migrations, endpoints, or deploy after completing this task.

