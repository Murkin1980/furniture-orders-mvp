import test from "node:test";
import assert from "node:assert/strict";
import {
  deployVpsSite,
  getVpsDeployLogs,
  getVpsHealth,
  getVpsServices,
  reloadVpsWebserver
} from "../src/vps-control.js";

const configuredEnv = {
  VPS_CONTROL_BASE_URL: "https://vps-control.example.com",
  VPS_CONTROL_TOKEN: "secret"
};

test("vps control returns 503 when env is not configured", async () => {
  const result = await getVpsHealth({
    env: {},
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.error, "vps_control_not_configured");
});

test("vps health proxies to configured control API with bearer token", async () => {
  const calls = [];
  const result = await getVpsHealth({
    env: configuredEnv,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ status: "ok" });
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.status, "ok");
  assert.equal(calls[0].url, "https://vps-control.example.com/health");
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret");
});

test("vps services proxies upstream service list", async () => {
  const result = await getVpsServices({
    env: configuredEnv,
    fetchImpl: async () => jsonResponse({ services: [{ name: "nginx", status: "active" }] })
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.data.services[0].name, "nginx");
});

test("vps deploy validates payload before proxying", async () => {
  const result = await deployVpsSite({
    env: configuredEnv,
    payload: {
      sourceUrl: "not-a-url"
    },
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body.fields.map((field) => field.field), ["siteSlug", "sourceUrl"]);
});

test("vps deploy sends normalized dry-run payload", async () => {
  const calls = [];
  const result = await deployVpsSite({
    env: configuredEnv,
    payload: {
      siteSlug: " Test Site ",
      sourceUrl: "https://example.com/site.zip",
      targetPath: "/var/www/test-site"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ deployId: "deploy-1" });
    }
  });

  assert.equal(result.status, 200);
  assert.equal(calls[0].url, "https://vps-control.example.com/deploy/site");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    siteSlug: "test-site",
    sourceUrl: "https://example.com/site.zip",
    targetPath: "/var/www/test-site",
    dryRun: true
  });
});

test("vps webserver reload validates supported webservers", async () => {
  const invalid = await reloadVpsWebserver({
    env: configuredEnv,
    payload: { webserver: "apache" }
  });
  const valid = await reloadVpsWebserver({
    env: configuredEnv,
    payload: { webserver: "caddy" },
    fetchImpl: async () => jsonResponse({ reloaded: true })
  });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.fields[0].field, "webserver");
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.reloaded, true);
});

test("vps deploy logs include site slug and bounded limit", async () => {
  const calls = [];
  await getVpsDeployLogs({
    env: configuredEnv,
    query: {
      siteSlug: "Test Site",
      limit: "999"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ logs: [] });
    }
  });

  assert.equal(calls[0].url, "https://vps-control.example.com/deploy/logs?siteSlug=test-site&limit=200");
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
