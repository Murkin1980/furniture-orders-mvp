# LC Slice 6 WIP handoff

Date: 2026-06-10

## Status

Superseded by `furniture-lc-slice6-implementation-summary.md`.

The production publishing path is verified end-to-end. Remaining follow-ups are SSL secondary validation and the intentionally blocked nginx reload operation.

## Original goal

Finish VPS/domain/SSL/live-publish operational verification for landing sites.

## Completed

- SSH key access works:
  - user: `ubuntu`
  - host: `194.32.140.229`
  - key: `C:\Users\Мурат\.ssh\furniture_vps_ed25519`
- Existing Furniture AI service on port `3000` and nginx IP site were left untouched.
- Installed `vps-control-service` under `/opt/furniture-control`.
- Enabled `furniture-vps-control.service` on `127.0.0.1:8789`.
- Created a strong shared token and configured it on VPS and Cloudflare Pages.
- Configured HTTPS reverse proxy:
  - `https://control.194-32-140-229.nip.io`
  - Let's Encrypt certificate expires `2026-09-08`; automatic renewal enabled.
- Configured Pages production values:
  - `VPS_CONTROL_TOKEN`
  - `VPS_CONTROL_BASE_URL`
  - `PUBLIC_APP_ORIGIN`
- Redeployed Pages:
  - `https://99a14771.furniture-orders-mvp.pages.dev`
- External authenticated health and services requests passed.
- Real HTML deploy smoke passed:
  - slug: `lc6-smoke`
  - file: `/srv/sites/lc6-smoke/index.html`

## Important operational finding

Initial live deploy failed with:

```text
EXDEV: cross-device link not permitted
```

Cause: systemd `ReadWritePaths` isolated `/srv/deploy-staging` and `/srv/sites` as separate mounts, preventing atomic rename.

Applied safe VPS configuration fix:

```text
VPS_CONTROL_STAGING_DIR=/srv/sites/.staging
```

No application code change was required.

## Remaining checks

- Verify production Pages admin proxy `/api/vps/health`, `/services`, deploy logs, and reload using the admin token.
- Create a real landing site in production and publish its generated artifact through the admin UI.
- Configure a customer landing hostname/SSL and nginx site mapping to `/srv/sites/<slug>`.
- Decide whether to keep temporary `nip.io` control hostname or replace it with an owned domain.
- Update README, PROJECT_PROGRESS, SESSION_NOTES, and reviewer summary after final verification.

## Exact next commands

```powershell
ssh -i "$HOME\.ssh\furniture_vps_ed25519" ubuntu@194.32.140.229
```

```bash
systemctl status furniture-vps-control --no-pager
sudo nginx -t
sudo certbot renew --dry-run
sudo tail -n 30 /var/log/furniture-control/deploy.jsonl
test -s /srv/sites/lc6-smoke/index.html
```

## Do not commit

- SSH private key.
- VPS control token.
- Passwords.
- Existing local instruction/handoff files unless explicitly selected.
