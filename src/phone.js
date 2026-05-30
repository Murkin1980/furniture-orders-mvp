export function normalizePhone(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  return text.replace(/[^\d+]/g, "");
}

export function hasMinimumPhoneDigits(value, minDigits = 10) {
  return normalizePhone(value)?.replace(/\D/g, "").length >= minDigits;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}
