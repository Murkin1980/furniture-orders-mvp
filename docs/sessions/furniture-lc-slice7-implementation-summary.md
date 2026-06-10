# LC Slice 7 implementation summary

Date: 2026-06-11

## Goal

Complete production verification of the landing calculator path:

```text
published calculator
-> production landing embed
-> calculator lead endpoint
-> order intake
-> versioned calculatorMeta in D1
```

## Completed

- Confirmed production initially had no calculators and the demo landing had
  `calculatorRequired: false`.
- Created and published production calculator `1`.
- Connected calculator `1` to production demo site `1`.
- Redeployed the generated landing artifact through the VPS control service.
- Confirmed `https://demo.salamat-mebel.kz` contains the calculator embed.
- Confirmed the public embed JavaScript includes schema-driven fields, the
  production lead endpoint, mobile media rules, and 44px mobile controls.
- Confirmed an unknown material rule is rejected safely.
- Submitted a valid production smoke lead and created order `5`.
- Verified production D1 stored source `calculator:1`, furniture type
  `kitchen`, estimate `615000`, and complete versioned `calculatorMeta`.

## Checks

- Public demo: HTTP 200.
- Public embed JavaScript: HTTP 200.
- VPS landing redeploy: succeeded.
- Successful calculator lead: order `5`, estimate `615000 KZT`.
- D1 metadata: `formulaVersion: 1`, `schemaVersion: 1`.
- `npm.cmd test`: 156 passed.
- `npm.cmd run check`: passed.
- `git diff --check`: passed before documentation updates.

## Limitations

- The in-app browser could not access the demo domain because of enterprise
  network policy. Responsive behavior was verified from the exact production
  embed JavaScript and existing automated tests instead of a visual browser
  interaction.
- The smoke order remains in production as an explicit verification record.

## Deployment

- No code change or Pages code deployment was required.
- Production data, site brief, and landing artifact were updated through the
  existing production API and VPS deployment path.

## Safety

- No secrets were printed or committed.
- No donor or unrelated live-site repositories were changed.
- Only the designated demo site and one smoke order were created or updated.
