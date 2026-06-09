import test from "node:test";
import assert from "node:assert/strict";
import {
  createSite,
  deploySite,
  getSiteArtifact,
  getSiteStatus,
  listSites,
  normalizeSitePayload,
  updateSite
} from "../src/sites-core.js";

test("normalizes the site contract", () => {
  const payload = normalizeSitePayload({
    name: " Salamat Kitchen Landing ",
    domain: "https://salamat-mebel.kz/kitchens",
    templateKey: "Kitchen Premium"
  });

  assert.equal(payload.name, "Salamat Kitchen Landing");
  assert.equal(payload.slug, "salamat-kitchen-landing");
  assert.equal(payload.domain, "salamat-mebel.kz");
  assert.equal(payload.templateKey, "default-furniture");
  assert.equal(payload.status, "draft");
});

test("creates and lists landing sites with a primary domain", async () => {
  const db = createSitesMockDb();
  const created = await createSite({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: {
      name: "Kitchen Landing",
      ownerName: "Salamat Mebel",
      domain: "kitchen.salamat-mebel.kz",
      templateKey: "kitchen"
    }
  });

  assert.equal(created.status, 200);
  assert.equal(created.body.item.slug, "kitchen-landing");
  assert.equal(created.body.item.domains[0].domain, "kitchen.salamat-mebel.kz");

  const listed = await listSites({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" }
  });

  assert.equal(listed.status, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].domain, "kitchen.salamat-mebel.kz");
});

test("rejects duplicate site slugs", async () => {
  const db = createSitesMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };

  await createSite({
    db,
    env,
    payload: {
      name: "Kitchen Landing"
    }
  });
  const duplicate = await createSite({
    db,
    env,
    payload: {
      name: "Kitchen Landing"
    }
  });

  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, "site_slug_exists");
});

test("deploys a site through the VPS proxy and stores deployment status", async () => {
  const db = createSitesMockDb();
  const env = {
    RUNTIME_SCHEMA_INIT: "true",
    VPS_CONTROL_BASE_URL: "https://control.example.test",
    VPS_CONTROL_TOKEN: "secret"
  };
  const created = await createSite({
    db,
    env,
    payload: {
      name: "Wardrobe Landing",
      domain: "wardrobe.salamat-mebel.kz"
      ,brief: completeBrief()
    }
  });
  const fetchCalls = [];

  const deployed = await deploySite({
    db,
    env,
    siteId: created.body.item.id,
    payload: {
      sourceUrl: "https://assets.example.test/wardrobe.zip",
      dryRun: true
    },
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return jsonFetchResponse(200, {
        success: true,
        status: "dry_run_completed"
      });
    }
  });

  assert.equal(deployed.status, 200);
  assert.equal(deployed.body.item.status, "succeeded");
  assert.equal(deployed.body.item.dryRun, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(JSON.parse(fetchCalls[0].options.body).siteSlug, "wardrobe-landing");
  assert.equal(JSON.parse(fetchCalls[0].options.body).artifactType, "html");

  const status = await getSiteStatus({
    db,
    env,
    siteId: created.body.item.id
  });

  assert.equal(status.body.item.status, "published");
  assert.equal(status.body.item.latestDeployment.status, "succeeded");
  assert.equal(status.body.item.domain.sslStatus, "unknown");
});

test("generates an HTML landing artifact for a site", async () => {
  const db = createSitesMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };
  const created = await createSite({
    db,
    env,
    payload: {
      name: "Kitchen Landing",
      ownerName: "Salamat Mebel",
      domain: "kitchen.salamat-mebel.kz",
      templateKey: "kitchen"
      ,brief: completeBrief({ primaryOffer: "Кухни для вашего дома" })
    }
  });

  const artifact = await getSiteArtifact({
    db,
    env,
    siteId: created.body.item.id
  });

  assert.equal(artifact.status, 200);
  assert.match(artifact.body.html, /<!doctype html>/i);
  assert.match(artifact.body.html, /Kitchen Landing/);
  assert.match(artifact.body.html, /Salamat Mebel/);
  assert.match(artifact.body.html, /Кухни для вашего дома/);
});

