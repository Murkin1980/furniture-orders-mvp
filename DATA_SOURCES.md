# DATA_SOURCES.md

## Source policy

Every price, legal term, company fact, material specification, client detail, and production constraint must have a traceable source. Unknown values stay marked as unknown.

Only sources with status `approved` may be promoted into `knowledge/` or used as trusted agent material.

## Source status system

| Status | Meaning | Allowed use |
|---|---|---|
| `raw` | Authorized source received but not converted or reviewed | Inventory only; never trusted agent context or app logic |
| `converted` | Markdown draft created from the raw source | Manual review only; still untrusted |
| `reviewed` | Converted content checked against the source | Awaiting explicit approval; not yet trusted agent material |
| `approved` | Reviewer explicitly approved content for agent use | May be promoted into `knowledge/` with source reference |
| `deprecated` | Source is replaced, expired, incorrect, or no longer authorized | Do not use; update dependent knowledge |

Normal progression:

```text
raw -> converted -> reviewed -> approved
                            \-> deprecated
```

Record each source with its current status, source date when known, conversion/review dates, and reviewer notes. Use the required checklist in `STAGE_2_KNOWLEDGE_CONVERSION_PLAN.md` for every converted document.

## Current project sources

| Source | Status | Purpose | Authority | Notes |
|---|---|---|---:|---|
| `PRODUCT.md` | `approved` | Product scope and boundaries | High | Main product definition |
| `README.md` | `approved` | Implemented behavior and local operations | High | Keep synchronized with code |
| `LIVE_SITES.md` | `approved` | Live repositories and deployment bindings | High | Check before production changes |
| `CALCULATOR_DECISION.md` | `approved` | Calculator architecture | High | Do not bypass formula contracts |
| `AI_LAYER_DECISION.md` | `approved` | AI architecture and rollout order | High | AI remains a layer of this product |
| `AI_INFRA_DECISION.md` | `approved` | AI infrastructure boundaries | High | Stage adoption and safety rules |
| `OPS_AND_LEGACY_DECISION.md` | `approved` | Repository boundaries | High | Donor projects are references |
| `SESSION_NOTES.md` | `reviewed` | Recent implementation history | Medium | Verify against code before relying on it |
| `Modular_Furniture_Platform_Architecture.pdf` | `raw` | Architecture reference | Medium | Legacy root location; MarkItDown returned empty output; requires OCR/manual review before conversion can progress |
| Local TUBA commercial proposal sample (2026-06-20) | `reviewed` | Visual structure reference for printable proposals | Medium | Source stays local; only layout patterns were used, with no logo, client data, prices, tax status, or terms copied into defaults |

## External tools verified on 2026-06-08

| Tool | Official repository | Intended use | Decision |
|---|---|---|---|
| MarkItDown | https://github.com/microsoft/markitdown | Convert office files and PDFs to Markdown | Install locally; use only on selected documents |
| CodeGraph | https://github.com/colbymchenry/codegraph | Local code relationship index for coding agents | Install/build locally; keep index ignored |
| Supermemory | https://github.com/supermemoryai/supermemory | Memory and retrieval layer | Defer until structured client memory is stable |
| Headroom | https://github.com/chopratejas/headroom | Context compression | Defer until token/cost measurements justify it |

## Documents awaiting intake

Store originals under `docs/raw/` and converted files under `docs/markdown/`.

The pipeline and mandatory review checklist are defined in `STAGE_2_KNOWLEDGE_CONVERSION_PLAN.md`.

Priority:

1. Commercial offer template.
2. Contract template.
3. Material price lists.
4. Payment conditions.
5. Measurement instructions.
6. Approved WhatsApp scripts.

## Privacy

- Do not commit secrets, API keys, client phone numbers, addresses, photos, or raw conversations.
- Remove or anonymize personal data before adding a document to the knowledge base.
- Do not publish local indexes or temporary conversion artifacts.
