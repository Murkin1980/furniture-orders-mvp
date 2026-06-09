import { deployVpsSite } from "./vps-control.js";
import { getCalculatorEmbedCode } from "./calculators-core.js";
import { normalizeSiteBrief, parseSiteBrief, serializeSiteBrief, validateSiteBrief } from "./site-brief.js";
import { buildTemplateSiteBrief, getSiteTemplate } from "./site-templates.js";

const SITE_STATUSES = new Set(["draft", "deploying", "published", "failed", "archived"]);
const DEPLOYMENT_STATUSES = new Set(["queued", "running", "succeeded", "failed"]);
const SSL_STATUSES = new Set(["unknown", "pending", "active", "error"]);

export function normalizeSitePayload(input) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const name = cleanText(payload.name) || "Furniture landing";
  const slug = cleanSlug(payload.slug || name);
  const templateKey = getSiteTemplate(cleanSlug(payload.templateKey) || "default-furniture").key;
  const brief = normalizeSiteBrief(buildTemplateSiteBrief(templateKey, {
    businessName: cleanText(payload.ownerName) || undefined,
    ownerName: cleanText(payload.ownerName) || undefined,
    domain: normalizeDomain(payload.domain),
    ...(payload.brief || payload.content || {})
  }));

  return {
    name,
    slug,
    ownerName: brief.ownerName || brief.businessName || cleanText(payload.ownerName) || "Furniture workshop",
    templateKey,
    domain: normalizeDomain(payload.domain),
    status: SITE_STATUSES.has(cleanSlug(payload.status)) ? cleanSlug(payload.status) : "draft",
    brief
  };
}

export async function createSite({ db, env = {}, payload }) {
  assertDb(db);
  await ensureSitesSchema(db, env);

  const normalized = normalizeSitePayload(payload);
  const errors = validateSitePayload(normalized);
  if (errors.length) {
    return validationResponse(errors);
  }

  const existing = await db.prepare("SELECT id FROM sites WHERE slug = ?").bind(normalized.slug).first();
  if (existing) {
    return {
      ok: false,
      status: 409,
      body: {
        success: false,
        error: "site_slug_exists",
        message: "A site with this slug already exists."
      }
    };
  }

  const result = await db
    .prepare(
      `INSERT INTO sites (
        name, slug, owner_name, template_key, status, content_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(normalized.name, normalized.slug, normalized.ownerName, normalized.templateKey, normalized.status, serializeSiteBrief(normalized.brief))
    .run();

  const siteId = result?.meta?.last_row_id;
  if (!siteId) {
    throw new Error("Site was not created.");
  }

  if (normalized.domain) {
    await addPrimaryDomain(db, siteId, normalized.domain);
  }

  return getSite({ db, env, siteId });
}

export async function updateSite({ db, env = {}, siteId, payload }) {
  assertDb(db);
  await ensureSitesSchema(db, env);

  const normalizedSiteId = normalizePositiveInteger(siteId);
  if (!normalizedSiteId) return siteIdError();

  const current = await selectSite(db, normalizedSiteId);
  if (!current) return siteNotFound();

  const normalized = normalizeSitePayload({
    ...current,
    ...payload,
    slug: payload?.slug || current.slug,
    domain: payload?.domain ?? current.domains?.find((item) => item.isPrimary)?.domain,
    brief: {
      ...current.brief,
      ...(payload?.brief || payload?.content || {})
    }
  });
  const errors = validateSitePayload(normalized);
  if (errors.length) return validationResponse(errors);

  const duplicate = await db.prepare("SELECT id FROM sites WHERE slug = ? AND id != ?").bind(normalized.slug, normalizedSiteId).first();
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      body: { success: false, error: "site_slug_exists", message: "A site with this slug already exists." }
    };
  }

  await db
    .prepare(
      `UPDATE sites
       SET name = ?, slug = ?, owner_name = ?, template_key = ?, content_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(
      normalized.name,
      normalized.slug,
      normalized.ownerName,
      normalized.templateKey,
      serializeSiteBrief(normalized.brief),
      normalizedSiteId
    )
    .run();

  if (normalized.domain) {
    await upsertPrimaryDomain(db, normalizedSiteId, normalized.domain);
  }

  return getSite({ db, env, siteId: normalizedSiteId });
}

export async function listSites({ db, env = {} }) {
  assertDb(db);
  await ensureSitesSchema(db, env);

  const result = await db
    .prepare(
      `SELECT
        sites.id,
        sites.name,
        sites.slug,
        sites.owner_name AS ownerName,
        sites.template_key AS templateKey,
        sites.status,
        sites.created_at AS createdAt,
        sites.updated_at AS updatedAt,
        site_domains.domain AS domain,
        site_domains.ssl_status AS sslStatus,
        site_domains.is_primary AS isPrimaryDomain
       FROM sites
       LEFT JOIN site_domains
         ON site_domains.site_id = sites.id
        AND site_domains.is_primary = 1
       ORDER BY sites.created_at DESC, sites.id DESC`
    )
    .all();

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      items: result?.results || []
    }
  };
}

