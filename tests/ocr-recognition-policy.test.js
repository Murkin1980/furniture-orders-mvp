import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecognitionPolicy } from "../src/ocr/recognition-policy.js";

test("allows an explicitly synthetic image without customer-image enablement", () => {
  const result = evaluateRecognitionPolicy({
    image: { source: "data:image/png;base64,AAAA", synthetic: true }
  });

  assert.deepEqual(result, { ok: true, status: 200, mode: "synthetic" });
});

test("blocks customer images by default", () => {
  const result = evaluateRecognitionPolicy({
    image: { source: "https://media.example.test/customer-sketch.webp" },
    consentConfirmed: true
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
      consentConfirmed: true
    },
    { OCR_CUSTOMER_IMAGES_ENABLED: "true" }
  );

  assert.equal(result.status, 400);
  assert.equal(result.error, "ocr_stored_image_required");
});

test("allows a consented stored customer image only after explicit enablement", () => {
  const result = evaluateRecognitionPolicy(
    {
      image: { source: "https://media.example.test/customer-sketch.webp" },
      consentConfirmed: true
    },
    { OCR_CUSTOMER_IMAGES_ENABLED: "true" }
  );

  assert.deepEqual(result, { ok: true, status: 200, mode: "customer" });
});

test("handles empty and malformed input safely", () => {
  assert.doesNotThrow(() => evaluateRecognitionPolicy());
  assert.equal(evaluateRecognitionPolicy().ok, false);
  assert.equal(evaluateRecognitionPolicy({ image: [] }).ok, false);
});
