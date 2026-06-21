# Commercial Proposal Template

## Decision

The first commercial-proposal slice is a pure, printable HTML generator. It
adapts the strict one-page structure of the reviewed TUBA sample without
copying its logo, client data, prices, tax status, or commercial terms.

## Files

- `src/proposals/commercial-proposal-template.js` - normalization, totals, HTML
  escaping, and A4 rendering.
- `src/proposals/order-proposal-mapper.js` - safe order-to-draft mapping that
  never promotes a budget or calculator estimate to an approved price.
- `examples/commercial-proposal.json` - synthetic input example.
- `scripts/generate-commercial-proposal.mjs` - JSON-to-HTML CLI.
- `tests/commercial-proposal-template.test.js` - calculation and safety tests.

## Data contract

The template accepts:

- company name, address, phone, email, and optional HTTPS/data-image logo;
- proposal number, date, and title;
- customer name, contact, and project;
- item name, specification, unit, quantity, and unit price;
- explicit total label and optional total override;
- production, installation, warranty, note, and director name.

Unknown legal, tax, price, warranty, and schedule values are never inferred.
The company must provide and approve them for each proposal.

## Generate a preview

```powershell
npm.cmd run proposal:demo
```

Custom input and output:

```powershell
node scripts/generate-commercial-proposal.mjs input.json output.html
```

Open the generated HTML in a browser and use Print to PDF with A4 paper,
default scale, background graphics enabled, and browser headers/footers off.

## Future slices

1. Add a protected HTML preview endpoint.
2. Add a manager form for pricing and terms.
3. Save proposal drafts and immutable published versions.
4. Attach an approved proposal to the order interaction history.