export async function getSite({ db, env = {}, siteId }) {
  assertDb(db);
  await ensureSitesSchema(db, env);

  const normalizedSiteId = normalizePositiveInteger(siteId);
  if (!normalizedSiteId) {
    return siteIdError();
  }

  const site = await selectSite(db, normalizedSiteId);
  if (!site) {
    return siteNotFound();
  }
  const domains = await listSiteDomains(db, normalizedSiteId);
  const deployments = await listSiteDeployments(db, normalizedSiteId);

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: {
        ...site,
        domains,
        deployments
      }
    }
  };
}

export async function getSiteStatus({ db, env = {}, siteId }) {
  const result = await getSite({ db, env, siteId });
  if (!result.ok) {
    return result;
  }

  const primaryDomain = result.body.item.domains.find((domain) => domain.isPrimary) || null;
  const latestDeployment = result.body.item.deployments[0] || null;

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      item: {
        id: result.body.item.id,
        slug: result.body.item.slug,
        status: result.body.item.status,
        domain: primaryDomain,
        latestDeployment
      }
    }
  };
}

export async function getSiteArtifact({ db, env = {}, siteId }) {
  const result = await getSite({ db, env, siteId });
  if (!result.ok) {
    return result;
  }

  const brief = normalizeSiteBrief(result.body.item.brief);
  const calculatorEmbed = brief.calculatorRequired && brief.calculatorId
    ? await getCalculatorEmbedCode({
        db,
        env,
        calculatorId: brief.calculatorId,
        origin: cleanText(env.PUBLIC_APP_ORIGIN) || "https://furniture-orders-mvp.pages.dev"
      })
    : null;

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      html: renderSiteArtifact(result.body.item, calculatorEmbed?.ok ? calculatorEmbed.body : null)
    }
  };
}

