# AI infrastructure decision

## Decision

Adopt the infrastructure in stages, starting with project memory, clean Markdown knowledge, reusable skills, and local code understanding.

## Stage 1 enabled

- Project-control documents: `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `SESSION_NOTES.md`, `DATA_SOURCES.md`.
- Curated Markdown knowledge under `knowledge/`.
- Reusable workflows under `skills/`.
- Local CodeGraph index, excluded from Git.
- Local MarkItDown environment, excluded from Git.

## Deferred

### Supermemory

Do not integrate yet. The current application already has D1-backed order and AI result fields, while the structured client-memory contract is not complete. Reassess after a stable schema, privacy rules, and retrieval tests exist.

### Headroom

Do not integrate yet. First measure prompt size, provider cost, latency, and failure rate. Never compress prices, dimensions, legal terms, payment details, or technical requirements without exact-value protection and tests.

## Safety rules

- External tools may not change production behavior implicitly.
- Local indexes and tool environments remain ignored.
- Source documents must be reviewed after conversion.
- No client data enters a hosted memory service without an explicit privacy decision.

## Review trigger

Revisit deferred tools when at least one is true:

- repeated long client conversations exceed the useful context window;
- prompt/token costs are measured and materially increasing;
- knowledge retrieval quality can be tested against a fixed evaluation set;
- the structured client-memory schema is implemented and approved.
