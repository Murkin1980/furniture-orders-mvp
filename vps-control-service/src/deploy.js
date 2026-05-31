import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { appendDeployLog } from './logs.js';
import { validateSiteSlug, validateSourceUrl } from './validation.js';

export function handleDeploy(config, payload) {
  const rawSlug = (payload.siteSlug || '').trim();
  const sourceUrl = (payload.sourceUrl || '').trim();
  const dryRun = payload.dryRun !== false;

  const slugResult = validateSiteSlug(rawSlug);
  if (!slugResult.valid) {
    return errorResponse('validation_error', slugResult.error, ['siteSlug']);
  }

  const siteSlug = rawSlug.toLowerCase();

  const urlResult = validateSourceUrl(sourceUrl, config.allowedSourceHosts);
  if (!urlResult.valid) {
    return errorResponse('validation_error', urlResult.error, ['sourceUrl']);
  }

  const targetDir = join(config.sitesDir, siteSlug);
  const stagingDir = join(config.stagingDir, siteSlug);

  const resolvedTarget = resolve(targetDir);
  const resolvedSitesBase = resolve(config.sitesDir);
  if (!resolvedTarget.startsWith(resolvedSitesBase)) {
    return errorResponse('validation_error', 'Path traversal detected for siteSlug.', ['siteSlug']);
  }

  const resolvedStaging = resolve(stagingDir);
  const resolvedStagingBase = resolve(config.stagingDir);
  if (!resolvedStaging.startsWith(resolvedStagingBase)) {
    return errorResponse('validation_error', 'Path traversal detected for staging path.', ['siteSlug']);
  }

  const deployId = randomUUID();

  const logEntry = {
    time: new Date().toISOString(),
    event: dryRun ? 'deploy_dry_run' : 'deploy_started',
    siteSlug,
    status: 'success',
    source: 'cloudflare-admin-proxy',
    deployId,
  };

  try {
    appendDeployLog(config.logDir, logEntry);
  } catch {
    // non-fatal
  }

  if (dryRun) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          deployId,
          siteSlug,
          dryRun: true,
          plan: {
            sourceUrl,
            targetDir,
            stagingDir,
            steps: [
              'validate payload',
              'download artifact from allowed source',
              'unpack to staging directory',
              'verify index.html exists',
              'atomically replace site directory',
              'reload webserver',
              'write audit log',
            ],
          },
        },
      },
    };
  }

  return {
    status: 501,
    body: {
      success: false,
      error: 'deploy_not_implemented',
      message: 'Real deploy is not implemented in this MVP. Use dryRun first.',
    },
  };
}

function errorResponse(error, message, fields) {
  return {
    status: 400,
    body: {
      success: false,
      error,
      message,
      fields,
    },
  };
}