export async function deploySite({ db, env = {}, siteId, payload = {}, fetchImpl = fetch }) {
  assertDb(db);
  await ensureSitesSchema(db, env);

  const normalizedSiteId = normalizePositiveInteger(siteId);
  if (!normalizedSiteId) {
    return siteIdError();
  }

  const site = await selectSite(db, normalizedSiteId);
  if (!site) {
    return siteNotFound();
  }
  const briefErrors = validateSiteBrief(site.brief);
  if (briefErrors.length) {
    return validationResponse(briefErrors);
  }

  const deployPayload = normalizeSiteDeployPayload(site, payload, env);
  const errors = validateSiteDeployPayload(deployPayload);
  if (errors.length) {
    return validationResponse(errors);
  }

  const created = await db
    .prepare(
      `INSERT INTO site_deployments (
        site_id, status, source_url, target_path, dry_run, upstream_status, response_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(normalizedSiteId, "running", deployPayload.sourceUrl, deployPayload.targetPath, deployPayload.dryRun ? 1 : 0)
    .run();

  const deploymentId = created?.meta?.last_row_id;
  const upstream = await deployVpsSite({
    env,
    fetchImpl,
    payload: deployPayload
  });
  const nextStatus = upstream.ok ? "succeeded" : "failed";
  const siteStatus = upstream.ok ? "published" : "failed";

  await db
    .prepare(
      `UPDATE site_deployments
       SET status = ?, upstream_status = ?, response_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(nextStatus, upstream.status, JSON.stringify(upstream.body), deploymentId)
    .run();

  await db
    .prepare("UPDATE sites SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(siteStatus, normalizedSiteId)
    .run();

  const latest = await selectDeployment(db, deploymentId);

  return {
    ok: upstream.ok,
    status: upstream.ok ? 200 : upstream.status,
    body: {
      success: upstream.ok,
      item: latest,
      upstream: upstream.body
    }
  };
}

export function normalizeSiteDeployPayload(site, input, env = {}) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const siteSlug = cleanSlug(payload.siteSlug || site?.slug);
  const sourceUrl = cleanText(payload.sourceUrl || env.SITE_DEPLOY_SOURCE_URL || defaultSourceUrl(site, env));

  return {
    siteSlug,
    sourceUrl,
    targetPath: cleanText(payload.targetPath || env.SITE_DEPLOY_TARGET_ROOT && `${env.SITE_DEPLOY_TARGET_ROOT}/${siteSlug}` || `/var/www/${siteSlug}`),
    dryRun: payload.dryRun !== false,
    artifactType: cleanSlug(payload.artifactType) || "html"
  };
}

async function ensureSitesSchema(db, env) {
  if (env.RUNTIME_SCHEMA_INIT !== true && env.RUNTIME_SCHEMA_INIT !== "true") {
    return;
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_name TEXT NOT NULL,
      template_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      content_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      domain TEXT NOT NULL,
      ssl_status TEXT NOT NULL DEFAULT 'unknown',
      is_primary INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS site_deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      source_url TEXT NOT NULL,
      target_path TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 1,
      upstream_status INTEGER,
      response_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )`
  ).run();

  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_site_domains_site ON site_domains(site_id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_site_deployments_site ON site_deployments(site_id, created_at DESC)").run();
}

async function addPrimaryDomain(db, siteId, domain) {
  await db
    .prepare(
      `INSERT INTO site_domains (
        site_id, domain, ssl_status, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(siteId, domain, "unknown")
    .run();
}

async function upsertPrimaryDomain(db, siteId, domain) {
  const existing = await db
    .prepare("SELECT id FROM site_domains WHERE site_id = ? AND is_primary = 1")
    .bind(siteId)
    .first();

  if (existing) {
    await db
      .prepare("UPDATE site_domains SET domain = ?, ssl_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(domain, "unknown", existing.id)
      .run();
    return;
  }

  await addPrimaryDomain(db, siteId, domain);
}

async function selectSite(db, siteId) {
  return db
    .prepare(
      `SELECT
        id,
        name,
        slug,
        owner_name AS ownerName,
        template_key AS templateKey,
        content_json AS contentJson,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM sites
       WHERE id = ?`
    )
    .bind(siteId)
    .first()
    .then(formatSite);
}

async function listSiteDomains(db, siteId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        site_id AS siteId,
        domain,
        ssl_status AS sslStatus,
        is_primary AS isPrimary,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM site_domains
       WHERE site_id = ?
       ORDER BY is_primary DESC, id ASC`
    )
    .bind(siteId)
    .all();

  return (result?.results || []).map((domain) => ({
    ...domain,
    isPrimary: Boolean(domain.isPrimary)
  }));
}

async function listSiteDeployments(db, siteId) {
  const result = await db
    .prepare(
      `SELECT
        id,
        site_id AS siteId,
        status,
        source_url AS sourceUrl,
        target_path AS targetPath,
        dry_run AS dryRun,
        upstream_status AS upstreamStatus,
        response_json AS responseJson,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM site_deployments
       WHERE site_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .bind(siteId)
    .all();

  return (result?.results || []).map(formatDeployment);
}

async function selectDeployment(db, deploymentId) {
  const row = await db
    .prepare(
      `SELECT
        id,
        site_id AS siteId,
        status,
        source_url AS sourceUrl,
        target_path AS targetPath,
        dry_run AS dryRun,
        upstream_status AS upstreamStatus,
        response_json AS responseJson,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM site_deployments
       WHERE id = ?`
    )
    .bind(deploymentId)
    .first();

  return row ? formatDeployment(row) : null;
}

function formatDeployment(row) {
  return {
    ...row,
    dryRun: Boolean(row.dryRun),
    response: parseJson(row.responseJson)
  };
}

function formatSite(row) {
  if (!row) return null;
  const { contentJson, ...site } = row;
  return {
    ...site,
    brief: parseSiteBrief(contentJson)
  };
}

function validateSitePayload(payload) {
  const errors = [];

  if (!payload.name) {
    errors.push({ field: "name", message: "name is required." });
  }
  if (!payload.slug) {
    errors.push({ field: "slug", message: "slug is required." });
  }
  if (payload.status && !SITE_STATUSES.has(payload.status)) {
    errors.push({ field: "status", message: "status is invalid." });
  }
  if (payload.domain && !isDomainLike(payload.domain)) {
    errors.push({ field: "domain", message: "domain must be a hostname without protocol." });
  }
  return errors;
}

function validateSiteDeployPayload(payload) {
  const errors = [];

  if (!payload.siteSlug) {
    errors.push({ field: "siteSlug", message: "siteSlug is required." });
  }
  if (!payload.sourceUrl || !isHttpUrl(payload.sourceUrl)) {
    errors.push({ field: "sourceUrl", message: "sourceUrl must be an http or https URL." });
  }
  if (!payload.targetPath) {
    errors.push({ field: "targetPath", message: "targetPath is required." });
  }
  if (payload.artifactType !== "html") {
    errors.push({ field: "artifactType", message: "artifactType must be html." });
  }

  return errors;
}

function siteIdError() {
  return validationResponse([{ field: "siteId", message: "siteId must be a positive integer." }]);
}

function siteNotFound() {
  return {
    ok: false,
    status: 404,
    body: {
      success: false,
      error: "site_not_found",
      message: "Site was not found."
    }
  };
}

function validationResponse(fields) {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: "validation_error",
      message: "Request validation failed.",
      fields
    }
  };
}

function assertDb(db) {
  if (!db) {
    throw new Error("D1 binding DB is not configured.");
  }
}

function defaultSourceUrl(site, env) {
  const origin = cleanText(env.PUBLIC_APP_ORIGIN) || "https://furniture-orders-mvp.pages.dev";
  return `${origin}/api/sites/${site.id}/artifact`;
}

function renderSiteArtifact(site, calculatorEmbed = null) {
  const primaryDomain = site.domains?.find((domain) => domain.isPrimary)?.domain || "";
  const brief = normalizeSiteBrief(site.brief);
  const template = getSiteTemplate(site.templateKey);
  const accent = brief.accentColor || template.accentColor;
  const businessName = brief.businessName || site.ownerName;
  const offer = brief.primaryOffer || template.primaryOffer;
  const contact = brief.whatsapp || brief.phone;
  const contactHref = brief.whatsapp
    ? `https://wa.me/${contact.replace(/\D/g, "")}`
    : `tel:${contact.replace(/[^\d+]/g, "")}`;
  const sectionSet = new Set(brief.sections);
  const services = brief.furnitureTypes.length ? brief.furnitureTypes : template.furnitureTypes;
  const advantages = brief.advantages.length ? brief.advantages : template.advantages;
  const calculatorHtml = brief.calculatorRequired && brief.calculatorId && calculatorEmbed?.scriptUrl
    ? `<section class="calculator-section"><h2>Рассчитайте ориентировочную стоимость</h2><div data-furniture-calculator="${brief.calculatorId}"></div><script async src="${escapeHtml(calculatorEmbed.scriptUrl)}"></script></section>`
    : "";
  const sections = [
    sectionSet.has("services") ? renderCardSection("Что мы делаем", services) : "",
    sectionSet.has("advantages") ? renderCardSection("Почему выбирают нас", advantages) : "",
    sectionSet.has("portfolio") ? `<section><h2>Примеры работ</h2><p>Портфолио проекта будет опубликовано после отбора фотографий.</p></section>` : "",
    sectionSet.has("calculator") ? calculatorHtml : "",
    sectionSet.has("contacts") ? `<section><h2>Обсудить проект</h2><p>${escapeHtml(brief.city || "")}</p><a class="cta" href="${escapeHtml(contactHref)}">${escapeHtml(brief.ctaLabel)}</a></section>` : ""
  ].filter(Boolean).join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(site.name)} | ${escapeHtml(businessName)}</title>
  <meta name="description" content="${escapeHtml(offer)}">
  <style>
    :root { color-scheme: light; --accent: ${accent}; --ink: #202624; --paper: #f7f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: var(--ink); background: #fff; }
    header { min-height: 72vh; display: grid; align-content: center; padding: 48px 7vw; background: var(--paper); }
    nav { position: absolute; top: 24px; left: 7vw; right: 7vw; display: flex; justify-content: space-between; gap: 16px; font-weight: 700; }
    h1 { max-width: 860px; margin: 0; font-size: clamp(40px, 7vw, 88px); line-height: 1; letter-spacing: 0; }
    p { max-width: 680px; font-size: 20px; line-height: 1.55; }
    .cta { display: inline-block; width: fit-content; margin-top: 18px; padding: 14px 20px; border-radius: 6px; color: #fff; background: var(--accent); text-decoration: none; font-weight: 700; }
    main { padding: 42px 7vw 64px; display: grid; gap: 28px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    section { border-top: 2px solid var(--accent); padding-top: 18px; }
    .calculator-section { grid-column: 1 / -1; }
    h2 { margin: 0 0 10px; font-size: 22px; }
    footer { padding: 24px 7vw; background: var(--ink); color: #fff; }
    @media (max-width: 640px) {
      header { min-height: 66vh; padding: 84px 20px 40px; }
      nav { left: 20px; right: 20px; }
      h1 { font-size: 42px; }
      p { font-size: 17px; }
      main { padding: 32px 20px 48px; grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <nav><span>${escapeHtml(businessName)}</span><span>${escapeHtml(primaryDomain || site.slug)}</span></nav>
    <h1>${escapeHtml(offer)}</h1>
    <p>${escapeHtml(brief.audience || `Проектируем и производим мебель на заказ в городе ${brief.city}.`)}</p>
    <a class="cta" href="${escapeHtml(contactHref)}">${escapeHtml(brief.ctaLabel)}</a>
  </header>
  <main>${sections}</main>
  <footer>${escapeHtml(businessName)} · ${escapeHtml(primaryDomain || brief.city || "landing site")}</footer>
</body>
</html>`;
}

function renderCardSection(title, items) {
  return `<section><h2>${escapeHtml(title)}</h2><p>${items.map(escapeHtml).join(" · ")}</p></section>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeDomain(value) {
  const domain = cleanText(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return domain;
}

function cleanSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function isDomainLike(value) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
