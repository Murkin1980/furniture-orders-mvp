# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

## Role of this repository

`Murkin1980/furniture-orders-mvp` is the main product repository.

It is the source of truth for the furniture makers platform:

- order intake;
- admin panel;
- order statuses;
- project steps;
- furniture calculators;
- calculator embed widgets;
- landing sites;
- portfolio/gallery;
- publishing/deploy flow;
- Telegram notifications;
- future AI layer.

Do not treat this repository as a throwaway prototype.

## Read first

Before making changes, read these files:

```text
PRODUCT.md
SESSION_NOTES.md
LIVE_SITES.md
CALCULATOR_DECISION.md
AI_LAYER_DECISION.md
OPS_AND_LEGACY_DECISION.md
```

When the task touches UI/UX, also read or create/update:

```text
DESIGN.md
```

## Work style

Use the project workflow:

```text
shape -> craft -> polish
```

For an existing feature, first understand and preserve the current product identity. Do not redesign everything just because you can.

Avoid generic AI-looking interfaces. Prefer practical furniture-business workflows, clear cards, clear forms, readable tables, and direct WhatsApp-oriented actions.

## Repository boundaries

Work in this repository unless the task explicitly says otherwise.

Other repositories are references or separate products:

```text
Murkin1980/furniture-ai-agent              -> AI donor only
Murkin1980/furniture-configurator          -> visual configurator donor only
Murkin1980/grand-mebel-accounting-cloudflare -> separate internal ops product
Murkin1980/grand-mebel                     -> legacy landing/calculator reference
Murkin1980/grand-mebel-invoices            -> legacy invoice reference
Murkin1980/mebel-kalkulator                -> legacy calculator reference
Murkin1980/mebel-kalkulator2               -> legacy calculator reference
Murkin1980/bek-mebel                       -> live client site repository
Murkin1980/tuba-kz                         -> live Cloudflare case study
Murkin1980/salamat-mebel-kz                -> live/site case study
```

Use donor repositories for ideas only. Do not copy whole applications into this repo.

## Live sites

`LIVE_SITES.md` contains live site bindings.

Important rule: live site repositories are production references, not experiments. Check the deployment context before changing anything related to them.

## Calculator rule

The primary calculator implementation lives in this repository.

Future calculator work should happen here:

```text
src/calculators*
functions/api/calculators*
tests/*calculator*
```

`furniture-configurator` can donate visual ideas later, but it is not the primary calculator product.

## AI rule

AI is a layer on top of this platform, not a separate CRM.

Port AI in small pieces from `furniture-ai-agent`:

1. strict AI response parser;
2. qualification prompt;
3. provider abstraction;
4. manual analyze endpoint;
5. admin AI summary;
6. AI-enriched Telegram message.

Do not copy the separate Express server, SQLite CRM, auth system, full dashboard, or tenant system unless a later task explicitly asks for it.

## Internal ops rule

`grand-mebel-accounting-cloudflare` is a separate internal accounting/document product.

Do not merge it into this platform until there is a clear product reason.

## Coding rules

- Keep changes small and reviewable.
- Prefer pure functions and tests for business logic.
- Do not add dependencies without explaining why.
- Do not change deployment settings unless the task is specifically about deployment.
- Do not change public APIs without updating docs and tests.
- Keep Cloudflare/D1 constraints in mind.
- Use existing naming and folder conventions.
- Add or update tests for meaningful logic changes.

## Documentation rules

When you make meaningful changes, update `SESSION_NOTES.md`.

Use this format:

```md
## YYYY-MM-DD — Short task title

### What changed
- ...

### Files changed
- ...

### Checks
- ...

### Next
- ...
```

If a decision affects architecture, update the relevant decision file too:

```text
CALCULATOR_DECISION.md
AI_LAYER_DECISION.md
OPS_AND_LEGACY_DECISION.md
LIVE_SITES.md
PRODUCT.md
```

## First recommended implementation task

Start with the safest AI slice:

```text
src/ai/parse-ai-response.js
tests/ai-parse-response.test.js
```

This task should not call external AI APIs and should not change the UI.
