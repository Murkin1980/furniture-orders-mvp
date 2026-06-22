import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  approveProposalVersion,
  createProposalDraft,
  getProposal,
  listOrderProposals,
  publishProposalVersion,
  saveProposalVersion
} from "../src/proposals/proposal-store.js";

test("creates version one and stores server-derived canonical content", async () => {
  const db = createDb();
  const result = await createProposalDraft({
    db,
    orderId: 1,
    payload: { customer: { name: "Мурат" }, items: [{ name: "Кухня", quantity: 2, unitPrice: 100000 }] }
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.item.currentVersion, 1);
  assert.equal(result.body.item.versions[0].totalAmount, 200000);
  assert.equal(result.body.item.versions[0].payload.customer.name, "Мурат");
  assert.match(result.body.item.versions[0].htmlSnapshot, /200(?:\s|&nbsp;)*000/);
});

test("second save creates a new version without mutating the first", async () => {
  const db = createDb();
  const created = await createProposalDraft({ db, orderId: 1, payload: proposal(100000) });
  const proposalId = created.body.item.id;
  db.versions[0].state = "published";
  const firstSnapshot = structuredClone(db.versions[0]);

  const saved = await saveProposalVersion({ db, proposalId, payload: proposal(150000), expectedCurrentVersion: 1 });

  assert.equal(saved.status, 201);
  assert.equal(saved.body.item.currentVersion, 2);
  assert.equal(saved.body.item.versions[0].versionNumber, 2);
  assert.deepEqual(db.versions[0], firstSnapshot);
});

test("rejects missing orders, invalid ids, archived proposals, and stale saves", async () => {
  assert.equal((await createProposalDraft({ db: createDb(), orderId: 99 })).status, 404);
  assert.equal((await getProposal({ db: createDb(), proposalId: "bad" })).status, 400);

  const db = createDb();
  const created = await createProposalDraft({ db, orderId: 1, payload: proposal(1) });
  const proposalId = created.body.item.id;
  db.proposals[0].status = "archived";
  assert.equal((await saveProposalVersion({ db, proposalId, payload: proposal(2) })).body.error, "proposal_archived");
  db.proposals[0].status = "draft";
  assert.equal((await saveProposalVersion({ db, proposalId, payload: proposal(2), expectedCurrentVersion: 0 })).status, 409);
});

test("order budget is never promoted into a proposal line price", async () => {
  const db = createDb();
  const result = await createProposalDraft({
    db,
    orderId: 1,
    payload: { budget: 900000, items: [{ name: "Кухня", quantity: 1, unitPrice: 0 }] }
  });
  assert.equal(result.body.item.versions[0].totalAmount, 0);
  assert.equal(result.body.item.versions[0].payload.items[0].unitPrice, 0);
});

test("lists proposals newest first and does not mutate payload", async () => {
  const db = createDb();
  const payload = proposal(120000);
  const before = structuredClone(payload);
  await createProposalDraft({ db, orderId: 1, payload });
  await createProposalDraft({ db, orderId: 1, payload });
  const result = await listOrderProposals({ db, orderId: 1 });

  assert.deepEqual(payload, before);
  assert.deepEqual(result.body.items.map((item) => item.id), [2, 1]);
});

test("migration defines version constraints, foreign keys, and indexes", async () => {
  const sql = await readFile(new URL("../migrations/0022_commercial_proposals.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS commercial_proposals/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS commercial_proposal_versions/);
  assert.match(sql, /UNIQUE \(proposal_id, version_number\)/);
  assert.match(sql, /FOREIGN KEY \(order_id\) REFERENCES orders\(id\)/);
  assert.match(sql, /CHECK \(state IN \('draft', 'published'\)\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_commercial_proposal_versions_proposal/);
  assert.equal(/\bBLOB\b/i.test(sql), false);
});

test("publishes current version and approves it once with order history", async () => {
  const db = createDb();
  const created = await createProposalDraft({ db, orderId: 1, payload: proposal(250000) });
  const proposalId = created.body.item.id;

  const published = await publishProposalVersion({ db, proposalId, versionNumber: 1 });
  assert.equal(published.body.item.status, "ready");
  assert.equal(published.body.item.versions[0].state, "published");

  const approved = await approveProposalVersion({ db, proposalId, versionNumber: 1, confirmed: true, approvedBy: "Мурат" });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.item.status, "approved");
  assert.equal(approved.body.item.approvedVersion, 1);
  assert.equal(db.interactions.length, 1);
  assert.match(db.interactions[0].summary, /версия 1/);

  await approveProposalVersion({ db, proposalId, versionNumber: 1, confirmed: true, approvedBy: "Мурат" });
  assert.equal(db.interactions.length, 1);
});

test("approval requires confirmation and a current published version", async () => {
  const db = createDb();
  const created = await createProposalDraft({ db, orderId: 1, payload: proposal(1) });
  const proposalId = created.body.item.id;

  assert.equal((await approveProposalVersion({ db, proposalId, versionNumber: 1 })).body.error, "approval_confirmation_required");
  assert.equal((await approveProposalVersion({ db, proposalId, versionNumber: 1, confirmed: true })).body.error, "proposal_not_published");
  assert.equal((await publishProposalVersion({ db, proposalId, versionNumber: 2 })).status, 409);
});

function proposal(unitPrice) {
  return { items: [{ name: "Кухня", quantity: 1, unitPrice }] };
}

function createDb() {
  const state = {
    orders: [{ id: 1 }],
    proposals: [],
    versions: [],
    interactions: [],
    prepare(sql) {
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async first() {
          if (sql.includes("FROM orders")) return state.orders.find((item) => item.id === Number(values[0])) || null;
          if (sql.includes("FROM commercial_proposals WHERE id")) {
            const item = state.proposals.find((proposal) => proposal.id === Number(values[0]));
            return item ? proposalRow(item) : null;
          }
          if (sql.includes("FROM commercial_proposal_versions WHERE proposal_id")) {
            const item = state.versions.find((version) => version.proposal_id === Number(values[0]) && version.version_number === Number(values[1]));
            return item ? versionRow(item) : null;
          }
          return null;
        },
        async all() {
          if (sql.includes("FROM commercial_proposal_versions")) {
            return { results: state.versions.filter((item) => item.proposal_id === Number(values[0])).sort((a, b) => b.version_number - a.version_number).map(versionRow) };
          }
          if (sql.includes("FROM commercial_proposals WHERE order_id")) {
            return { results: state.proposals.filter((item) => item.order_id === Number(values[0])).sort((a, b) => b.id - a.id).map(proposalRow) };
          }
          return { results: [] };
        },
        async run() { return run(sql, values); }
      };
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    }
  };

  function run(sql, values) {
    if (sql.includes("INSERT INTO commercial_proposals")) {
      const id = state.proposals.length + 1;
      state.proposals.push({ id, order_id: Number(values[0]), status: "draft", current_version: 0, approved_version: null, created_at: "2026-06-21", updated_at: "2026-06-21" });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO commercial_proposal_versions")) {
      state.versions.push({
        id: state.versions.length + 1, proposal_id: Number(values[0]), version_number: Number(values[1]), state: "draft",
        payload_json: values[2], html_snapshot: values[3], total_amount: values[4], created_by: values[5],
        created_at: "2026-06-21", published_at: null
      });
      return { meta: { last_row_id: state.versions.length, changes: 1 } };
    }
    if (/UPDATE commercial_proposals\s+SET/.test(sql)) {
      if (sql.includes("status = 'ready'") && !sql.includes("status = 'approved'")) {
        const item = state.proposals.find((proposal) => proposal.id === Number(values[0]) && proposal.current_version === Number(values[1]));
        if (!item) return { meta: { changes: 0 } };
        item.status = "ready";
        return { meta: { changes: 1 } };
      }
      if (sql.includes("status = 'approved'")) {
        const item = state.proposals.find((proposal) => proposal.id === Number(values[2]) && proposal.current_version === Number(values[3]) && proposal.status === "ready");
        if (!item) return { meta: { changes: 0 } };
        Object.assign(item, { status: "approved", approved_version: Number(values[0]), approved_by: values[1], approved_at: "2026-06-21" });
        return { meta: { changes: 1 } };
      }
      const item = state.proposals.find((proposal) => proposal.id === Number(values[1]) && proposal.current_version === Number(values[2]));
      if (!item) return { meta: { changes: 0 } };
      item.current_version = Number(values[0]);
      item.status = "draft";
      item.updated_at = "2026-06-21";
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE commercial_proposal_versions")) {
      const item = state.versions.find((version) => version.proposal_id === Number(values[0]) && version.version_number === Number(values[1]) && version.state === "draft");
      if (!item) return { meta: { changes: 0 } };
      item.state = "published";
      item.published_at = "2026-06-21";
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO order_interactions")) {
      state.interactions.push({ orderId: Number(values[0]), summary: values[1], createdBy: values[2] });
      return { meta: { changes: 1, last_row_id: state.interactions.length } };
    }
    return { meta: { changes: 0 } };
  }

  return state;
}

function proposalRow(item) {
  return {
    id: item.id, orderId: item.order_id, status: item.status, currentVersion: item.current_version,
    approvedVersion: item.approved_version, approvedBy: item.approved_by || null, approvedAt: item.approved_at || null,
    createdAt: item.created_at, updatedAt: item.updated_at
  };
}

function versionRow(item) {
  return {
    id: item.id, proposalId: item.proposal_id, versionNumber: item.version_number, state: item.state,
    payloadJson: item.payload_json, htmlSnapshot: item.html_snapshot, totalAmount: item.total_amount,
    createdBy: item.created_by, createdAt: item.created_at, publishedAt: item.published_at
  };
}
