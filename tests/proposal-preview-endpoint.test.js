import test from "node:test";
import assert from "node:assert/strict";
import { onRequest, onRequestOptions, onRequestPost } from "../functions/api/proposals/preview.js";

function context(body, token = "write-secret", env = { ADMIN_WRITE_TOKEN: "write-secret" }) {
  return {
    env,
    request: new Request("https://example.test/api/proposals/preview", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body
    })
  };
}

test("proposal preview requires write authorization", async () => {
  const response = await onRequestPost(context("{}", "read-secret", {
    ADMIN_READ_TOKEN: "read-secret",
    ADMIN_WRITE_TOKEN: "write-secret"
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, "unauthorized");
});

test("proposal preview returns normalized proposal and printable HTML", async () => {
  const response = await onRequestPost(context(JSON.stringify({
    proposalNumber: "KP-12",
    company: { name: "Salamat Mebel" },
    customer: { name: "Мурат" },
    items: [{ name: "Кухня", quantity: 2, unitPrice: 150000 }]
  })));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.proposal.total, 300000);
  assert.match(body.html, /<!doctype html>/i);
  assert.match(body.html, /KP-12/);
  assert.match(body.html, /300(?:\s|&nbsp;)*000/);
});

test("proposal preview rejects invalid JSON and non-object payloads", async () => {
  const invalidJson = await onRequestPost(context("{"));
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error, "invalid_json");

  const invalidDraft = await onRequestPost(context("[]"));
  assert.equal(invalidDraft.status, 400);
  assert.equal((await invalidDraft.json()).error, "invalid_proposal");
});

test("proposal preview escapes manager-provided HTML", async () => {
  const response = await onRequestPost(context(JSON.stringify({
    customer: { name: "<script>alert(1)</script>" },
    items: [{ name: "<img src=x onerror=alert(1)>" }]
  })));
  const body = await response.json();
  assert.doesNotMatch(body.html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(body.html, /<img src=x onerror/);
  assert.match(body.html, /&lt;script&gt;/);
});

test("proposal preview supports OPTIONS and rejects other methods", async () => {
  assert.equal((await onRequestOptions()).status, 204);
  const response = await onRequest();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST, OPTIONS");
});

test("proposal preview does not require database or network dependencies", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Unexpected fetch");
  };
  try {
    assert.equal((await onRequestPost(context("{}"))).status, 200);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
