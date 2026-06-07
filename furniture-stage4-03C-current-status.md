# Stage 4.03C Current Status

Date: 2026-06-02

## Current Goal

Install/update the Ubuntu-side `vps-control-service` on the real VPS and connect it to the Cloudflare Pages production app so live landing deploy can work from the admin panel.

## Completed In This Pass

- Read `furniture-stage4-03C-ops-checklist.md`.
- Verified `vps-control-service` source is present in the repo.
- Verified `vps-control-service/examples/furniture-vps-control.env.example`.
- Ran service syntax check successfully:
  - `npm.cmd --prefix vps-control-service run check`
- Ran service tests successfully:
  - `npm.cmd --prefix vps-control-service test`
  - Result: 19 tests passing.
- Checked Cloudflare Pages secrets by name:
  - Present: `ADMIN_TOKEN`
  - Missing/not listed: `VPS_CONTROL_BASE_URL`, `VPS_CONTROL_TOKEN`, `PUBLIC_APP_ORIGIN`
- Prepared a VPS upload package:
  - `output/vps-control-service-stage4-03C.zip`

## Blockers

Real Stage 4.03C completion requires values/access that are not in the repo:

- SSH/VPS access host and user.
- Public HTTPS URL for the VPS control service.
- A shared `VPS_CONTROL_TOKEN` value for both `/etc/furniture-control.env` and Cloudflare Pages.
- Confirmation of webserver: `nginx` or `caddy`.
- Confirmation of target sites directory, default `/srv/sites`.

## Next Commands On Ubuntu VPS

After uploading/extracting `vps-control-service-stage4-03C.zip`:

```bash
cd vps-control-service
sudo bash scripts/install-systemd.sh
sudo nano /etc/furniture-control.env
sudo systemctl daemon-reload
sudo systemctl enable furniture-vps-control
sudo systemctl restart furniture-vps-control
sudo systemctl status furniture-vps-control --no-pager
```

Required `/etc/furniture-control.env` values:

```bash
VPS_CONTROL_TOKEN=<secure-random-token>
VPS_CONTROL_HOST=127.0.0.1
VPS_CONTROL_PORT=8789
VPS_CONTROL_WEBSERVER=nginx
VPS_CONTROL_SITES_DIR=/srv/sites
VPS_CONTROL_STAGING_DIR=/srv/deploy-staging
VPS_CONTROL_LOG_DIR=/var/log/furniture-control
VPS_CONTROL_MAX_BODY_BYTES=262144
VPS_CONTROL_ALLOWED_SOURCE_HOSTS=furniture-orders-mvp.pages.dev
```

## Next Cloudflare Steps

Set production Pages values:

```bash
VPS_CONTROL_BASE_URL=https://<public-vps-control-host>
VPS_CONTROL_TOKEN=<same-token-as-vps>
PUBLIC_APP_ORIGIN=https://furniture-orders-mvp.pages.dev
```

## Do Not Commit Without User Decision

- Secret token values.
- Local SSH config or private keys.
- Temporary VPS archives unless the user wants the package tracked in git.
