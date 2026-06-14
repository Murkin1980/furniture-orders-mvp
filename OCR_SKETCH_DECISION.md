# OCR and Sketch Recognition Decision

Date: 2026-06-14
Status: accepted for staged implementation

## Decision

OCR and sketch recognition will be an optional, manager-reviewed assistance
layer attached to an existing order. It must not create production dimensions,
quotes, SketchUp models, or customer promises without human approval.

Keep three responsibilities separate:

1. OCR extracts visible text and numbers.
2. Sketch interpretation proposes structured furniture measurements and
   components with confidence and warnings.
3. A future SketchUp adapter consumes only manager-approved structured data.

## First Useful Workflow

```text
Manager uploads a test sketch/photo
-> platform stores the original media
-> manual recognition action
-> provider extracts raw text and observations
-> safe parser builds a review draft
-> manager corrects and approves the draft
-> approved measurements attach to the order
-> future SketchUp integration may consume the approved version
```

There is no automatic recognition on public order intake.

## Supported MVP Inputs

- Clear photos or scans of handwritten furniture sketches.
- Printed measurement sheets.
- Screenshots or exported images with dimensions.
- JPEG, PNG, and WebP files already compatible with the media layer.
- One image per recognition run.

PDF, multi-page documents, CAD files, and video remain later extensions.

## Furniture-First Interpretation Rule

Every image submitted to this OCR workflow is treated as furniture-related by
default: a furniture sketch, measurement sheet, or reference image. Recognition
must interpret visible lines, labels, and shapes only in a furniture-design
context.

This assumption does not permit invention. If the furniture type, component,
dimension, or meaning of a mark is unclear, the result must use `other`, omit
the uncertain item, or add a warning. It must not reinterpret unclear marks as
unrelated objects, rooms, people, scenes, or purposes.

## Structured Draft Contract

Recognition output must normalize into a strict draft structure:

```json
{
  "documentType": "furniture_sketch",
  "furnitureType": "kitchen",
  "rawText": "Manager-readable extracted text",
  "dimensions": [
    {
      "label": "overall_width",
      "value": 3200,
      "unit": "mm",
      "confidence": 0.91,
      "sourceText": "3200"
    }
  ],
  "components": [],
  "materials": [],
  "notes": [],
  "warnings": [],
  "missingInfo": [],
  "confidence": 0.72
}
```

Values with unknown units or ambiguous labels remain warnings. The parser must
never silently guess units, room orientation, materials, or component
placement.

## Storage and Provider Boundaries

- Original media belongs in R2 through the existing media/storage layer.
- Recognition drafts and approved structured results belong in D1.
- Approved and draft versions must remain distinguishable.
- Every recognition record must reference its order and source media.
- Provider calls stay behind an injected sender interface.
- The platform contract must not depend on one vendor response shape.
- Start with a fake/injected provider; no migration is added in this slice.

## Safety and Privacy

- Manual trigger and synthetic/test images first.
- Manager approval before structured results become order data.
- Keep the original image beside every draft for comparison.
- Highlight low-confidence and conflicting values.
- Recognition failure must not damage the order or media record.
- No autonomous quote, customer message, deploy, or SketchUp action.
- Do not send customer images to a provider until consent and retention rules
  are documented.

## Future Slices

1. Pure result schema, default result, parser, and tests. Complete.
2. Provider-neutral prompt/request builder without network calls. Complete.
3. Orchestration with injected fake sender. Complete.
4. D1 draft/approved storage model and pure persistence helpers. Complete.
5. Protected manual recognition endpoint. Complete.
6. Admin review UI with original image and editable result. Complete.
7. Real provider sender and synthetic local smoke. Sender complete; synthetic
   local smoke pending.
8. Production secrets, consent/retention policy, and controlled smoke.
9. SketchUp mapping from approved data into a versioned furniture model.

## Explicitly Not Now

- No external OCR or vision API calls.
- No endpoint, UI, migration, deploy, or production secret.
- No automatic processing of new orders.
- No direct SketchUp MCP invocation.
- No automatic dimensions, quote, or customer communication.

## Success Criteria

A manager can manually process a test sketch, compare the original with a
structured draft, correct uncertain values, approve the result, and leave the
normal order workflow intact when recognition fails.
