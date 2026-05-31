import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../src/server.js';

const TOKEN = 'test-token-for-vps-control';

function request(baseUrl, method, path, opts = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const headers = {};

    if (opts.token !== false) {
      headers['Authorization'] = `Bearer ${opts.token || TOKEN}`;
    }

    if (opts.body || opts.rawBody) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { /* keep null */ }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    if (opts.rawBody) {
      req.write(opts.rawBody);
    } else if (opts.body) {
      req.write(JSON.stringify(opts.body));
    }

    req.end();
  });
}

describe('VPS Control Service', () => {
  let server;
  let baseUrl;
  let tempDir;
  let app;

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'vps-control-test-'));
    mkdirSync(join(tempDir, 'logs'), { recursive: true });

    app = createApp({
      token: TOKEN,
      host: '127.0.0.1',
      port: 0,
      logDir: join(tempDir, 'logs'),
      sitesDir: join(tempDir, 'sites'),
      stagingDir: join(tempDir, 'staging'),
      allowedSourceHosts: ['github.com', 'raw.githubusercontent.com', 'example.com'],
    });

    server = app.server;

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(() => {
    if (server) server.close();
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ok */ }
  });

  it('missing token returns 401', async () => {
    const res = await request(baseUrl, 'GET', '/health', { token: false });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'unauthorized');
  });

  it('invalid token returns 401', async () => {
    const res = await request(baseUrl, 'GET', '/health', { token: 'wrong-token' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'unauthorized');
  });

  it('/health returns service data with valid token', async () => {
    const res = await request(baseUrl, 'GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'furniture-vps-control');
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.version, '0.1.0');
    assert.ok(typeof res.body.data.uptimeSec === 'number');
    assert.ok(typeof res.body.data.time === 'string');
  });

  it('siteSlug validation rejects unsafe values', async () => {
    const unsafeSlugs = [
      '',
      '../etc/passwd',
      'site with spaces',
      'UPPERCASE',
      'special!chars',
      'a'.repeat(64),
      'a/b',
      '.hidden',
      '-leading-hyphen',
    ];

    for (const slug of unsafeSlugs) {
      const res = await request(baseUrl, 'POST', '/deploy/site', {
        body: { siteSlug: slug, sourceUrl: 'https://example.com/site.zip' },
      });
      assert.equal(res.status, 400, `slug "${slug}" should be rejected`);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'validation_error');
    }
  });

  it('sourceUrl validation rejects non-HTTP URLs', async () => {
    const badUrls = [
      'ftp://example.com/site.zip',
      'file:///tmp/site.zip',
      'not-a-url',
      '',
    ];

    for (const url of badUrls) {
      const res = await request(baseUrl, 'POST', '/deploy/site', {
        body: { siteSlug: 'test-site', sourceUrl: url },
      });
      assert.equal(res.status, 400, `url "${url}" should be rejected`);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'validation_error');
    }
  });

  it('sourceUrl validation rejects non-allowlisted hosts', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      body: { siteSlug: 'test-site', sourceUrl: 'https://evil.com/site.zip' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'validation_error');
    assert.ok(res.body.message.includes('example.com'));
  });

  it('reload rejects unsupported webserver', async () => {
    const res = await request(baseUrl, 'POST', '/reload/webserver', {
      body: { webserver: 'apache' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'validation_error');
    assert.equal(res.body.fields[0], 'webserver');
  });

  it('logs endpoint returns empty array if log file does not exist', async () => {
    const res = await request(baseUrl, 'GET', '/deploy/logs');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.logs, []);
  });

  it('deploy dry-run does not modify filesystem', async () => {
    const sitesBefore = existsSync(join(tempDir, 'sites', 'test-site'));
    const stagingBefore = existsSync(join(tempDir, 'staging', 'test-site'));

    const res = await request(baseUrl, 'POST', '/deploy/site', {
      body: {
        siteSlug: 'test-site',
        sourceUrl: 'https://example.com/site.zip',
        dryRun: true,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.dryRun, true);
    assert.ok(res.body.data.deployId);
    assert.equal(res.body.data.siteSlug, 'test-site');

    const sitesAfter = existsSync(join(tempDir, 'sites', 'test-site'));
    const stagingAfter = existsSync(join(tempDir, 'staging', 'test-site'));

    assert.equal(sitesAfter, sitesBefore, 'should not create site directory');
    assert.equal(stagingAfter, stagingBefore, 'should not create staging directory');
  });

  it('deploy dry-run is default (when dryRun not specified)', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      body: {
        siteSlug: 'another-site',
        sourceUrl: 'https://github.com/site.zip',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.dryRun, true);
  });

  it('deploy without dryRun returns 501', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      body: {
        siteSlug: 'test-site',
        sourceUrl: 'https://example.com/site.zip',
        dryRun: false,
      },
    });

    assert.equal(res.status, 501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'deploy_not_implemented');
  });

  it('logs limit is bounded', async () => {
    // First make a deploy call to create some log entries
    await request(baseUrl, 'POST', '/deploy/site', {
      body: { siteSlug: 'log-test', sourceUrl: 'https://example.com/site.zip', dryRun: true },
    });
    await request(baseUrl, 'POST', '/deploy/site', {
      body: { siteSlug: 'log-test', sourceUrl: 'https://example.com/site2.zip', dryRun: true },
    });

    const res = await request(baseUrl, 'GET', '/deploy/logs?siteSlug=log-test&limit=1');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.logs));
    assert.equal(res.body.data.logs.length, 1);
  });

  it('GET /services returns services array', async () => {
    const res = await request(baseUrl, 'GET', '/services');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.services));
    assert.ok(res.body.data.services.length > 0);
    assert.ok(res.body.data.services.every(s => s.name && s.status));
  });

  it('unknown endpoint returns 404', async () => {
    const res = await request(baseUrl, 'GET', '/nonexistent');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'not_found');
  });

  it('logs endpoint without auth returns 401', async () => {
    const res = await request(baseUrl, 'GET', '/deploy/logs', { token: false });
    assert.equal(res.status, 401);
  });

  it('deploy endpoint without siteSlug returns 400', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      body: { sourceUrl: 'https://example.com/site.zip' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'validation_error');
  });

  it('unauthorized POST returns 401 before reading a large body', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      token: false,
      rawBody: JSON.stringify({ padding: 'x'.repeat(300000) }),
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'unauthorized');
  });

  it('authorized POST rejects oversized body', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      rawBody: JSON.stringify({ padding: 'x'.repeat(300000) }),
    });

    assert.equal(res.status, 413);
    assert.equal(res.body.error, 'payload_too_large');
  });

  it('authorized POST rejects invalid JSON', async () => {
    const res = await request(baseUrl, 'POST', '/deploy/site', {
      rawBody: '{not-json',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'invalid_json');
  });
});
