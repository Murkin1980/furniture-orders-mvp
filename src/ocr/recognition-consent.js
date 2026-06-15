export const OCR_CONSENT_STATUSES = Object.freeze([
  "not_required",
  "confirmed",
  "withdrawn"
]);

export function buildRecognitionConsentAudit(input = {}, options = {}) {
  if (input?.image?.synthetic === true) {
    return {
      ok: true,
      status: "not_required",
      policyVersion: null,
      confirmedBy: null,
      confirmedAt: null,
      retentionUntil: null
    };
  }

  const consent = isPlainObject(input.consent) ? input.consent : {};
  const now = normalizeDate(options.now) || new Date();
  const confirmedAt = normalizeIsoDate(consent.confirmedAt);
  const retentionUntil = normalizeIsoDate(consent.retentionUntil);

  if (consent.confirmed !== true || consent.managerConfirmed !== true) {
    return failure("ocr_consent_required", "Customer consent and manager confirmation are required.");
  }
  if (!clean(consent.policyVersion)) {
    return failure("ocr_consent_policy_required", "A consent policy version is required.");
  }
  if (!clean(consent.confirmedBy) || !confirmedAt) {
    return failure("ocr_consent_audit_required", "Consent confirmation author and timestamp are required.");
  }
  if (!retentionUntil || retentionUntil.getTime() <= now.getTime()) {
    return failure("ocr_retention_required", "A future retention deadline is required.");
  }

  return {
    ok: true,
    status: "confirmed",
    policyVersion: clean(consent.policyVersion),
    confirmedBy: clean(consent.confirmedBy),
    confirmedAt: confirmedAt.toISOString(),
    retentionUntil: retentionUntil.toISOString()
  };
}

export function buildRecognitionDeletionAudit(input = {}, options = {}) {
  const deletedAt = normalizeDate(options.now) || new Date();
  if (input.managerConfirmed !== true) {
    return failure("ocr_deletion_confirmation_required", "Manager confirmation is required before deletion.");
  }
  if (!clean(input.deletedBy) || !clean(input.reason)) {
    return failure("ocr_deletion_audit_required", "Deletion author and reason are required.");
  }
  return {
    ok: true,
    deletedBy: clean(input.deletedBy),
    deletedAt: deletedAt.toISOString(),
    reason: clean(input.reason)
  };
}

export function isRecognitionRetentionExpired(retentionUntil, options = {}) {
  const deadline = normalizeIsoDate(retentionUntil);
  const now = normalizeDate(options.now) || new Date();
  return Boolean(deadline && deadline.getTime() <= now.getTime());
}

function failure(error, message) {
  return { ok: false, error, message };
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function normalizeIsoDate(value) {
  const date = normalizeDate(value);
  return date ? date : null;
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
