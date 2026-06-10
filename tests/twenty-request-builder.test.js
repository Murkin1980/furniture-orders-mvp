import test from "node:test";
import assert from "node:assert/strict";
import {
  TWENTY_REQUEST_VERSION,
  buildTwentyRequest,
  buildTwentySyncRequests,
  normalizeTwentyBaseUrl
} from "../src/crm/twenty-request-builder.js";

const env = {
  TWENTY_API_BASE_URL: "https://crm.example.test/",
  TWENTY_API_KEY: "test-key"
};

test("normalizes Twenty base URL", () => {
  assert.equal(normalizeTwentyBaseUrl(" https://crm.example.test/// "), "https://crm.example.test");
});

test("requires Twenty base URL", () => {
  assert.throws(() => normalizeTwentyBaseUrl(), /TWENTY_API_BASE_URL is required/);
});

test("builds person create request", () => {
  assert.deepEqual(buildTwentyRequest({
    resource: "person",
    payload: { name: "Aida" },
    env
  }), {
    resource: "person",
    url: "https://crm.example.test/rest/people",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-key"
    },
    body: { name: "Aida" }
  });
});

test("builds opportunity and note resource URLs", () => {
  assert.equal(buildTwentyRequest({
    resource: "opportunity",
    env
  }).url, "https://crm.example.test/rest/opportunities");
  assert.equal(buildTwentyRequest({
    resource: "note",
    env
  }).url, "https://crm.example.test/rest/notes");
});

test("omits authorization header when API key is absent", () => {
  const request = buildTwentyRequest({
    resource: "person",
    env: { TWENTY_API_BASE_URL: "https://crm.example.test" }
  });

  assert.equal("Authorization" in request.headers, false);
});

test("rejects unsupported resources", () => {
  assert.throws(() => buildTwentyRequest({
    resource: "company",
    env
  }), /Unsupported Twenty resource/);
});

test("builds sync requests from an order through the mapper", () => {
  const result = buildTwentySyncRequests({
    id: 9,
    name: "Aida",
    phone: "+77010000000",
    furniture_type: "kitchen",
    ai_summary: "Qualified lead"
  }, env);

  assert.deepEqual(result.requests.map((request) => request.resource), [
    "person",
    "opportunity",
    "note"
  ]);
  assert.equal(result.requests[0].body.name, "Aida");
  assert.equal(result.requests[1].body.furnitureType, "kitchen");
  assert.match(result.requests[2].body.body, /Qualified lead/);
  assert.equal(result.meta.orderId, 9);
  assert.equal(result.meta.requestVersion, TWENTY_REQUEST_VERSION);
});

test("does not mutate order or payload objects", () => {
  const order = {
    id: 3,
    name: "Erlan",
    raw_payload: {
      calculatorMeta: {
        calculatorId: 1
      }
    }
  };
  const orderBefore = structuredClone(order);
  const payload = { name: "Erlan" };
  const request = buildTwentyRequest({ resource: "person", payload, env });

  request.body.name = "Changed";

  assert.deepEqual(order, orderBefore);
  assert.equal(payload.name, "Erlan");
  assert.doesNotThrow(() => buildTwentySyncRequests(order, env));
});

test("does not call fetch", () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
  };

  try {
    buildTwentySyncRequests({ id: 1 }, env);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
