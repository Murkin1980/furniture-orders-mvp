export const PORTFOLIO_MEDIA_BUCKET_BINDING = "PORTFOLIO_MEDIA_BUCKET";
export const PORTFOLIO_MEDIA_DEFAULT_BUCKET = "furniture-portfolio-media";

export function getPortfolioMediaOpsStatus(env = {}) {
  const binding = env[PORTFOLIO_MEDIA_BUCKET_BINDING];
  const publicBaseUrl = normalizePublicMediaBaseUrl(env.PORTFOLIO_MEDIA_PUBLIC_BASE_URL);
  const hasBucketBinding = Boolean(binding && typeof binding.put === "function" && typeof binding.get === "function");
  const checks = [
    check("bucket_binding", hasBucketBinding, `${PORTFOLIO_MEDIA_BUCKET_BINDING} must expose R2 get/put methods.`),
    check("public_url", publicBaseUrl.ok, publicBaseUrl.message),
    check("fallback_route", true, "If no public base URL is configured, /media/<key> serves uploaded portfolio objects.")
  ];

  return {
    ready: checks.every((item) => item.ok),
    bindingName: PORTFOLIO_MEDIA_BUCKET_BINDING,
    bucketName: env.PORTFOLIO_MEDIA_BUCKET_NAME || PORTFOLIO_MEDIA_DEFAULT_BUCKET,
    publicBaseUrl: publicBaseUrl.value,
    usesMediaFallback: !publicBaseUrl.value,
    checks
  };
}

export function normalizePublicMediaBaseUrl(value) {
  const text = clean(value);
  if (!text) {
    return { ok: true, value: "", message: "PORTFOLIO_MEDIA_PUBLIC_BASE_URL is optional." };
  }

  try {
    const url = new URL(text);
    if (url.protocol !== "https:") {
      return failure("PORTFOLIO_MEDIA_PUBLIC_BASE_URL must use HTTPS.");
    }
    if (url.username || url.password || url.search || url.hash) {
      return failure("PORTFOLIO_MEDIA_PUBLIC_BASE_URL must not include auth, query, or hash.");
    }
    return {
      ok: true,
      value: url.toString().replace(/\/+$/g, ""),
      message: "Public media base URL is valid."
    };
  } catch {
    return failure("PORTFOLIO_MEDIA_PUBLIC_BASE_URL must be a valid URL.");
  }
}

function check(name, ok, message) {
  return { name, ok: Boolean(ok), message };
}

function failure(message) {
  return { ok: false, value: "", message };
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}
