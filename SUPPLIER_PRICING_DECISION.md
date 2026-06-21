# Supplier Catalog and Pricing Decision

## Decision

Add Supplier Catalog and Pricing as a separate workstream for controlled
supplier-price synchronization. Prefer official API, XLSX/CSV/XML feeds, or
supplier exports. Scraping is a fallback only when permitted and operationally
stable.

External changes create a draft import. They never silently rewrite published
prices, active estimates, or historical orders.

## Target workflow

1. Register supplier, source type, currency, tax, delivery, and update policy.
2. Import supplier records into a staging batch.
3. Map supplier SKU to the platform material, hardware, facade, or service.
4. Normalize units and calculate landed cost.
5. Flag missing mappings, large changes, and unavailable products.
6. Let a manager approve or reject changes.
7. Publish a new immutable price-list version.
8. Recalculate only drafts that explicitly opt into the new version.

## Planned slices

1. Supplier/source/catalog schemas and pure normalization helpers.
2. Product mapping and unit/currency/tax contracts.
3. File import for reviewed XLSX/CSV/XML price lists.
4. Provider-neutral request builder and injected online adapters.
5. Staging batches, diffs, anomaly thresholds, and audit history.
6. Manager review and controlled publication.
7. Versioned calculator/estimate integration.
8. Scheduled synchronization, alerts, recovery, and production pilot.

## Safety rules

- Credentials live only in environment configuration.
- Respect supplier terms, robots rules, rate limits, and source ownership.
- Use bounded schedules, backoff, and no tight retry loops.
- Preserve raw source evidence and the normalized published version.
- Existing orders remain pinned to the price-list version used at approval.
- Automatic publication is disabled by default.
