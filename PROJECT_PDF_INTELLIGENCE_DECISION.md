# Project PDF Intelligence Decision

## Decision

Project PDF Intelligence is an order-admin workflow inside
`furniture-orders-mvp`.

It lets a furniture maker upload or attach an interior designer PDF to an order,
then produces a reviewable preliminary breakdown:

```text
designer PDF
-> page manifest
-> page classification
-> room and furniture-zone extraction
-> manager review
-> preliminary estimate draft
-> commercial proposal draft
-> optional OCR/SketchUp/3D handoff
```

The platform must assume the PDF belongs to a furniture project, but it must not
invent dimensions, materials, rooms, prices, or 3D geometry that are not present
or confidently extracted.

## Product Boundary

Project PDF Intelligence supports the furniture platform. It does not replace:

- manager review;
- measurement on site;
- calculator pricing contracts;
- commercial proposal approval;
- SketchUp execution approval;
- supplier catalog approval.

The first version is review-first and manual-first.

## Safety Rules

- No automatic final price.
- No automatic customer-facing commercial proposal.
- No autonomous SketchUp or render job.
- No arbitrary code execution.
- No unreviewed supplier prices.
- Unknown values stay unknown.
- Every extracted value keeps source page, confidence, and warnings.
- Low-confidence extraction must become `missingInfo`, not a guessed value.
- Designer PDF pages may include private client data; raw files and extracted
  text must follow the source/privacy policy in `DATA_SOURCES.md`.

## Extraction Model

The pipeline is split into small safe slices:

1. Pure manifest/schema. Implemented in `src/pdf/project-pdf-manifest.js`.
2. Page classification prompt/schema. Implemented in
   `src/pdf/page-classification.js`.
3. Room and furniture-zone extraction schema. Implemented in
   `src/pdf/room-extraction.js`.
4. AI orchestration with injected sender. Implemented in
   `src/pdf/analyze-project-pdf.js`.
5. Admin upload draft.
6. Manager review UI.
7. Estimate draft generator.
8. Commercial proposal integration.
9. OCR and SketchUp handoff.

## Page Types

Supported page type values:

- `floor_plan`
- `elevation`
- `visualization`
- `specification`
- `text`
- `mixed`
- `unknown`

Unknown or unsupported page types normalize to `unknown`.

## Implemented Pure Contracts

- `src/pdf/project-pdf-manifest.js` creates safe PDF document/page manifests
  from already known metadata.
- `src/pdf/page-classification.js` builds a furniture-first classification
  prompt, parses strict JSON responses, clamps confidence, ignores pages outside
  the manifest, and merges page classifications without mutating the input.
- `src/pdf/room-extraction.js` builds a furniture-first room/zone extraction
  prompt, parses strict JSON responses, keeps only zones tied to known pages,
  normalizes zone types/dimensions/materials, and merges zones into pages
  without mutating the input.
- `src/pdf/analyze-project-pdf.js` chains the pure contracts with an injected
  sender, OpenAI-compatible request objects, safe meta/error handling, and no
  fallback to global `fetch`.
- Both contracts are pure JavaScript and do not upload files, call AI providers,
  create endpoints, add migrations, or generate estimates.

## Furniture Context

The system is furniture-first. It should look for:

- kitchens;
- wardrobes;
- walk-in closets;
- bathroom furniture;
- hallways;
- kids furniture;
- office furniture;
- TV zones;
- commercial furniture;
- storage/cabinets;
- other custom furniture.

It must not classify unrelated objects as furniture unless the PDF context makes
that likely and the result remains reviewable.

## Estimate Boundary

PDF-derived estimate lines are draft-only. They can include:

- room name;
- furniture zone;
- extracted dimensions;
- extracted materials;
- missing information;
- confidence;
- source page references;
- suggested calculator category.

They cannot include final commercial prices until manager review and approved
pricing rules/catalog entries are applied.

## Future Storage

Future migrations may add:

- `project_pdf_documents`;
- `project_pdf_pages`;
- `project_pdf_extractions`;
- `project_pdf_estimate_drafts`.

This decision slice does not add migrations.

## Future Env

No environment variables are required for the pure manifest slice.

Future AI/provider slices may reuse the existing provider pattern and must stay
disabled until explicit local and production smoke checks pass.
