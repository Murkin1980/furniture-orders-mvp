import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as listProposals, onRequestPost as saveProposal } from "../functions/api/proposals.js";
import { onRequestPost as publishProposal } from "../functions/api/proposals/[id]/publish.js";
import { onRequestPost as approveProposal } from "../functions/api/proposals/[id]/approve.js";

test("proposal lifecycle endpoints enforce read and write scopes", async () => {
  const env = { ADMIN_READ_TOKEN: "read", ADMIN_WRITE_TOKEN: "write", DB: emptyDb() };
  const listUnauthorized = await listProposals({ request: request("GET", "write", null, "https://example.test/api/proposals?orderId=1"), env });
  assert.notEqual(listUnauthorized.status, 401);

  const saveUnauthorized = await saveProposal({ request: request("POST", "read", {}), env });
  assert.equal(saveUnauthorized.status, 401);
  const publishUnauthorized = await publishProposal({ request: request("POST", "read", { versionNumber: 1 }), env, params: { id: "1" } });
  assert.equal(publishUnauthorized.status, 401);
  const approveUnauthorized = await approveProposal({ request: request("POST", "read", { versionNumber: 1, confirmed: true }), env, params: { id: "1" } });
  assert.equal(approveUnauthorized.status, 401);
});

test("write endpoints reject invalid JSON before database access", async () => {
  const env = { ADMIN_WRITE_TOKEN: "write" };
  for (const [handler, params] of [[saveProposal, {}], [publishProposal, { id: "1" }], [approveProposal, { id: "1" }]]) {
    const response = await handler({ request: request("POST", "write", "INVALID"), env, params });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_json");
  }
});

test("proposal lifecycle endpoints never call fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("unexpected fetch"); };
  try {
    const response = await saveProposal({ request: request("POST", "write", "INVALID"), env: { ADMIN_WRITE_TOKEN: "write" } });
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function request(method, token, body, url = "https://example.test/api/proposals") {
  const options = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body !== null) {
    options.headers["Content-Type"] = "application/json";
    options.body = body === "INVALID" ? "{" : JSON.stringify(body);
  }
  return new Request(url, options);
}

function emptyDb() {
  return {
    prepare() {
      return {
        bind() { return this; },
        async first() { return { id: 1 }; },
        async all() { return { results: [] }; }
      };
    }
  };
}