test("updates structured landing content and renders exact artifact", async () => {
  const db = createSitesMockDb();
  const created = await createSite({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    payload: { name: "Editable Landing", brief: completeBrief() }
  });
  const updated = await updateSite({
    db,
    env: { RUNTIME_SCHEMA_INIT: "true" },
    siteId: created.body.item.id,
    payload: {
      templateKey: "wardrobe",
      brief: completeBrief({ primaryOffer: "Шкафы до потолка", accentColor: "#445566" })
    }
  });
  const artifact = await getSiteArtifact({ db, env: { RUNTIME_SCHEMA_INIT: "true" }, siteId: created.body.item.id });

  assert.equal(updated.body.item.templateKey, "wardrobe");
  assert.equal(updated.body.item.brief.primaryOffer, "Шкафы до потолка");
  assert.match(artifact.body.html, /Шкафы до потолка/);
  assert.match(artifact.body.html, /#445566/);
});

test("default deploy source points to the generated artifact endpoint", async () => {
  const db = createSitesMockDb();
  const env = {
    RUNTIME_SCHEMA_INIT: "true",
    VPS_CONTROL_BASE_URL: "https://control.example.test",
    VPS_CONTROL_TOKEN: "secret",
    PUBLIC_APP_ORIGIN: "https://platform.example.test"
  };
  const created = await createSite({
    db,
    env,
    payload: {
      name: "Default Artifact Landing"
      ,brief: completeBrief()
    }
  });
  const fetchCalls = [];

  const deployed = await deploySite({
    db,
    env,
    siteId: created.body.item.id,
    payload: {
      dryRun: false
    },
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return jsonFetchResponse(200, {
        success: true,
        data: { dryRun: false, artifactType: "html" }
      });
    }
  });

  const upstreamPayload = JSON.parse(fetchCalls[0].options.body);
  assert.equal(deployed.status, 200);
  assert.equal(upstreamPayload.sourceUrl, "https://platform.example.test/api/sites/1/artifact");
  assert.equal(upstreamPayload.dryRun, false);
  assert.equal(upstreamPayload.artifactType, "html");
});

test("failed VPS deploy marks site and deployment as failed", async () => {
  const db = createSitesMockDb();
  const env = { RUNTIME_SCHEMA_INIT: "true" };
  const created = await createSite({
    db,
    env,
    payload: {
      name: "Casework Landing"
      ,brief: completeBrief()
    }
  });

  const deployed = await deploySite({
    db,
    env,
    siteId: created.body.item.id,
    payload: {
      sourceUrl: "https://assets.example.test/casework.zip"
    }
  });

  assert.equal(deployed.status, 503);
  assert.equal(deployed.body.item.status, "failed");

  const status = await getSiteStatus({
    db,
    env,
    siteId: created.body.item.id
  });

  assert.equal(status.body.item.status, "failed");
  assert.equal(status.body.item.latestDeployment.status, "failed");
});

function createSitesMockDb() {
  const state = {
    sites: [],
    siteDomains: [],
    siteDeployments: []
  };

  state.prepare = (sql) => {
    const statement = createStatement(state, sql, []);
    return {
      bind: (...values) => createStatement(state, sql, values),
      run: statement.run,
      first: statement.first,
      all: statement.all
    };
  };

  return state;
}

function completeBrief(overrides = {}) {
  return {
    businessName: "Salamat Mebel",
    city: "Алматы",
    phone: "+77000000000",
    primaryOffer: "Мебель на заказ",
    ...overrides
  };
}

