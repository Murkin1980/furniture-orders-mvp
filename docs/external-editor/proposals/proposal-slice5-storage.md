# Proposal Slice 5: Versioned D1 Storage

## Goal

Persist proposal drafts and immutable document versions without changing the
current UI, order intake, deploy, or production database.

## Read first

- `docs/external-editor/proposals/README.md`
- `migrations/0015_order_interactions.sql`
- `src/proposals/commercial-proposal-template.js`
- `tests/proposal-preview-endpoint.test.js`
- one existing D1 core module and its tests to follow repository conventions

## Required implementation

Create:

- `migrations/0022_commercial_proposals.sql`
- `src/proposals/proposal-store.js`
- `tests/proposal-store.test.js`

The migration must create two related tables:

### `commercial_proposals`

Required concepts:

- internal `id`;
- required `order_id` foreign key;
- lifecycle status limited to `draft`, `ready`, `approved`, `sent`, `archived`;
- current version number;
- approved version number, nullable;
- created/updated timestamps.

### `commercial_proposal_versions`

Required concepts:

- internal `id`;
- required proposal foreign key;
- monotonically increasing version number unique within a proposal;
- version state limited to `draft` or `published`;
- normalized `payload_json`;
- server-rendered `html_snapshot`;
- numeric `total_amount` that is never inferred from order budget;
- creator and timestamps;
- published timestamp, nullable.

Choose exact SQL names in sympathy with existing migrations. Add indexes for
order lookup and proposal/version lookup. Do not add binary PDF data to D1.

## Core contract

Export small functions such as:

- `createProposalDraft({ db, orderId, payload, createdBy })`
- `saveProposalVersion({ db, proposalId, payload, createdBy })`
- `getProposal({ db, proposalId })`
- `listOrderProposals({ db, orderId })`

Exact names may follow local conventions, but the behavior must be explicit.

Rules:

- verify that the order exists;
- normalize payload with `normalizeCommercialProposal`;
- render snapshots server-side with `renderCommercialProposalHtml`;
- each successful save creates the next version transactionally if the local D1
  style supports it, or with a clearly tested safe sequence;
- never accept an HTML snapshot or total supplied by the browser as canonical;
- never mutate an existing `published` version;
- return 400/404/409-style core results instead of leaking SQL errors;
- do not mutate inputs.

## Tests

Cover at minimum:

- missing order returns 404-style result;
- first draft creates proposal version 1;
- second save creates version 2;
- normalized payload, server HTML, and calculated total are stored;
- order budget cannot become line price;
- versions are listed newest first;
- published version cannot be overwritten;
- invalid proposal ID/order ID fails safely;
- input is not mutated;
- migration contains both tables, constraints, foreign keys, and indexes.

## Do not do

- no endpoint;
- no admin changes;
- no production migration;
- no deploy;
- no approval or sent logic beyond schema-enforced status vocabulary;
- no external storage, email, WhatsApp, or PDF library.

## Completion output

Report changed files, schema decisions, test results, and exact next step. Create
`docs/sessions/furniture-proposal-slice5-summary.md` and update all required
project/progress documents.
