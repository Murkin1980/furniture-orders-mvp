# Project Progress Dashboard

Last reviewed: 2026-06-10
Current checkpoint: 2
Next checkpoint review: after 5 more completed slices

Current product focus: LC Slice 6 VPS/domain/SSL operational completion. Production D1 migration and Pages deploy are complete; CRM, new AI work, OCR, SketchUp MCP, and 3D rendering remain paused.

This is the canonical visual progress tracker for the complete furniture platform. Percentages are engineering estimates based on implemented, tested, deployed, and operationally verified behavior. A feature is not considered complete only because code exists.

## Product Readiness

| Target | Progress | Meaning |
|---|---:|---|
| Commercial platform | `[########--] 75%` | Landings, orders, calculators, portfolio, CRM, and stable operations |
| AI-assisted platform | `[####------] 40%` | AI qualification, communication assistance, OCR, and controlled agents |
| Complete vision | `[###-------] 30%` | Commercial platform plus vision, SketchUp MCP, and 3D render pipeline |

## Workstreams

| Workstream | Progress | Status | Next meaningful result |
|---|---:|---|---|
| Lead intake and order workflow | `[########--] 80%` | Working | Production hardening and deeper manager workflow |
| Calculators | `[#########-] 95%` | LC Slice 5 complete | Production embed smoke test with a real landing |
| Landing platform | `[#########-] 90%` | Production code deployed | VPS domain, SSL, and live publish smoke |
| Portfolio and media | `[######----] 60%` | Working | Complete production R2 operations |
| Production infrastructure | `[######----] 60%` | Pages/D1 ready, VPS blocked | VPS credentials, HTTPS control endpoint, live publish |
| Manual AI analysis | `[#######---] 70%` | Working locally | Explicit production enablement decision |
| Twenty CRM integration | `[##--------] 20%` | Paused | Resume after landing/calculator completion |
| AI agents and communications | `[#---------] 10%` | Planned | Tool permissions and human approval model |
| OCR and sketch recognition | `[----------] 0%` | Planned | Safe document/image intake prototype |
| SketchUp MCP | `[----------] 0%` | Planned | Windows node and controlled MCP prototype |
| 3D rendering pipeline | `[----------] 0%` | Planned | Render contract after SketchUp prototype |

## Dependency Map

```mermaid
flowchart LR
    A["Landings / calculators"] --> B["Orders source of truth"]
    B --> C["Twenty CRM manual sync"]
    B --> D["Manual AI analysis"]
    C --> E["Manager workflow"]
    D --> F["Controlled AI agents"]
    E --> F
    F --> G["OCR and sketch recognition"]
    G --> H["Structured design specification"]
    H --> I["SketchUp MCP"]
    I --> J["3D render pipeline"]
    K["Production infrastructure"] --> A
    K --> C
    K --> F
    K --> I
```

## Current Delivery Sequence

| Order | Stage group | Completion rule | State |
|---:|---|---|---|
| 1 | Landings and calculators completion | Paid landing order can move from brief to preview lead | Complete through LC Slice 5 |
| 2 | Landing production infrastructure | VPS/domain/SSL/deploy path verified for customer sites | LC Slice 6 partial: Pages/D1 complete, VPS access required |
| 3 | Twenty CRM Slices 3-7 | Manual order-to-CRM sync works from admin | Paused |
| 4 | Communication channels | Customer conversations are attached to order/contact history | Planned |
| 5 | Controlled AI agents | Agents can suggest or perform approved actions with audit history | Planned |
| 6 | OCR and vision | Text, measurements, and sketch details produce reviewed structured data | Planned |
| 7 | SketchUp MCP prototype | Structured order creates or updates a controlled SketchUp model | Planned |
| 8 | 3D render pipeline | Render output returns to the order and CRM workflow | Planned |
| 9 | Full production hardening | Security, recovery, observability, and end-to-end QA pass | Planned |

## Twenty CRM Detail

| Slice | Result | Status |
|---:|---|---|
| 1 | Integration decision | Complete |
| 2 | Pure order-to-Twenty mapper | Complete |
| 3 | Request builder without network calls | Next |
| 4 | Twenty sender with injected fetch | Planned |
| 5 | Manual sync core | Planned |
| 6 | Admin-protected sync endpoint | Planned |
| 7 | Admin sync control | Planned |
| 8 | Optional webhooks | Optional |
| 9 | MCP and AI agents | Optional after stable sync |

## Checkpoint Rules

- Update workstream status after every completed stage or slice.
- Recalculate progress percentages after every 5 completed slices.
- At every checkpoint, verify tests, production gaps, security risks, and the next delivery sequence.
- Mark a workstream as complete only when code, tests, documentation, and required operational verification are complete.
- Record major scope or dependency changes in the relevant decision document and `SESSION_NOTES.md`.

## Checkpoint History

| Checkpoint | Date | Completed since previous review | Main decision |
|---:|---|---|---|
| 1 | 2026-06-09 | Twenty CRM decision and pure mapper | Finish manual CRM sync before agent automation |
| Focus change | 2026-06-09 | Progress handoff created | Finish landings and calculators before resuming CRM |
| 2 | 2026-06-10 | LC Slices 1-5 | Structured landing editor and calculator flow are locally complete; move to production publishing |
| Ops pass | 2026-06-10 | LC Slice 6 Pages/D1 release | Production migrations and Pages deploy complete; VPS HTTPS/control service remains blocked by missing SSH credentials |
