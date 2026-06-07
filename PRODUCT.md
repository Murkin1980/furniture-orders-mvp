# PRODUCT.md

## Product

Furniture Orders MVP is the main product for building a practical platform for furniture makers.

The goal is not to create a broad generic SaaS too early. The goal is to build a working operating system for furniture businesses: landing pages, lead intake, order management, calculators, portfolio, publishing, and later AI assistance.

## Primary user

Small and medium furniture makers who need:

- a landing page or mini-site;
- WhatsApp-oriented lead capture;
- order intake and order statuses;
- simple admin panel;
- furniture calculators;
- portfolio/gallery of works;
- later AI help for qualification, replies, offers and dimensions.

## Current core modules

- Orders intake
- Admin order list
- Order statuses and notes
- Project steps
- Furniture calculators
- Calculator embed widget
- Calculator pricing/rules
- Landing sites module
- Generated HTML artifact
- VPS deploy control layer
- Portfolio/gallery module
- Telegram notification flow

## Live case studies

Live sites are documented in `LIVE_SITES.md`.

Important:

- `Murkin1980/bek-mebel` powers the live Bek Mebel site.
- `Murkin1980/tuba-kz` is a live Cloudflare case study.
- Do not treat live repositories as experiments.

## Donor repositories

These repositories are not the main product. They are sources of useful ideas:

- `Murkin1980/furniture-ai-agent` — donor for AI qualification and AI workflow.
- `Murkin1980/furniture-configurator` — donor for visual configurator ideas.
- `Murkin1980/grand-mebel` — donor for landing/calculator lead flow.
- `Murkin1980/grand-mebel-invoices` — donor for legacy invoice templates and UX.

## Separate internal ops product

`Murkin1980/grand-mebel-accounting-cloudflare` is a separate internal accounting/document module.

Do not merge it into the furniture platform until the main platform has stable usage and paying users.

## What we are NOT doing now

- Do not create new repositories for features that fit this project.
- Do not rebuild the whole system as a generic SaaS immediately.
- Do not copy whole donor repositories into this repo.
- Do not add a second CRM from `furniture-ai-agent`.
- Do not touch live production sites without a deployment check.
- Do not add large dependencies without justification.

## Near-term roadmap

1. Stabilize main platform docs and project memory.
2. Keep calculator work inside this repo.
3. Port AI layer in small pieces:
   - parse AI response;
   - qualification prompt;
   - provider abstraction;
   - manual analyze endpoint;
   - admin UI block.
4. Improve landing/site module using live case studies.
5. Improve portfolio/gallery module.
6. Add visual configurator ideas from `furniture-configurator` later.

## Source of truth

When Codex or another coding agent works on this project, this repository is the source of truth.

Read these files before changing code:

- `PRODUCT.md`
- `SESSION_NOTES.md`
- `LIVE_SITES.md`
- `CALCULATOR_DECISION.md`
- `AI_LAYER_DECISION.md`
- `OPS_AND_LEGACY_DECISION.md`
