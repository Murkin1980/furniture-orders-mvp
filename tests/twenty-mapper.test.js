import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTwentyNotePayload,
  buildTwentyOpportunityPayload,
  buildTwentyPersonPayload,
  buildTwentySyncPayload
} from "../src/crm/twenty-mapper.js";

test("builds person payload with name phone and email", () => {
  assert.deepEqual(buildTwentyPersonPayload({
    clientName: "Erlan",
    phone: "+77011234567",
    email: "erlan@example.com"
  }), {
    name: "Erlan",
    phone: "+77011234567",
    email: "erlan@example.com"
  });
});

test("omits missing email from person payload", () => {
  const payload = buildTwentyPersonPayload({ name: "Erlan", phone: "+77011234567" });

  assert.equal("email" in payload, false);
});

test("opportunity prefers AI furniture type", () => {
  const payload = buildTwentyOpportunityPayload({
    id: 12,
    ai_furniture_type: "wardrobe",
    furnitureType: "kitchen"
  });

  assert.equal(payload.furnitureType, "wardrobe");
  assert.equal(payload.name, "Order #12 - wardrobe");
});

test("opportunity falls back to other furniture type", () => {
  assert.equal(buildTwentyOpportunityPayload({}).furnitureType, "other");
});

test("opportunity includes budget and budget range", () => {
  const payload = buildTwentyOpportunityPayload({
    budget: 850000,
    budget_range: "800000-1000000"
  });

  assert.equal(payload.budget, 850000);
  assert.equal(payload.budgetRange, "800000-1000000");
});

test("note contains AI summary and next question", () => {
  const note = buildTwentyNotePayload({
    aiSummary: "Qualified kitchen lead.",
    ai_next_question: "When can we measure the room?"
  });

  assert.match(note.body, /AI summary: Qualified kitchen lead\./);
  assert.match(note.body, /Next question: When can we measure the room\?/);
});

test("note renders missing info JSON array as a readable list", () => {
  const note = buildTwentyNotePayload({
    ai_missing_info_json: JSON.stringify(["Room dimensions", "Preferred material"])
  });

  assert.match(note.body, /Missing info:\n- Room dimensions\n- Preferred material/);
});

test("reads calculatorMeta from raw payload JSON string", () => {
  const payload = buildTwentyOpportunityPayload({
    raw_payload: JSON.stringify({
      calculatorMeta: {
        calculatorId: 4,
        estimate: 950000
      }
    })
  });

  assert.deepEqual(payload.calculatorMeta, {
    calculatorId: 4,
    estimate: 950000
  });
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
  assert.equal(buildTwentySyncPayload().opportunity.furnitureType, "other");
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
