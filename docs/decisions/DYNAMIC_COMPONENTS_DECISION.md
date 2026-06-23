# Dynamic Furniture Components Decision

Date: 2026-06-20
Status: accepted for staged implementation

## Decision

The platform will use a versioned catalog of parametric furniture components.
A component definition is the shared contract for calculator pricing, order
configuration, and SketchUp visualization.

SketchUp `.skp` assets are visual resources, not the source of truth for price.
Pricing stays in the platform and uses allowlisted structured rule types. No
Ruby, Dynamic Component formula, or user-defined code is stored or executed as
a pricing rule.

## Component Definition

Each published component version has:

- stable `componentCode`, for example `cabinet.base.two-door`;
- immutable integer `componentVersion`;
- category and manager-facing label;
- allowlisted parameters with type, unit, minimum, maximum, default, and
  permitted options;
- structured pricing rules;
- visual asset metadata: versioned `.skp` storage key, preview key, anchors,
  and parameter-to-SketchUp attribute bindings;
- compatibility metadata for supported SketchUp/plugin contract versions.

Initial parameter types:

- `dimension_mm`;
- `number`;
- `select`;
- `boolean`;
- `material`.

Initial pricing rule types:

- fixed component price;
- price per item;
- price per linear meter;
- price per square meter;
- option surcharge;
- material multiplier from an allowlisted material catalog.

Arbitrary formulas and executable expressions are forbidden.

## Assembly Contract

An order configuration uses `furniture-assembly/v1`:

```text
assembly
-> component instances
-> componentCode + componentVersion
-> resolved parameter values
-> platform price breakdown
-> SketchUp placement/visualization data
```

Every component instance has a stable instance ID. The assembly pins published
component versions so an old quote/render cannot silently change after the
catalog is updated.

## Storage

- D1 stores draft/published component metadata, parameters, pricing rules, and
  version references.
- R2 stores immutable versioned `.skp` files and preview/render images.
- Orders store the resolved assembly snapshot and version IDs used for the
  calculation.
- The SketchUp node downloads or reads only the exact published asset version
  referenced by the signed job.

Suggested R2 layout:

```text
components/{componentCode}/v{componentVersion}/model.skp
components/{componentCode}/v{componentVersion}/preview.webp
assemblies/{orderId}/{jobId}/model.skp
assemblies/{orderId}/{jobId}/preview.png
assemblies/{orderId}/{jobId}/render.webp
```

## Calculator Integration

Calculator fields can select a component and provide parameter values. The
calculator resolves the published component version, validates every value,
and calculates a price breakdown using the platform rule engine.

Calculator output adds:

- `assemblyVersion`;
- component code/version pairs;
- resolved parameters;
- component and total price breakdown.

Existing `runtimeVersion`, `formulaVersion`, and `schemaVersion` remain intact.
The component catalog is additive and must not break existing calculator
embeds.

## SketchUp Integration

The file-queue bridge passes a validated assembly or command plan to the local
SketchUp plugin. The plugin may:

1. load the pinned `.skp` component asset;
2. create an instance at an allowlisted placement;
3. set only declared Dynamic Component attributes;
4. request a Dynamic Component redraw when available;
5. save the resulting assembly and preview/render outputs.

The plugin must never evaluate Ruby or formulas received from the platform.
Unknown component codes, versions, attributes, or parameter values fail closed.

## Growth Model

New furniture components are added through catalog records and versioned
assets, not new endpoint code. A new component normally requires:

1. author/test the `.skp` Dynamic Component offline;
2. define parameters and safe bindings;
3. define structured pricing rules;
4. upload asset and preview as a draft version;
5. run validation and test calculation/render;
6. publish the immutable version.

Changing geometry, attributes, or pricing creates a new version. Existing
orders keep their pinned version.

## Safety

- Manual publish first.
- Manual SketchUp execution first.
- No arbitrary formulas or code from D1/admin input.
- No unversioned overwrite of published assets.
- Failed component resolution must not break order intake.
- Failed SketchUp rendering must not change the accepted quote.
- Component asset and result hashes are recorded for audit.

## Implementation Slices

1. Pure component-definition validator and resolver with tests.
2. Pure structured component pricing engine with tests.
3. `furniture-assembly/v1` builder and price snapshot with tests.
4. Draft/published D1 catalog schema; migration remains unapplied initially.
5. R2 component asset upload and immutable version checks.
6. Calculator runtime integration as an additive schema layer.
7. SketchUp file-queue assembly contract.
8. Ruby plugin asset loading and safe Dynamic Component attribute binding.
9. Admin catalog editor, preview, validation, and publish flow.
10. Controlled production pilot with a small cabinet component library.
