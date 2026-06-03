import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, renameSync, writeFileSync } from 'node:fs';
import { appendAuditLog } from './logs.js';
import { validateSiteSlug, validateSourceUrl } from './validation.js';

export async function handleDeploy(config, payload) {
  const rawSlug = (payload.siteSlug || '').trim();
  const sourceUrl = (payload.sourceUrl || '').trim();
  const dryRun = payload.dryRun !== false;
  const artifactType = (payload.artifactType || 'html').trim().toLowerCase();

  const slugResult = validateSiteSlug(rawSlug);
  if (!slugResult.valid) {
    return errorResponse('validation_error', slugResult.error, ['siteSlug']);
  }

  const siteSlug = rawSlug.toLowerCase();

  const urlResult = validateSourceUrl(sourceUrl, config.allowedSourceHosts);
  if (!urlResult.valid) {
    return errorResponse('validation_error', urlResult.error, ['sourceUrl']);
  }

  if (artifactType !== 'html') {
    return errorResponse('validation_error', 'artifactType must be html.', ['artifactType']);
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
    appendAuditLog(config.logDir, logEntry);
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
              'write HTML artifact to staging index.html',
              'verify index.html exists',
              'atomically replace site directory',
              'write audit log',
            ],
          },
        },
      },
    };
  }

  return deployHtmlArtifact({
    config,
    sourceUrl,
    targetDir,
    stagingDir,
    siteSlug,
    deployId,
  });
}

async function deployHtmlArtifact({ config, sourceUrl, targetDir, stagingDir, siteSlug, deployId }) {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return errorResponse('artifact_download_failed', `Artifact download failed with status ${response.status}.`, ['sourceUrl'], 502);
    }

    const html = await response.text();
    if (!isHtmlArtifact(html)) {
      return errorResponse('artifact_invalid', 'Artifact must be an HTML document.', ['sourceUrl'], 400);
    }

    rmSync(stagingDir, { recursive: true, force: true });
    mkdirSync(stagingDir, { recursive: true });
    writeFileSync(join(stagingDir, 'index.html'), html, 'utf8');

    rmSync(targetDir, { recursive: true, force: true });
    mkdirSync(resolve(targetDir, '..'), { recursive: true });
    renameSync(stagingDir, targetDir);

    const logEntry = {
      time: new Date().toISOString(),
      event: 'deploy_completed',
      siteSlug,
      status: 'success',
      source: 'cloudflare-admin-proxy',
      deployId,
      targetDir,
    };

    try {
      appendAuditLog(config.logDir, logEntry);
    } catch {
      // non-fatal
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          deployId,
          siteSlug,
          dryRun: false,
          artifactType: 'html',
          targetDir,
          indexPath: join(targetDir, 'index.html'),
        },
      },
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        success: false,
        error: 'deploy_failed',
        message: error?.message || 'Deploy failed.',
      },
    };
  }
}

function isHtmlArtifact(value) {
  const html = String(value || '').trim().toLowerCase();
  return html.startsWith('<!doctype html') || html.startsWith('<html');
}

function errorResponse(error, message, fields, status = 400) {
  return {
    status,
    body: {
      success: false,
      error,
      message,
      fields,
    },
  };
}
