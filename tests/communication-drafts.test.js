import test from "node:test";
import assert from "node:assert/strict";
import { createCommunicationDraft, listCommunicationDrafts, reviewCommunicationDraft } from "../src/communication-drafts.js";

test("creates, lists, edits, and approves a communication draft", async () => {
  const db = createDb();
  const created = await createCommunicationDraft({
    db, orderId: 1, channel: "whatsapp", content: "Initial reply", warnings: ["Check price"]
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.status, "draft");

  const reviewed = await reviewCommunicationDraft({
    db, draftId: created.body.item.id, content: "Approved reply", status: "approved"
  });
  assert.equal(reviewed.body.item.content, "Approved reply");
  assert.equal(reviewed.body.item.status, "approved");

  const listed = await listCommunicationDrafts({ db, orderId: 1 });
  assert.equal(listed.body.items.length, 1);
  assert.deepEqual(listed.body.items[0].warnings, ["Check price"]);
});

test("validates draft and review input", async () => {
  const db = createDb();
  assert.equal((await createCommunicationDraft({ db, orderId: 1, content: "" })).status, 400);
  assert.equal((await createCommunicationDraft({ db, orderId: 99, content: "x" })).status, 404);
  assert.equal((await reviewCommunicationDraft({ db, draftId: 99, content: "x", status: "approved" })).status, 404);
  assert.equal((await reviewCommunicationDraft({ db, draftId: 1, content: "x", status: "sent" })).status, 400);
});

function createDb() {
  const drafts = [];
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...input) { values = input; return this; },
        async first() {
          if (sql.includes("FROM orders")) return values[0] === 1 ? { id: 1 } : null;
          if (sql.includes("FROM communication_drafts WHERE id")) return drafts.find((item) => item.id === values[0]) || null;
          return null;
        },
        async all() { return { results: drafts.filter((item) => item.orderId === values[0]).reverse() }; },
        async run() {
          if (sql.includes("INSERT INTO communication_drafts")) {
            drafts.push({
              id: drafts.length + 1, orderId: values[0], channel: values[1], content: values[2],
              status: "draft", source: values[3], provider: values[4], model: values[5],
              warningsJson: values[6], createdBy: values[7], createdAt: "2026-06-13", updatedAt: "2026-06-13"
            });
            return { meta: { last_row_id: drafts.length } };
          }
          if (sql.includes("UPDATE communication_drafts")) {
            const item = drafts.find((draft) => draft.id === values[4]);
            Object.assign(item, { content: values[0], status: values[1], approvedBy: values[2], approvedAt: values[1] === "approved" ? "2026-06-13" : null });
          }
          return { success: true };
        }
      };
    }
  };
}
