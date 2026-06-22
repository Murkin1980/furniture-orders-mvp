import {
  normalizeCommercialProposal,
  renderCommercialProposalHtml
} from "./commercial-proposal-template.js";

export async function createProposalDraft({ db, orderId, payload = {}, createdBy = "manager" }) {
  const id = positiveInteger(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");

  const order = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (!order) return errorResult(404, "order_not_found", "Order was not found.");

  try {
    const insert = await db.prepare(
      `INSERT INTO commercial_proposals (order_id, status, current_version)
       VALUES (?, 'draft', 0)`
    ).bind(id).run();
    const proposalId = insert?.meta?.last_row_id;
    if (!positiveInteger(proposalId)) throw new Error("Proposal insert did not return an id.");
    return saveProposalVersion({ db, proposalId, payload, createdBy, expectedCurrentVersion: 0 });
  } catch (error) {
    return storageFailure(error);
  }
}

export async function saveProposalVersion({
  db,
  proposalId,
  payload = {},
  createdBy = "manager",
  expectedCurrentVersion
}) {
  const id = positiveInteger(proposalId);
  if (!id) return errorResult(400, "invalid_proposal_id", "proposalId must be a positive integer.");

  const proposal = await db.prepare(
    `SELECT id, order_id AS orderId, status, current_version AS currentVersion,
            approved_version AS approvedVersion, created_at AS createdAt, updated_at AS updatedAt
     FROM commercial_proposals WHERE id = ?`
  ).bind(id).first();
  if (!proposal) return errorResult(404, "proposal_not_found", "Commercial proposal was not found.");
  if (proposal.status === "archived") {
    return errorResult(409, "proposal_archived", "Archived proposal cannot receive new versions.");
  }

  const currentVersion = Number(proposal.currentVersion) || 0;
  if (expectedCurrentVersion !== undefined && Number(expectedCurrentVersion) !== currentVersion) {
    return errorResult(409, "proposal_version_conflict", "Proposal has a newer version. Reload before saving.");
  }

  const normalized = normalizeCommercialProposal(payload);
  const canonicalPayload = JSON.stringify(normalized);
  const htmlSnapshot = renderCommercialProposalHtml(normalized);
  const nextVersion = currentVersion + 1;
  const actor = clean(createdBy) || "manager";

  try {
    const statements = [
      db.prepare(
        `INSERT INTO commercial_proposal_versions
          (proposal_id, version_number, state, payload_json, html_snapshot, total_amount, created_by)
         VALUES (?, ?, 'draft', ?, ?, ?, ?)`
      ).bind(id, nextVersion, canonicalPayload, htmlSnapshot, normalized.total, actor),
      db.prepare(
        `UPDATE commercial_proposals
         SET current_version = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND current_version = ?`
      ).bind(nextVersion, id, currentVersion)
    ];
    const results = typeof db.batch === "function"
      ? await db.batch(statements)
      : await runSequentially(statements);
    const updateChanges = Number(results?.[1]?.meta?.changes ?? 1);
    if (updateChanges !== 1) {
      return errorResult(409, "proposal_version_conflict", "Proposal has a newer version. Reload before saving.");
    }
  } catch (error) {
    return storageFailure(error);
  }

  return getProposal({ db, proposalId: id, status: 201 });
}

export async function getProposal({ db, proposalId, status = 200 }) {
  const id = positiveInteger(proposalId);
  if (!id) return errorResult(400, "invalid_proposal_id", "proposalId must be a positive integer.");

  const proposal = await db.prepare(
    `SELECT id, order_id AS orderId, status, current_version AS currentVersion,
            approved_version AS approvedVersion, approved_by AS approvedBy,
            approved_at AS approvedAt, created_at AS createdAt, updated_at AS updatedAt
     FROM commercial_proposals WHERE id = ?`
  ).bind(id).first();
  if (!proposal) return errorResult(404, "proposal_not_found", "Commercial proposal was not found.");

  const versionsResult = await db.prepare(
    `SELECT id, proposal_id AS proposalId, version_number AS versionNumber, state,
            payload_json AS payloadJson, html_snapshot AS htmlSnapshot,
            total_amount AS totalAmount, created_by AS createdBy,
            created_at AS createdAt, published_at AS publishedAt
     FROM commercial_proposal_versions
     WHERE proposal_id = ? ORDER BY version_number DESC`
  ).bind(id).all();
  const versions = (versionsResult?.results || []).map(normalizeVersionRow);

  return okResult({ item: { ...proposal, versions } }, status);
}

export async function listOrderProposals({ db, orderId }) {
  const id = positiveInteger(orderId);
  if (!id) return errorResult(400, "invalid_order_id", "orderId must be a positive integer.");

  const order = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (!order) return errorResult(404, "order_not_found", "Order was not found.");

  const result = await db.prepare(
    `SELECT id, order_id AS orderId, status, current_version AS currentVersion,
            approved_version AS approvedVersion, approved_by AS approvedBy,
            approved_at AS approvedAt, created_at AS createdAt, updated_at AS updatedAt
     FROM commercial_proposals WHERE order_id = ? ORDER BY updated_at DESC, id DESC`
  ).bind(id).all();
  return okResult({ items: result?.results || [] });
}

export async function publishProposalVersion({ db, proposalId, versionNumber }) {
  const id = positiveInteger(proposalId);
  const version = positiveInteger(versionNumber);
  if (!id || !version) return errorResult(400, "invalid_proposal_version", "Proposal and version IDs must be positive integers.");

  const proposal = await findProposal(db, id);
  if (!proposal) return errorResult(404, "proposal_not_found", "Commercial proposal was not found.");
  if (Number(proposal.currentVersion) !== version) {
    return errorResult(409, "proposal_version_conflict", "Only the current proposal version can be published.");
  }
  const item = await findVersion(db, id, version);
  if (!item) return errorResult(404, "proposal_version_not_found", "Proposal version was not found.");
  if (item.state === "published") return getProposal({ db, proposalId: id });

  try {
    const results = await executeStatements(db, [
      db.prepare(
        `UPDATE commercial_proposal_versions SET state = 'published', published_at = CURRENT_TIMESTAMP
         WHERE proposal_id = ? AND version_number = ? AND state = 'draft'`
      ).bind(id, version),
      db.prepare(
        `UPDATE commercial_proposals SET status = 'ready', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND current_version = ?`
      ).bind(id, version)
    ]);
    if (Number(results?.[0]?.meta?.changes ?? 0) !== 1 || Number(results?.[1]?.meta?.changes ?? 0) !== 1) {
      return errorResult(409, "proposal_version_conflict", "Proposal version changed before publish completed.");
    }
    return getProposal({ db, proposalId: id });
  } catch (error) {
    return storageFailure(error);
  }
}

export async function approveProposalVersion({ db, proposalId, versionNumber, confirmed, approvedBy = "manager" }) {
  const id = positiveInteger(proposalId);
  const version = positiveInteger(versionNumber);
  if (!confirmed) return errorResult(400, "approval_confirmation_required", "Explicit approval confirmation is required.");
  if (!id || !version) return errorResult(400, "invalid_proposal_version", "Proposal and version IDs must be positive integers.");

  const proposal = await findProposal(db, id);
  if (!proposal) return errorResult(404, "proposal_not_found", "Commercial proposal was not found.");
  if (proposal.status === "approved" && Number(proposal.approvedVersion) === version) {
    return getProposal({ db, proposalId: id });
  }
  if (Number(proposal.currentVersion) !== version) {
    return errorResult(409, "proposal_version_conflict", "Only the current published version can be approved.");
  }
  const item = await findVersion(db, id, version);
  if (!item || item.state !== "published") {
    return errorResult(409, "proposal_not_published", "Publish this proposal version before approval.");
  }
  const actor = clean(approvedBy) || "manager";
  const summary = `Коммерческое предложение #${id}, версия ${version}, утверждено менеджером.`;

  try {
    const results = await executeStatements(db, [
      db.prepare(
        `UPDATE commercial_proposals
         SET status = 'approved', approved_version = ?, approved_by = ?,
             approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND current_version = ? AND status = 'ready'`
      ).bind(version, actor, id, version),
      db.prepare(
        `INSERT INTO order_interactions (order_id, type, summary, created_by)
         VALUES (?, 'note', ?, ?)`
      ).bind(proposal.orderId, summary, actor)
    ]);
    if (Number(results?.[0]?.meta?.changes ?? 0) !== 1) {
      return errorResult(409, "proposal_approval_conflict", "Proposal approval state changed. Reload and review it.");
    }
    return getProposal({ db, proposalId: id });
  } catch (error) {
    return storageFailure(error);
  }
}

async function findProposal(db, id) {
  return db.prepare(
    `SELECT id, order_id AS orderId, status, current_version AS currentVersion,
            approved_version AS approvedVersion, approved_by AS approvedBy,
            approved_at AS approvedAt, created_at AS createdAt, updated_at AS updatedAt
     FROM commercial_proposals WHERE id = ?`
  ).bind(id).first();
}

async function findVersion(db, proposalId, versionNumber) {
  return db.prepare(
    `SELECT id, proposal_id AS proposalId, version_number AS versionNumber, state,
            payload_json AS payloadJson, html_snapshot AS htmlSnapshot,
            total_amount AS totalAmount, created_by AS createdBy,
            created_at AS createdAt, published_at AS publishedAt
     FROM commercial_proposal_versions WHERE proposal_id = ? AND version_number = ?`
  ).bind(proposalId, versionNumber).first();
}

async function executeStatements(db, statements) {
  return typeof db.batch === "function" ? db.batch(statements) : runSequentially(statements);
}

function normalizeVersionRow(row) {
  let payload = {};
  try { payload = JSON.parse(row.payloadJson); } catch { payload = {}; }
  return { ...row, payload };
}

async function runSequentially(statements) {
  const results = [];
  for (const statement of statements) results.push(await statement.run());
  return results;
}

function storageFailure(error) {
  if (/unique|constraint/i.test(String(error?.message || error))) {
    return errorResult(409, "proposal_version_conflict", "Proposal version could not be saved because it is stale.");
  }
  return errorResult(500, "proposal_storage_failed", "Commercial proposal could not be stored.");
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function okResult(body, status = 200) {
  return { ok: true, status, body: { success: true, ...body } };
}

function errorResult(status, error, message) {
  return { ok: false, status, body: { success: false, error, message } };
}
