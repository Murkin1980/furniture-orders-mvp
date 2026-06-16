import test from "node:test";
import assert from "node:assert/strict";
import {
  getPortfolioMediaOpsStatus,
  normalizePublicMediaBaseUrl,
  PORTFOLIO_MEDIA_BUCKET_BINDING
} from "../src/portfolio-media-ops.js";

test("reports ready with R2-compatible bucket and fallback media route", () => {
  const status = getPortfolioMediaOpsStatus({ [PORTFOLIO_MEDIA_BUCKET_BINDING]: bucket() });
  assert.equal(status.ready, true);
  assert.equal(status.usesMediaFallback, true);
  assert.equal(status.bucketName, "furniture-portfolio-media");
});

test("reports not ready without bucket binding", () => {
  const status = getPortfolioMediaOpsStatus({});
  assert.equal(status.ready, false);
  assert.equal(status.checks[0].name, "bucket_binding");
  assert.equal(status.checks[0].ok, false);
});

test("accepts HTTPS public media base URL and trims trailing slashes", () => {
  const result = normalizePublicMediaBaseUrl("https://media.example.test/assets///");
  assert.equal(result.ok, true);
  assert.equal(result.value, "https://media.example.test/assets");
});

test("rejects insecure or complex public media URL", () => {
  assert.equal(normalizePublicMediaBaseUrl("http://media.example.test").ok, false);
  assert.equal(normalizePublicMediaBaseUrl("https://user:pass@media.example.test").ok, false);
  assert.equal(normalizePublicMediaBaseUrl("https://media.example.test?x=1").ok, false);
});

function bucket() {
  return {
    async get() {},
    async put() {}
  };
}
