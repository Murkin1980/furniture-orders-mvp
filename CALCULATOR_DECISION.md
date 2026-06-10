# Calculator decision

## Decision

Primary calculator source:

```text
Murkin1980/furniture-orders-mvp
```

The calculator inside the main platform is the current primary implementation.

## Why

- It is already integrated with the order intake flow.
- It has embeddable widget support.
- It stores calculator leads as normal orders.
- It has draft/published pricing and rules.
- It has schema-driven calculator fields.
- Its admin editor now manages the safe field schema, and the published embed honors active/required fields on desktop and mobile.
- It is part of the main platform architecture, not a separate one-off prototype.

## Keep as donor module

```text
Murkin1980/furniture-configurator
```

Use it as a donor for visual configurator features:

- 8-angle viewer
- URL serialization / deep links
- WhatsApp configuration summary
- product schema validation
- image naming convention
- visual price breakdown UX

Do not make it the main calculator repo.

## Archive candidates

```text
Murkin1980/mebel-kalkulator
Murkin1980/mebel-kalkulator2
Murkin1980/grand-mebel
```

These are older prototypes. Before deleting, check them for useful UX ideas, formulas, WhatsApp text patterns, and lead capture flows.

## Practical rule

All future calculator work should happen in:

```text
furniture-orders-mvp/src/calculators*
furniture-orders-mvp/functions/api/calculators*
furniture-orders-mvp/tests/*calculator*
```

Visual configurator ideas may be ported from `furniture-configurator` later, but the source of truth stays in `furniture-orders-mvp`.

## LC Slice 5 completion

- The existing safe field types, roles, bindings, and option sources remain hardcoded contracts.
- Admin users can edit labels, allowed types/roles/bindings, required flags, and active flags.
- Publish continues to copy draft prices, rules, and fields into the published runtime.
- The embed widget uses the published schema and remains free of arbitrary formulas or user-defined code.

## LC Slice 7 production verification

- Production calculator `1` is published and connected to
  `https://demo.salamat-mebel.kz`.
- The public embed script returns JavaScript with schema-driven fields, the
  lead endpoint, and mobile controls.
- A production smoke submission created order `5` with estimate `615000 KZT`.
- Production D1 preserved `calculatorMeta`, including calculator/category/rule,
  estimate, `formulaVersion: 1`, and `schemaVersion: 1`.
- Unknown material rule validation was confirmed before the successful smoke
  submission.
