# Stage 2 Controlled Knowledge Conversion Plan

Date started: 2026-06-08

## Goal

Build a reviewed, traceable, reliable furniture-business knowledge base without changing production behavior.

## Scope

Stage 2 is documentation-only:

- define the controlled conversion and review process;
- inventory source documents in `DATA_SOURCES.md`;
- convert selected authorized raw sources into Markdown;
- manually review converted content;
- promote only approved facts into `knowledge/`.

Stage 2 does not add application logic, hosted memory, context compression, vector databases, automatic AI analysis, production migrations, or production AI workflows.

## Reviewed knowledge pipeline

```text
docs/raw/
-> docs/markdown/
-> manual review
-> knowledge/
```

### 1. Raw intake

- Place an authorized, privacy-reviewed source in `docs/raw/`.
- Record the source in `DATA_SOURCES.md` with status `raw`.
- Do not use `docs/raw/` directly in application logic or as trusted agent context.

### 2. Conversion

- Convert the selected source into `docs/markdown/`.
- Record the conversion date and set status to `converted`.
- MarkItDown output is an untrusted draft until manual review is complete.

### 3. Manual review

- Compare converted Markdown against the source document.
- Check encoding, Cyrillic, tables, numbers, dates, units, legal wording, and payment terms.
- Correct conversion errors without changing the source meaning.
- Set status to `reviewed` only after every required check is complete.

### 4. Approval and promotion

- A reviewer decides whether the reviewed content is safe for agent use.
- Set status to `approved` only when the reviewer explicitly approves it.
- Promote only the approved, relevant facts into the matching `knowledge/` file.
- Keep source references and avoid copying personal data or irrelevant document noise.

### 5. Deprecation

- Set status to `deprecated` when a source is replaced, expired, incorrect, or no longer authorized.
- Remove or update any promoted knowledge that relied on the deprecated source.

## Required document review checklist

Copy this checklist into the source entry notes or a dedicated review note for every converted document:

```md
## Document review

- Source file name:
- Source date if known:
- Conversion date:
- Encoding checked: yes/no
- Cyrillic checked: yes/no
- Tables checked: yes/no/not applicable
- Numbers checked: yes/no/not applicable
- Legal/payment terms checked: yes/no/not applicable
- Approved for agent use: yes/no
- Reviewer notes:
```

Approval is invalid if any applicable check remains incomplete.

## Initial knowledge categories

| Category | Target knowledge file | Typical approved sources |
|---|---|---|
| Company profile | `knowledge/company.md` | Company profile, verified contacts, legal/company facts |
| Services | `knowledge/services.md` | Approved service catalog and scope |
| Furniture categories | `knowledge/furniture_categories.md` | Approved product/category catalog |
| Materials | `knowledge/materials.md` | Supplier catalogs, material specifications, current price lists |
| Payment terms | `knowledge/payment.md` | Approved payment policy and contract terms |
| Measurement rules | `knowledge/measurement.md` | Approved measurement instructions and checklists |
| Sales scripts | `knowledge/whatsapp_scripts.md` | Approved WhatsApp and sales scripts |
| FAQ | `knowledge/faq.md` | Approved customer questions and answers |
| Objection handling | `knowledge/objection_handling.md` | Approved responses to common objections |
| Proposal/quotation rules | `knowledge/proposal_rules.md` | Approved quotation template and calculation rules |

Missing target files are created only when an approved source is ready for promotion. Empty or speculative knowledge files are not required.

## Source status workflow

```text
raw -> converted -> reviewed -> approved
                            \-> deprecated
raw / converted / reviewed -> deprecated
```

- Status changes must be recorded in `DATA_SOURCES.md`.
- `reviewed` does not mean approved for agent use.
- Only `approved` sources may be promoted into `knowledge/`.

## First conversion candidates

1. Authorized commercial offer template.
2. Authorized payment conditions.
3. Authorized measurement instructions.
4. Current material price list with date and currency.
5. Authorized WhatsApp sales scripts.
6. Authorized FAQ.

Do not begin conversion until an authorized source document is available and its privacy/commit decision is clear.

## Stage verification

- Confirm Stage 2 changes remain documentation-only.
- Confirm no files under production paths changed.
- Run `npm.cmd test`.
- Run `npm.cmd run check`.
- Run `git diff --check`.
