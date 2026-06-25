import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHermesPayload } from "../src/agents/hermes-request-builder.js";

describe("buildHermesPayload", () => {
  it("returns null for nullish input", () => {
    assert.equal(buildHermesPayload(null), null);
    assert.equal(buildHermesPayload(undefined), null);
  });

  it("returns null for non-object input", () => {
    assert.equal(buildHermesPayload("invalid"), null);
    assert.equal(buildHermesPayload(123), null);
    assert.equal(buildHermesPayload([]), null);
  });

  it("returns null for missing or invalid id", () => {
    assert.equal(buildHermesPayload({}), null);
    assert.equal(buildHermesPayload({ id: 0 }), null);
    assert.equal(buildHermesPayload({ id: -1 }), null);
    assert.equal(buildHermesPayload({ id: "abc" }), null);
  });

  it("builds minimal payload with only allowed fields", () => {
    const payload = buildHermesPayload({
      id: 123,
      source: "site",
      city: "Алматы",
      furnitureType: "kitchen",
      budget: 615000,
      description: "Кухня 3 метра",
      createdAt: "2026-06-24T10:00:00.000Z"
    });

    assert.equal(payload.eventType, "order.created");
    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.order.id, 123);
    assert.equal(payload.order.source, "site");
    assert.equal(payload.order.city, "Алматы");
    assert.equal(payload.order.furnitureType, "kitchen");
    assert.equal(payload.order.budget, 615000);
    assert.equal(payload.order.description, "Кухня 3 метра");
    assert.equal(payload.order.createdAt, "2026-06-24T10:00:00.000Z");
  });

  it("excludes phone, email, address, raw_payload", () => {
    const payload = buildHermesPayload({
      id: 1,
      phone: "+77011234567",
      email: "test@example.com",
      address: "ул. Абая 10",
      raw_payload: "some raw data",
      clientId: 42,
      clientName: "Иван",
      clientPhone: "+77011234567",
      notes: "some notes",
      status: "new",
      name: "Иван"
    });

    assert.equal(payload.order.phone, undefined);
    assert.equal(payload.order.email, undefined);
    assert.equal(payload.order.address, undefined);
    assert.equal(payload.order.raw_payload, undefined);
    assert.equal(payload.order.clientId, undefined);
    assert.equal(payload.order.clientName, undefined);
    assert.equal(payload.order.clientPhone, undefined);
    assert.equal(payload.order.notes, undefined);
    assert.equal(payload.order.status, undefined);
  });

  it("includes name when present (not excluded)", () => {
    const payload = buildHermesPayload({
      id: 1,
      name: "Иван"
    });
    assert.equal(payload.order.name, undefined);
  });

  it("includes calculatorMeta when present", () => {
    const payload = buildHermesPayload({
      id: 1,
      calculatorMeta: {
        calculatorId: 1,
        categoryCode: "kitchen",
        estimate: 615000,
        formulaVersion: 1,
        schemaVersion: 1
      }
    });

    assert.deepEqual(payload.order.calculatorMeta, {
      calculatorId: 1,
      categoryCode: "kitchen",
      estimate: 615000,
      formulaVersion: 1,
      schemaVersion: 1
    });
  });

  it("strips personal fields from calculatorMeta", () => {
    const payload = buildHermesPayload({
      id: 1,
      calculatorMeta: {
        calculatorId: 1,
        categoryCode: "kitchen",
        units: 3,
        materialRuleCode: "laminated",
        materialMultiplier: 1.2,
        estimate: 615000,
        formulaVersion: 1,
        schemaVersion: 1
      }
    });

    assert.equal(payload.order.calculatorMeta.calculatorId, 1);
    assert.equal(payload.order.calculatorMeta.categoryCode, "kitchen");
    assert.equal(payload.order.calculatorMeta.units, undefined);
    assert.equal(payload.order.calculatorMeta.materialRuleCode, undefined);
    assert.equal(payload.order.calculatorMeta.materialMultiplier, undefined);
  });

  it("handles missing calculatorMeta gracefully", () => {
    const payload = buildHermesPayload({ id: 1 });
    assert.equal(payload.order.calculatorMeta, undefined);
  });

  it("does not mutate input", () => {
    const order = { id: 1, source: "site", phone: "+77011234567" };
    const frozen = Object.freeze(order);
    const payload = buildHermesPayload(frozen);
    assert.equal(payload.order.id, 1);
    assert.equal(payload.order.source, "site");
    assert.equal(payload.order.phone, undefined);
  });

  it("handles empty budget and description as null", () => {
    const payload = buildHermesPayload({
      id: 1,
      budget: null,
      description: null
    });
    assert.equal(payload.order.budget, null);
    assert.equal(payload.order.description, null);
  });
});
