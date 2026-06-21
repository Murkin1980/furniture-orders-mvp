# External Editor Comparison Checklist

Score each item `0` (missing), `1` (partial), or `2` (complete).

| Area | Review question |
|---|---|
| Scope | Did the editor change only the requested slice? |
| Repository safety | Were donor/live repositories untouched? |
| Data integrity | Are published versions immutable and totals server-derived? |
| Pricing safety | Can budget/calculator estimates accidentally become prices? |
| Lifecycle semantics | Are draft, published, approved, and sent kept distinct? |
| Authorization | Are read/write scopes enforced through shared auth? |
| Failure behavior | Do 400/404/409/500 cases preserve orders and drafts? |
| Architecture | Is business logic in testable core modules, not endpoint/UI code? |
| Dependencies | Were no unnecessary packages added? |
| Tests | Are focused, full, syntax, and whitespace checks green? |
| UI workflow | Can a manager recover from errors without losing work? |
| Responsive UX | Is the form usable at desktop and 390 px without overflow? |
| Documentation | Are README, session notes, progress files, and reviewer summary current? |
| Reviewability | Is each slice a small, understandable commit? |
| Production safety | Was migration/deploy gated and smoke-tested with synthetic data? |

Maximum score: 30.

Automatic rejection conditions:

- real client data or API keys committed;
- production migration applied without approval;
- live-site repository changed;
- browser-provided HTML treated as canonical stored document;
- order budget silently converted to commercial price;
- published version modified in place;
- customer delivery added or triggered automatically;
- existing order intake broken.
