import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminProposalDraft, buildProposalPayload, getProposalLifecycleView } from "../public/admin-proposals.js";

test("builds an editable proposal draft from an admin order", () => {
  const draft = buildAdminProposalDraft({
    id: 12,
    clientName: "Мурат",
    phone: "+77000000000",
    furnitureType: "kitchen",
    city: "Алматы",
    budget: 900000,
    description: "Угловая кухня"
  }, { date: "21.06.2026" });

  assert.equal(draft.proposalNumber, "КП-0012");
  assert.equal(draft.customerName, "Мурат");
  assert.equal(draft.item.name, "Кухня");
  assert.equal(draft.item.unitPrice, 0);
  assert.equal(draft.referenceBudget, 900000);
});

test("AI furniture type has priority and raw payload is safe", () => {
  const draft = buildAdminProposalDraft({
    aiFurnitureType: "wardrobe",
    furnitureType: "kitchen",
    rawPayload: JSON.stringify({ district: "Бостандыкский", address: "ул. Абая" })
  }, { date: "21.06.2026" });

  assert.equal(draft.item.name, "Гардеробная");
  assert.equal(draft.customerProject, "Бостандыкский, ул. Абая");
  assert.doesNotThrow(() => buildAdminProposalDraft({ rawPayload: "{bad" }));
});

test("builds preview payload with explicit manager pricing", () => {
  const payload = buildProposalPayload({
    proposalNumber: "КП-0012",
    companyName: "Salamat Mebel",
    customerName: "Мурат",
    productionDays: "25"
  }, [{ name: "Кухня", quantity: "2", unitPrice: "150000" }]);

  assert.equal(payload.company.name, "Salamat Mebel");
  assert.equal(payload.items[0].quantity, 2);
  assert.equal(payload.items[0].unitPrice, 150000);
  assert.equal(payload.terms.productionDays, "25");
});

test("proposal helpers do not mutate inputs and remove undefined values", () => {
  const values = { customerName: "Клиент" };
  const items = [{ name: "Шкаф", specification: undefined }];
  const before = structuredClone(items);
  const payload = buildProposalPayload(values, items);

  assert.deepEqual(items, before);
  assert.equal(JSON.stringify(payload).includes("undefined"), false);
  assert.equal(payload.items[0].specification, "");
});

test("lifecycle view distinguishes draft published and approved states", () => {
  const draft = getProposalLifecycleView({ id: 3, status: "draft", currentVersion: 2, versions: [{ versionNumber: 2, state: "draft" }] });
  assert.equal(draft.canPublish, true);
  assert.equal(draft.canApprove, false);

  const ready = getProposalLifecycleView({ id: 3, status: "ready", currentVersion: 2, versions: [{ versionNumber: 2, state: "published" }] });
  assert.equal(ready.canPublish, false);
  assert.equal(ready.canApprove, true);

  const approved = getProposalLifecycleView({ id: 3, status: "approved", currentVersion: 2, approvedVersion: 2, versions: [{ versionNumber: 2, state: "published" }] });
  assert.equal(approved.canApprove, false);
  assert.equal(approved.approvedVersion, 2);
});
