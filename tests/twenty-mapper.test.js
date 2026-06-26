import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTwentyNotePayload,
  buildTwentyOpportunityPayload,
  buildTwentyPersonPayload,
  buildTwentySyncPayload
} from "../src/crm/twenty-mapper.js";

test("builds person payload with name phone and email", () => {
  const person = buildTwentyPersonPayload({
    clientName: "Erlan Erlanovich",
    phone: "+77011234567",
    email: "erlan@example.com"
  });

  assert.equal(person.name.firstName, "Erlan");
  assert.equal(person.name.lastName, "Erlanovich");
  assert.equal(person.phones.primaryPhoneNumber, "7011234567");
  assert.equal(person.emails.primaryEmail, "erlan@example.com");
});

test("omits missing email from person payload", () => {
  const payload = buildTwentyPersonPayload({ name: "Erlan", phone: "+77011234567" });

  assert.deepEqual(payload.emails, {});
});

test("opportunity prefers AI furniture type in name", () => {
  const payload = buildTwentyOpportunityPayload({
    id: 12,
    ai_furniture_type: "wardrobe",
    furnitureType: "kitchen"
  });

  assert.equal(payload.name, "Order #12 - wardrobe");
  assert.equal("furnitureType" in payload, false);
});

test("opportunity falls back to other furniture type in name", () => {
  const payload = buildTwentyOpportunityPayload({});
  assert.match(payload.name, /other/);
});

test("opportunity includes budget as amount", () => {
  const payload = buildTwentyOpportunityPayload({
    budget: 850000
  });

  assert.ok(payload.amount);
  assert.equal(payload.amount.amountMicros, 850000000000);
  assert.equal(payload.amount.currencyCode, "KZT");
});

test("note contains AI summary and next question", () => {
  const note = buildTwentyNotePayload({
    aiSummary: "Qualified kitchen lead.",
    ai_next_question: "When can we measure the room?"
  });

  assert.ok(note.title);
  assert.match(note.title, /AI summary/);
  assert.match(note.title, /Next question/);
});

test("note renders missing info in title", () => {
  const note = buildTwentyNotePayload({
    ai_missing_info_json: JSON.stringify(["Room dimensions", "Preferred material"])
  });

  assert.ok(note.title);
  assert.match(note.title, /Room dimensions/);
});

test("reads raw payload without crashing", () => {
  const payload = buildTwentyOpportunityPayload({
    raw_payload: JSON.stringify({ calculatorMeta: { calculatorId: 4 } })
  });

  assert.ok(payload.name);
  assert.equal("furnitureType" in payload, false);
});

test("invalid raw payload does not break mapper", () => {
  assert.doesNotThrow(() => buildTwentyOpportunityPayload({ rawPayload: "{invalid" }));
  assert.equal("calculatorMeta" in buildTwentyOpportunityPayload({ rawPayload: "{invalid" }), false);
});

test("buildTwentySyncPayload returns person opportunity note and meta", () => {
  const payload = buildTwentySyncPayload({
    order_id: 7,
    name: "Aida",
    source: "calculator",
    ai_status: "success",
    ai_score: 82
  });

  assert.deepEqual(Object.keys(payload), ["person", "opportunity", "note", "meta"]);
  assert.deepEqual(payload.meta, {
    orderId: 7,
    source: "calculator",
    hasAiResult: true,
    mapperVersion: 1
  });
});

test("does not mutate input order", () => {
  const order = {
    id: 3,
    raw_payload: {
      calculatorMeta: {
        calculatorId: 2
      }
    }
  };
  const before = structuredClone(order);

  buildTwentySyncPayload(order);

  assert.deepEqual(order, before);
});

test("payload does not contain undefined values", () => {
  const payload = buildTwentySyncPayload({
    id: 5,
    raw_payload: {
      calculatorMeta: {
        calculatorId: 1,
        estimate: undefined
      }
    }
  });

  assert.equal(containsUndefined(payload), false);
});

test("empty input is handled safely", () => {
  assert.doesNotThrow(() => buildTwentySyncPayload());
  const payload = buildTwentySyncPayload();
  assert.ok(payload.opportunity.name);
  assert.equal("furnitureType" in payload.opportunity, false);
});

function containsUndefined(value) {
  if (Array.isArray(value)) {
    return value.some(containsUndefined);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => item === undefined || containsUndefined(item));
  }

  return false;
}
