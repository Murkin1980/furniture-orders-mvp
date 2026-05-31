import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function appendDeployLog(logDir, entry) {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const logPath = join(logDir, 'deploy.jsonl');
  entry.time = entry.time || new Date().toISOString();

  appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
}

export function readDeployLogs(logDir, siteSlug, limit) {
  const logPath = join(logDir, 'deploy.jsonl');

  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  const entries = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (siteSlug && entry.siteSlug !== siteSlug) continue;
      entries.push(entry);
    } catch {
      // skip malformed lines
    }
  }

  return entries.slice(-limit);
}
