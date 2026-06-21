# AdminLTE-inspired Shell and Golos Text

## Result

The platform keeps its existing lightweight implementation while adopting the
selected AdminLTE visual structure for admin and CRM: graphite navigation,
white topbar and work panels, cool-gray background, restrained blue actions,
compact borders, and low-contrast elevation. Golos Text is shared by public
intake, admin, and CRM.

## Boundaries

- No AdminLTE or Bootstrap dependency was added.
- Existing IDs, APIs, data flows, and JavaScript behavior were preserved.
- Public intake retains its furniture-specific warm palette.
- Technical OCR/JSON fields remain monospace.
- The font has system fallbacks and `font-display: swap`.

## Verification

- Desktop admin: 1440 x 1000.
- Desktop CRM: 1440 x 1000.
- Mobile admin: 390 x 844.
- Google Fonts CSS/WOFF2: HTTP 200.
- Local browser console errors: none.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 431 tests.
- Production verification is recorded in `SESSION_NOTES.md` after deploy.
