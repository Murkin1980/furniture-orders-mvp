const baseUrl = clean(process.env.PROPOSAL_SMOKE_BASE_URL);
const token = clean(process.env.PROPOSAL_SMOKE_ADMIN_TOKEN);
const configuredOrderId = clean(process.env.PROPOSAL_SMOKE_ORDER_ID);

if (!baseUrl || !token) {
  console.error("Required env: PROPOSAL_SMOKE_BASE_URL, PROPOSAL_SMOKE_ADMIN_TOKEN.");
  process.exit(2);
}

const orderId = configuredOrderId || await createSyntheticOrder();
const first = await createProposal(orderId);
const second = await saveNextVersion(first.item);
const published = await publishProposal(second.item);
const approved = await approveProposal(published.item);
const history = await listHistory(orderId);

const approvedVersion = Number(approved.item?.approvedVersion);
const currentVersion = Number(approved.item?.currentVersion);
const historyMatch = history.items?.some((item) =>
  String(item.summary || "").includes(`РљРѕРјРјРµСЂС‡РµСЃРєРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ #${approved.item.id}`)
);

if (approved.item?.status !== "approved" || approvedVersion !== 2 || currentVersion !== 2 || !historyMatch) {
  throw new Error("Proposal lifecycle smoke failed final state verification.");
}

console.log(JSON.stringify({
  ok: true,
  orderId,
  proposalId: approved.item.id,
  status: approved.item.status,
  currentVersion,
  approvedVersion,
  historyMatch
}, null, 2));

async function createSyntheticOrder() {
  const stamp = Date.now();
  const response = await requestJson("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `Proposal Smoke ${stamp}`,
      phone: `+7701${String(stamp).slice(-7)}`,
      city: "Almaty",
      furnitureType: "wardrobe",
      budget: 450000,
      description: "Synthetic order for commercial proposal production smoke.",
      source: "proposal-smoke"
    })
  });
  if (!response.orderId) throw new Error("Synthetic order was not created.");
  return response.orderId;
}

async function createProposal(orderId) {
  return requestJson("/api/proposals", {
    method: "POST",
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      orderId,
      createdBy: "production-smoke",
      proposal: buildProposalPayload("v1", 180000)
    })
  });
}

async function saveNextVersion(item) {
  return requestJson("/api/proposals", {
    method: "POST",
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      proposalId: item.id,
      expectedCurrentVersion: item.currentVersion,
      createdBy: "production-smoke",
      proposal: buildProposalPayload("v2", 190000)
    })
  });
}

async function publishProposal(item) {
  return requestJson(`/api/proposals/${item.id}/publish`, {
    method: "POST",
    headers: adminJsonHeaders(),
    body: JSON.stringify({ versionNumber: item.currentVersion })
  });
}

async function approveProposal(item) {
  return requestJson(`/api/proposals/${item.id}/approve`, {
    method: "POST",
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      versionNumber: item.currentVersion,
      confirmed: true,
      approvedBy: "production-smoke"
    })
  });
}

async function listHistory(orderId) {
  return requestJson(`/api/order-interactions?orderId=${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: { "x-admin-token": token }
  });
}

function buildProposalPayload(label, unitPrice) {
  return {
    proposalNumber: `SMOKE-${label}-${Date.now()}`,
    date: "23.06.2026",
    company: {
      name: "Salamat Mebel",
      address: "Synthetic production smoke",
      phone: "+7 700 000 00 00",
      email: "smoke@example.test"
    },
    customer: {
      name: "Synthetic Proposal Customer",
      contact: "+7 701 000 00 00",
      project: "Synthetic wardrobe proposal smoke"
    },
    items: [
      {
        name: "Synthetic wardrobe",
        specification: `Production lifecycle smoke ${label}`,
        unit: "set",
        quantity: 1,
        unitPrice
      }
    ],
    terms: {
      productionDays: 20,
      installationDays: 2,
      warrantyMonths: 12,
      note: "Synthetic smoke only. Not a customer proposal."
    },
    directorName: "Production Smoke"
  };
}

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl.replace(/\/+$/g, "")}${path}`, init);
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(`${path} failed: ${response.status} ${json.error || json.message || "unknown_error"}`);
  }
  return json;
}

function adminJsonHeaders() {
  return {
    "content-type": "application/json",
    "x-admin-token": token
  };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
