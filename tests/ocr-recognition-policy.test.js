import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecognitionPolicy } from "../src/ocr/recognition-policy.js";

test("allows an explicitly synthetic image without customer-image enablement", () => {
  const result = evaluateRecognitionPolicy({
    image: { source: "data:image/png;base64,AAAA", synthetic: true }
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "synthetic");
  assert.equal(result.consentAudit.status, "not_required");
});

test("blocks customer images by default", () => {
  const result = evaluateRecognitionPolicy({
    image: { source: "https://media.example.test/customer-sketch.webp" },
    consent: durableConsent()
  });

  assert.equal(result.status, 503);
  assert.equal(result.error, "ocr_customer_images_disabled");
});

test("requires explicit consent when customer images are enabled", () => {
  const result = evaluateRecognitionPolicy(
    { image: { source: "https://media.example.test/customer-sketch.webp" } },
    { OCR_CUSTOMER_IMAGES_ENABLED: "true" }
  );

  assert.equal(result.status, 400);
  assert.equal(result.error, "ocr_consent_required");
});

test("requires a stored HTTPS source for customer recognition", () => {
  const result = evaluateRecognitionPolicy(
    {
      image: { source: "data:image/png;base64,AAAA" },
      consent: durableConsent()
    },
    { OCR_CUSTOMER_IMAGES_ENABLED: "true" }
  );

  assert.equal(result.status, 400);
  assert.equal(result.error, "ocr_stored_image_required");
});

test("allows a consented stored customer image only after explicit enablement", () => {
  const result = evaluateRecognitionPolicy(
    {
      image: { source: "https://media.example.test/customer-sketch.webp", mediaId: "orders/sketch.webp" },
      consent: durableConsent()
    },
    { OCR_CUSTOMER_IMAGES_ENABLED: "true" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, "customer");
  assert.equal(result.consentAudit.status, "confirmed");
});

function durableConsent() {
  return {
    confirmed: true,
    managerConfirmed: true,
    policyVersion: "ocr-consent-v1",
    confirmedBy: "manager",
    confirmedAt: "2026-06-15T10:00:00Z",
    retentionUntil: "2027-06-15T10:00:00Z"
  };
}

test("handles empty and malformed input safely", () => {
  assert.doesNotThrow(() => evaluateRecognitionPolicy());
  assert.equal(evaluateRecognitionPolicy().ok, false);
  assert.equal(evaluateRecognitionPolicy({ image: [] }).ok, false);
});
