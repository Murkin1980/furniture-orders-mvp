# Project PDF Intelligence Decision

## Decision

Add Project PDF Intelligence as a separate, manual-first product workstream.
It will turn a multi-page apartment, house, or office design PDF into a
manager-reviewed project specification before any estimate or 3D task exists.

The system must not infer missing dimensions, materials, quantities, or room
relationships as facts. Every extracted value carries provenance, confidence,
and review status.

## Target workflow

Primary admin workflow: the furniture maker opens an order, clicks
`Upload designer project`, and uploads one PDF. The platform performs the
technical pipeline in the background and returns a preliminary furniture
estimate; page classification and extraction are implementation details, not
extra work imposed on the manager.

1. Upload a source PDF with explicit customer-data consent.
2. Split pages and classify plans, elevations, drawings, schedules, notes, and
   visual references.
3. Extract text, dimensions, rooms, furniture zones, and source coordinates.
4. Build draft room and furniture specifications.
5. Show uncertainties and conflicts to a manager.
6. Produce a preliminary estimate grouped by room and furniture item, with
   visible assumptions, confidence, and missing information.
7. Let the furniture maker review/correct the specification and estimate.
8. Approve a versioned project specification and commercial estimate.
9. Create SketchUp/3D jobs only from the approved specification.

The first useful result is not a technical drawing editor. It is a reviewable
draft estimate showing detected items, quantities, dimensions, materials,
price-list version, subtotals by room, total, and questions for the designer.

## Planned slices

1. PDF manifest, page model, limits, and safe parser contracts.
2. Page classification and render/extraction orchestration.
3. Room, drawing, and furniture-zone schema.
4. Dimension and annotation extraction with source evidence.
5. Furniture specification builder without geometry invention.
6. Manager review workspace and conflict resolution.
7. Versioned project estimate input and calculator mapping.
8. Room/project estimate and commercial proposal output.
9. SketchUp job generation from approved furniture specifications.
10. Controlled pilot, retention, deletion, observability, and production gate.

## Boundaries

- Existing furniture-first OCR remains the extraction foundation.
- Uploaded client PDFs stay private and follow consent/retention rules.
- AI output is always draft until a manager approves it.
- The automatic estimate is explicitly marked preliminary until manager review.
- Existing orders and estimates retain their original price/specification
  versions.
- No automatic production processing in the planning slice.
