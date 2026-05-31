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

export function createConfig(overrides = {}) {
  const token = overrides.token || str('VPS_CONTROL_TOKEN');
  if (!token) {
    throw new Error('VPS_CONTROL_TOKEN is required');
  }

  return {
    host: overrides.host || str('VPS_CONTROL_HOST', '127.0.0.1'),
    port: overrides.port !== undefined ? overrides.port : int('VPS_CONTROL_PORT', 8789),
    token,
    webserver: str('VPS_CONTROL_WEBSERVER', 'nginx'),
    sitesDir: overrides.sitesDir || str('VPS_CONTROL_SITES_DIR', '/srv/sites'),
    stagingDir: overrides.stagingDir || str('VPS_CONTROL_STAGING_DIR', '/srv/deploy-staging'),
    logDir: overrides.logDir || str('VPS_CONTROL_LOG_DIR', '/var/log/furniture-control'),
    maxBodyBytes: overrides.maxBodyBytes || int('VPS_CONTROL_MAX_BODY_BYTES', 262144),
    allowedSourceHosts: overrides.allowedSourceHosts || (
      str('VPS_CONTROL_ALLOWED_SOURCE_HOSTS', 'github.com,raw.githubusercontent.com,example.com')
        .split(',')
        .map(h => h.trim())
        .filter(Boolean)
    ),
  };
}
