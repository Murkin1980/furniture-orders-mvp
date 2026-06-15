export function evaluateRecognitionPolicy(input = {}, env = {}) {
  const image = isPlainObject(input?.image) ? input.image : {};
  const source = clean(image.source);

  if (image.synthetic === true) {
    return allow("synthetic");
  }

  if (env.OCR_CUSTOMER_IMAGES_ENABLED !== "true") {
    return deny(
      503,
      "ocr_customer_images_disabled",
      "Customer image recognition is disabled."
    );
  }

  if (input.consentConfirmed !== true) {
    return deny(
      400,
      "ocr_consent_required",
      "Explicit customer consent is required before image recognition."
    );
  }

  if (!/^https:\/\//i.test(source)) {
    return deny(
      400,
      "ocr_stored_image_required",
      "Customer recognition requires a stored HTTPS image reference."
    );
  }

  return allow("customer");
}

function allow(mode) {
  return { ok: true, status: 200, mode };
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
