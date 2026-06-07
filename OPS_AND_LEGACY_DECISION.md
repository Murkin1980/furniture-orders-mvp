# Ops and legacy repositories decision

## Primary internal ops repo

```text
Murkin1980/grand-mebel-accounting-cloudflare
```

Decision: keep as the primary internal accounting/document module.

Why:

- Cloudflare-native architecture: Workers, Hono, D1, R2, Pages, React/Vite.
- Supports organizations, counterparties, products and invoices.
- Generates document packages.
- Includes XML ESF and NCALayer signing flow.

Do not merge into the furniture platform MVP yet. Keep it as a separate internal ops product until the platform has stable paying users.

## Legacy invoices repo

```text
Murkin1980/grand-mebel-invoices
```

Decision: keep as archive/source-of-truth for old invoice UX and templates.

Useful pieces to extract before archiving deeply:

- XLSX invoice template behavior
- stamp/signature insertion
- old Flask UI ideas
- ESF client/model references
- product and contractor management UX

Do not use as the active accounting app.

## Legacy landing/calculator repo

```text
Murkin1980/grand-mebel
```

Decision: keep as landing/calculator prototype and lead-flow reference.

Useful pieces to extract:

- two-step lead capture
- WhatsApp opening behavior even when webhook times out
- Google Sheets lead columns
- hot lead detection
- anti-spam checks
- UTM capture
- analytics event map
- launch checklist

Do not use as the primary calculator. Primary calculator remains in `furniture-orders-mvp`.

## Integration rule

- Client-facing platform work stays in `furniture-orders-mvp`.
- Internal accounting work stays in `grand-mebel-accounting-cloudflare`.
- Legacy repos are references, not active product lines.
