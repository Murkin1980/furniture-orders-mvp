import { execFile } from 'node:child_process';

const ALLOWED_SERVICES = ['nginx', 'caddy', 'furniture-vps-control'];

const RELOAD_COMMANDS = {
  nginx: { cmd: 'sudo', args: ['/bin/systemctl', 'reload', 'nginx'] },
  caddy: { cmd: 'sudo', args: ['/bin/systemctl', 'reload', 'caddy'] },
};

const STATUS_COMMANDS = {
  nginx: { cmd: 'systemctl', args: ['is-active', 'nginx'] },
  caddy: { cmd: 'systemctl', args: ['is-active', 'caddy'] },
  'furniture-vps-control': { cmd: 'systemctl', args: ['is-active', 'furniture-vps-control'] },
};

function execAllowlisted(cmd, args, timeout) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout }, (error, stdout) => {
      if (error) {
        resolve({ success: false, error: error.message });
        return;
      }
      resolve({ success: true, stdout: stdout.toString().trim() });
    });
  });
}

export async function getServiceStatus(name) {
  const entry = STATUS_COMMANDS[name];
  if (!entry) {
    return { name, status: 'unknown' };
  }

  const result = await execAllowlisted(entry.cmd, entry.args, 5000);
  if (!result.success) {
    return { name, status: 'unknown' };
  }

  return { name, status: result.stdout };
}

export async function getAllServiceStatuses() {
  const results = await Promise.all(
    ALLOWED_SERVICES.map((name) => getServiceStatus(name))
  );
  return results;
}

export async function reloadWebserver(name) {
  const entry = RELOAD_COMMANDS[name];
  if (!entry) {
    return { success: false, error: `Unsupported webserver: ${name}` };
  }

  const result = await execAllowlisted(entry.cmd, entry.args, 10000);
  if (!result.success) {
    return { success: false, error: `Failed to reload ${name}: ${result.error}` };
  }

  return { success: true };
}
