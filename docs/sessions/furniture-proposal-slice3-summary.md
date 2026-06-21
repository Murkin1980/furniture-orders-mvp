# Proposal Slice 3 Reviewer Summary

Date: 2026-06-21

## Scope

Added a protected, non-persistent preview boundary for commercial proposals.

## Implementation

- Added `POST /api/proposals/preview`.
- Reused the shared scoped authorization helper and required write access.
- Accepted only a valid JSON object.
- Normalized the proposal through the existing template contract.
- Returned normalized data and escaped print-ready HTML.
- Added OPTIONS and method-not-allowed responses.
- Added the endpoint syntax check to the project check lifecycle.

## Safety boundaries

- No D1 read or write.
- No order mutation.
- No network request or external provider.
- No production deployment.
- Manager-entered HTML is escaped by the existing renderer.
- Budget and calculator estimates remain reference-only.

## Verification

- Focused proposal tests: 18 passed.
- Full project tests: 449 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed with line-ending warnings only.

## Next

Proposal Slice 4 adds the manager form and uses this endpoint for preview,
downloadable HTML, and browser Print to PDF.
