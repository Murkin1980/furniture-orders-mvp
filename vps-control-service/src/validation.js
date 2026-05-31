const SITE_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,62}$/;
const ALLOWED_WEBSERVERS = new Set(['nginx', 'caddy']);

export function validateSiteSlug(slug) {
  if (typeof slug !== 'string' || !slug) {
    return { valid: false, error: 'siteSlug is required.' };
  }
  if (!SITE_SLUG_REGEX.test(slug)) {
    return { valid: false, error: 'siteSlug must match ^[a-z0-9][a-z0-9-]{0,62}$.' };
  }
  return { valid: true };
}

export function validateSourceUrl(url, allowedHosts) {
  if (typeof url !== 'string' || !url) {
    return { valid: false, error: 'sourceUrl is required.' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'sourceUrl must be a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'sourceUrl must use http or https protocol.' };
  }

  if (!Array.isArray(allowedHosts) || !allowedHosts.includes(parsed.hostname)) {
    return { valid: false, error: `sourceUrl host must be one of: ${(allowedHosts || []).join(', ')}.` };
  }

  return { valid: true };
}

export function validateWebserver(webserver) {
  if (typeof webserver !== 'string' || !webserver) {
    return { valid: false, error: 'webserver is required.' };
  }

  if (!ALLOWED_WEBSERVERS.has(webserver)) {
    return { valid: false, error: 'webserver must be "nginx" or "caddy".' };
  }

  return { valid: true };
}

export function validateLimit(limit) {
  if (limit === undefined || limit === null || limit === '') {
    return { valid: true, value: 50 };
  }

  const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'limit must be an integer.' };
  }

  if (num < 1 || num > 200) {
    return { valid: false, error: 'limit must be between 1 and 200.' };
  }

  return { valid: true, value: num };
}
