import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProductionSmokePreflight,
  formatPreflightReport
} from "../scripts/production-smoke-preflight.mjs";

const completeEnv = {
  PORTFOLIO_SMOKE_BASE_URL: "https://example.pages.dev",
  PORTFOLIO_SMOKE_ADMIN_TOKEN: "admin-token-123",
  PORTFOLIO_SMOKE_IMAGE: "C:/tmp/test.webp",
  PORTFOLIO_SMOKE_PUBLISH: "false",
  VPS_SMOKE_BASE_URL: "https://example.pages.dev",
  VPS_SMOKE_ADMIN_TOKEN: "admin-token-456",
  AI_SMOKE_BASE_URL: "https://example.pages.dev",
  AI_SMOKE_ADMIN_TOKEN: "admin-token-789",
  AI_SMOKE_ORDER_ID: "12"
};

test("preflight passes when all required smoke env is present", async () => {
  const result = await buildProductionSmokePreflight(completeEnv, {
    fileExists: async () => true
  });

  assert.equal(result.ok, true);
  assert.equal(result.next.length, 0);
});

test("preflight reports missing values without throwing", async () => {
  const result = await buildProductionSmokePreflight({}, {
    fileExists: async () => false
  });

  assert.equal(result.ok, false);
  assert.ok(result.next.some((item) => item.includes("portfolio.baseUrl")));
  assert.ok(result.next.some((item) => item.includes("ai.orderId")));
});

test("preflight validates image type and existence", async () => {
  const result = await buildProductionSmokePreflight({
    ...completeEnv,
    PORTFOLIO_SMOKE_IMAGE: "C:/tmp/test.txt"
  }, {
    fileExists: async () => true
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.name === "portfolio.image").message, "test image must be .jpg, .jpeg, .png, or .webp");
});

test("preflight validates URLs and numeric synthetic order id", async () => {
  const result = await buildProductionSmokePreflight({
    ...completeEnv,
    VPS_SMOKE_BASE_URL: "ftp://example.com",
    AI_SMOKE_ORDER_ID: "real-order"
  }, {
    fileExists: async () => true
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.name === "vps.baseUrl").message, "base URL must use http or https");
  assert.equal(result.checks.find((check) => check.name === "ai.orderId").message, "order id must be numeric");
});

test("formatted report does not print admin token values", async () => {
  const result = await buildProductionSmokePreflight(completeEnv, {
    fileExists: async () => true
  });
  const report = formatPreflightReport(result);

  assert.match(report, /Production smoke preflight: ready/);
  assert.doesNotMatch(report, /admin-token-123/);
  assert.doesNotMatch(report, /admin-token-456/);
  assert.doesNotMatch(report, /admin-token-789/);
});
