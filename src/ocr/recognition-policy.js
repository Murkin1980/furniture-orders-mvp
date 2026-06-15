import { buildRecognitionConsentAudit } from "./recognition-consent.js";

export function evaluateRecognitionPolicy(input = {}, env = {}, options = {}) {
  const image = isPlainObject(input?.image) ? input.image : {};
  const source = clean(image.source);

  if (image.synthetic === true) {
    return allow("synthetic", buildRecognitionConsentAudit(input, options));
  }

  if (env.OCR_CUSTOMER_IMAGES_ENABLED !== "true") {
    return deny(
      503,
      "ocr_customer_images_disabled",
      "Customer image recognition is disabled."
    );
  }

  const consentAudit = buildRecognitionConsentAudit(input, options);
  if (!consentAudit.ok) {
    return deny(
      400,
      consentAudit.error,
      consentAudit.message
    );
  }

  if (!/^https:\/\//i.test(source) || !clean(image.mediaId ?? image.media_id)) {
    return deny(
      400,
      "ocr_stored_image_required",
      "Customer recognition requires a stored HTTPS image reference and media ID."
    );
  }

  return allow("customer", consentAudit);
}

function allow(mode, consentAudit) {
  return { ok: true, status: 200, mode, consentAudit };
}

function deny(status, error, message) {
  return { ok: false, status, error, message };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
