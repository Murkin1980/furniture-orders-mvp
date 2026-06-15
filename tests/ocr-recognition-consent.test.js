import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRecognitionConsentAudit,
  buildRecognitionDeletionAudit,
  isRecognitionRetentionExpired
} from "../src/ocr/recognition-consent.js";

const now = "2026-06-15T12:00:00.000Z";

test("synthetic recognition does not require customer consent", () => {
  const audit = buildRecognitionConsentAudit({ image: { synthetic: true } }, { now });
  assert.equal(audit.ok, true);
  assert.equal(audit.status, "not_required");
});

test("builds a durable customer consent audit", () => {
  const audit = buildRecognitionConsentAudit({
    consent: {
      confirmed: true,
      managerConfirmed: true,
      policyVersion: "ocr-consent-v1",
      confirmedBy: "manager-1",
      confirmedAt: "2026-06-15T11:00:00Z",
      retentionUntil: "2026-07-15T11:00:00Z"
    }
  }, { now });

  assert.equal(audit.ok, true);
  assert.equal(audit.status, "confirmed");
  assert.equal(audit.policyVersion, "ocr-consent-v1");
  assert.equal(audit.confirmedBy, "manager-1");
});

test("rejects incomplete consent and expired retention", () => {
  assert.equal(buildRecognitionConsentAudit({}, { now }).error, "ocr_consent_required");
  assert.equal(buildRecognitionConsentAudit({
    consent: { confirmed: true, managerConfirmed: true }
  }, { now }).error, "ocr_consent_policy_required");
  assert.equal(buildRecognitionConsentAudit({
    consent: {
      confirmed: true, managerConfirmed: true, policyVersion: "v1",
      confirmedBy: "manager", confirmedAt: now, retentionUntil: "2026-06-14T12:00:00Z"
    }
  }, { now }).error, "ocr_retention_required");
});

test("deletion audit requires explicit manager confirmation", () => {
  assert.equal(buildRecognitionDeletionAudit({ deletedBy: "manager", reason: "expired" }, { now }).ok, false);
  const audit = buildRecognitionDeletionAudit({
    managerConfirmed: true, deletedBy: "manager", reason: "retention expired"
  }, { now });
  assert.deepEqual(audit, {
    ok: true, deletedBy: "manager", deletedAt: now, reason: "retention expired"
  });
});

test("detects expired retention safely", () => {
  assert.equal(isRecognitionRetentionExpired("2026-06-14T12:00:00Z", { now }), true);
  assert.equal(isRecognitionRetentionExpired("2026-06-16T12:00:00Z", { now }), false);
  assert.equal(isRecognitionRetentionExpired("invalid", { now }), false);
});
