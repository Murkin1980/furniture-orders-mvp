import test from "node:test";
import assert from "node:assert/strict";
import { AUTH_SCOPES, authorizeRequest, getRequestToken, scopeAllows } from "../src/auth.js";

function request(token, header = "Authorization") {
  const value = header === "Authorization" ? `Bearer ${token}` : token;
  return new Request("https://example.test/api", { headers: { [header]: value } });
}

test("extracts bearer and existing admin header tokens", () => {
  assert.equal(getRequestToken(request("bearer-token")), "bearer-token");
  assert.equal(getRequestToken(request("header-token", "X-Admin-Token")), "header-token");
});

test("read token authorizes read but not write", () => {
  const env = { ADMIN_READ_TOKEN: "read-secret" };

  assert.equal(authorizeRequest(request("read-secret"), env, AUTH_SCOPES.READ).ok, true);
  assert.equal(authorizeRequest(request("read-secret"), env, AUTH_SCOPES.WRITE).ok, false);
});

test("write token authorizes read and write but not operations", () => {
  const env = { ADMIN_WRITE_TOKEN: "write-secret" };

  assert.equal(authorizeRequest(request("write-secret"), env, AUTH_SCOPES.READ).ok, true);
  assert.equal(authorizeRequest(request("write-secret"), env, AUTH_SCOPES.WRITE).ok, true);
  assert.equal(authorizeRequest(request("write-secret"), env, AUTH_SCOPES.OPS).ok, false);
});

test("operations token authorizes only operations", () => {
  const env = { OPS_TOKEN: "ops-secret" };

  assert.equal(authorizeRequest(request("ops-secret"), env, AUTH_SCOPES.OPS).ok, true);
  assert.equal(authorizeRequest(request("ops-secret"), env, AUTH_SCOPES.READ).ok, false);
  assert.equal(authorizeRequest(request("ops-secret"), env, AUTH_SCOPES.WRITE).ok, false);
});

test("legacy admin token temporarily authorizes every scope", () => {
  const env = { ADMIN_TOKEN: "legacy-secret" };

  for (const scope of Object.values(AUTH_SCOPES)) {
    const result = authorizeRequest(request("legacy-secret"), env, scope);
    assert.equal(result.ok, true);
    assert.equal(result.legacy, true);
  }
});

test("returns safe failures for missing config, invalid token, and invalid scope", () => {
  assert.equal(authorizeRequest(request("secret"), {}, AUTH_SCOPES.READ).status, 503);
  assert.equal(authorizeRequest(request("wrong"), { ADMIN_READ_TOKEN: "secret" }, AUTH_SCOPES.READ).status, 401);
  assert.equal(authorizeRequest(request("secret"), { ADMIN_READ_TOKEN: "secret" }, "unknown").status, 500);
});

test("scope hierarchy stays explicit", () => {
  assert.equal(scopeAllows(AUTH_SCOPES.WRITE, AUTH_SCOPES.READ), true);
  assert.equal(scopeAllows(AUTH_SCOPES.READ, AUTH_SCOPES.WRITE), false);
  assert.equal(scopeAllows(AUTH_SCOPES.OPS, AUTH_SCOPES.READ), false);
});