function createStatement(state, sql, values) {
  return {
    run: async () => {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE UNIQUE INDEX")) {
        return { success: true };
      }

      if (sql.includes("INSERT INTO sites")) {
        const [name, slug, ownerName, templateKey, status, contentJson] = values;
        const id = state.sites.length + 1;
        state.sites.push({
          id,
          name,
          slug,
          ownerName,
          templateKey,
          status,
          contentJson,
          createdAt: now(),
          updatedAt: now()
        });
        return { success: true, meta: { last_row_id: id } };
      }

      if (sql.includes("INSERT INTO site_domains")) {
        const [siteId, domain, sslStatus] = values;
        const id = state.siteDomains.length + 1;
        state.siteDomains.push({
          id,
          siteId,
          domain,
          sslStatus,
          isPrimary: 1,
          createdAt: now(),
          updatedAt: now()
        });
        return { success: true, meta: { last_row_id: id } };
      }

      if (sql.includes("INSERT INTO site_deployments")) {
        const [siteId, status, sourceUrl, targetPath, dryRun] = values;
        const id = state.siteDeployments.length + 1;
        state.siteDeployments.push({
          id,
          siteId,
          status,
          sourceUrl,
          targetPath,
          dryRun,
          upstreamStatus: null,
          responseJson: null,
          createdAt: now(),
          updatedAt: now()
        });
        return { success: true, meta: { last_row_id: id } };
      }

      if (sql.includes("UPDATE site_deployments")) {
        const [status, upstreamStatus, responseJson, deploymentId] = values;
        const deployment = state.siteDeployments.find((item) => item.id === deploymentId);
        if (deployment) {
          deployment.status = status;
          deployment.upstreamStatus = upstreamStatus;
          deployment.responseJson = responseJson;
          deployment.updatedAt = now();
        }
        return { success: true };
      }

      if (sql.includes("UPDATE sites") && sql.includes("SET name = ?")) {
        const [name, slug, ownerName, templateKey, contentJson, siteId] = values;
        const site = state.sites.find((item) => item.id === siteId);
        Object.assign(site, { name, slug, ownerName, templateKey, contentJson, updatedAt: now() });
        return { success: true };
      }

      if (sql.includes("UPDATE sites")) {
        const [status, siteId] = values;
        const site = state.sites.find((item) => item.id === siteId);
        if (site) {
          site.status = status;
          site.updatedAt = now();
        }
        return { success: true };
      }

      if (sql.includes("UPDATE site_domains")) {
        const [domain, sslStatus, domainId] = values;
        const record = state.siteDomains.find((item) => item.id === domainId);
        Object.assign(record, { domain, sslStatus, updatedAt: now() });
        return { success: true };
      }

      throw new Error(`Unexpected run SQL: ${sql}`);
    },
    first: async () => {
      if (sql.includes("SELECT id FROM sites WHERE slug = ?")) {
        const [slug, excludedId] = values;
        const site = state.sites.find((item) => item.slug === slug && item.id !== excludedId);
        return site ? { id: site.id } : null;
      }

      if (sql.includes("SELECT id FROM site_domains WHERE site_id = ?")) {
        const [siteId] = values;
        const domain = state.siteDomains.find((item) => item.siteId === siteId && item.isPrimary === 1);
        return domain ? { id: domain.id } : null;
      }

      if (sql.includes("FROM sites") && sql.includes("WHERE id = ?")) {
        const [siteId] = values;
        const site = state.sites.find((item) => item.id === siteId);
        return site ? { ...site } : null;
      }

      if (sql.includes("FROM site_deployments") && sql.includes("WHERE id = ?")) {
        const [deploymentId] = values;
        const deployment = state.siteDeployments.find((item) => item.id === deploymentId);
        return deployment ? { ...deployment } : null;
      }

      throw new Error(`Unexpected first SQL: ${sql}`);
    },
    all: async () => {
      if (sql.includes("FROM sites") && sql.includes("LEFT JOIN site_domains")) {
        return {
          results: state.sites
            .map((site) => {
              const domain = state.siteDomains.find((item) => item.siteId === site.id && item.isPrimary === 1);
              return {
                ...site,
                domain: domain?.domain || null,
                sslStatus: domain?.sslStatus || null,
                isPrimaryDomain: domain?.isPrimary || null
              };
            })
            .sort((a, b) => b.id - a.id)
        };
      }

      if (sql.includes("FROM site_domains")) {
        const [siteId] = values;
        return {
          results: state.siteDomains
            .filter((item) => item.siteId === siteId)
            .sort((a, b) => b.isPrimary - a.isPrimary || a.id - b.id)
            .map((item) => ({ ...item }))
        };
      }

      if (sql.includes("FROM site_deployments")) {
        const [siteId] = values;
        return {
          results: state.siteDeployments
            .filter((item) => item.siteId === siteId)
            .sort((a, b) => b.id - a.id)
            .map((item) => ({ ...item }))
        };
      }

      throw new Error(`Unexpected all SQL: ${sql}`);
    }
  };
}

function jsonFetchResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json"
    },
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

function now() {
  return "2026-05-31 10:00:00";
}
