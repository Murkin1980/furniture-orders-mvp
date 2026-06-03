import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const sepIndex = trimmed.indexOf('=');
      if (sepIndex === -1) continue;
      const key = trimmed.slice(0, sepIndex).trim();
      const value = trimmed.slice(sepIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional
  }
}

loadEnvFile();

function str(name, fallback) {
  return process.env[name] || fallback;
}

function int(name, fallback) {
  const val = parseInt(process.env[name], 10);
  return Number.isFinite(val) ? val : fallback;
}

const ALLOWED_WEBSERVERS = new Set(['nginx', 'caddy']);

export function createConfig(overrides = {}) {
  const token = overrides.token || str('VPS_CONTROL_TOKEN');
  if (!token) {
    throw new Error('VPS_CONTROL_TOKEN is required');
  }
  if (token.length < 8) {
    throw new Error('VPS_CONTROL_TOKEN must be at least 8 characters.');
  }

  const port = overrides.port !== undefined ? overrides.port : int('VPS_CONTROL_PORT', 8789);
  if (!Number.isFinite(port) || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('VPS_CONTROL_PORT must be an integer between 0 and 65535.');
  }

  const host = overrides.host || str('VPS_CONTROL_HOST', '127.0.0.1');
  if (!host) {
    throw new Error('VPS_CONTROL_HOST must be a non-empty string.');
  }

  const webserver = str('VPS_CONTROL_WEBSERVER', 'nginx');
  if (!ALLOWED_WEBSERVERS.has(webserver)) {
    throw new Error('VPS_CONTROL_WEBSERVER must be "nginx" or "caddy".');
  }

  const sitesDir = overrides.sitesDir || str('VPS_CONTROL_SITES_DIR', '/srv/sites');
  const stagingDir = overrides.stagingDir || str('VPS_CONTROL_STAGING_DIR', '/srv/deploy-staging');
  const logDir = overrides.logDir || str('VPS_CONTROL_LOG_DIR', '/var/log/furniture-control');
  for (const [name, dir] of [['VPS_CONTROL_SITES_DIR', sitesDir], ['VPS_CONTROL_STAGING_DIR', stagingDir], ['VPS_CONTROL_LOG_DIR', logDir]]) {
    if (!dir) {
      throw new Error(`${name} must be a non-empty string.`);
    }
  }

  const allowedSourceHosts = overrides.allowedSourceHosts || (
    str('VPS_CONTROL_ALLOWED_SOURCE_HOSTS', 'github.com,raw.githubusercontent.com,example.com')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean)
  );
  if (!Array.isArray(allowedSourceHosts) || allowedSourceHosts.length === 0) {
    throw new Error('VPS_CONTROL_ALLOWED_SOURCE_HOSTS must contain at least one host.');
  }

  return {
    host,
    port,
    token,
    webserver,
    sitesDir,
    stagingDir,
    logDir,
    maxBodyBytes: overrides.maxBodyBytes || int('VPS_CONTROL_MAX_BODY_BYTES', 262144),
    allowedSourceHosts,
  };
}
