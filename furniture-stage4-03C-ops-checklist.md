# Furniture Orders MVP - Stage 4.03C VPS operational checklist

Date: 2026-06-01

## Goal

Update/install the Ubuntu-side `vps-control-service` on the real VPS so Stage 4.04B live HTML landing deploy can run from the production admin.

## Current Code State

- App commit with live HTML deploy path: `2033d2d stage4: add live landing artifact deploy`.
- Production app: `https://furniture-orders-mvp.pages.dev`.
- Generated artifact endpoint: `GET /api/sites/:id/artifact`.
- VPS service now supports `POST /deploy/site` with:
  - `dryRun: true` for plan-only deploy;
  - `dryRun: false` plus `artifactType: "html"` for live single-file HTML deploy.

## Required VPS Environment

`/etc/furniture-control.env` should include:

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

If preview deploy URLs will be used for tests, add the preview host too, for example:

```bash
VPS_CONTROL_ALLOWED_SOURCE_HOSTS=furniture-orders-mvp.pages.dev,12345168.furniture-orders-mvp.pages.dev
```

## Required Cloudflare Pages Variables

Production Pages project must have:

```bash
VPS_CONTROL_BASE_URL=https://<public-vps-control-host>
VPS_CONTROL_TOKEN=<same-token-as-vps>
PUBLIC_APP_ORIGIN=https://furniture-orders-mvp.pages.dev
```

`PUBLIC_APP_ORIGIN` is optional in code because it defaults to `https://furniture-orders-mvp.pages.dev`, but setting it explicitly is recommended for operational clarity.

## VPS Install/Update Commands

Run on Ubuntu VPS from the repo or uploaded `vps-control-service/` directory:

```bash
cd vps-control-service
sudo bash scripts/install-systemd.sh
sudo nano /etc/furniture-control.env
sudo systemctl daemon-reload
sudo systemctl enable furniture-vps-control
sudo systemctl restart furniture-vps-control
sudo systemctl status furniture-vps-control --no-pager
```

If nginx/caddy reload is needed later, add the sudoers rule shown in `vps-control-service/README.md`.

## VPS Smoke Commands

Run on Ubuntu VPS:

```bash
export VPS_CONTROL_BASE_URL=http://127.0.0.1:8789
export VPS_CONTROL_TOKEN=<secure-random-token>
bash scripts/smoke-test.sh
```

Manual live HTML deploy smoke:

```bash
curl -sS -X POST "$VPS_CONTROL_BASE_URL/deploy/site" \
  -H "Authorization: Bearer $VPS_CONTROL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteSlug": "stage4-smoke",
    "sourceUrl": "https://furniture-orders-mvp.pages.dev/api/sites/1/artifact",
    "targetPath": "/srv/sites/stage4-smoke",
    "artifactType": "html",
    "dryRun": false
  }'
```

Then verify:

```bash
test -f /srv/sites/stage4-smoke/index.html
sudo tail -n 20 /var/log/furniture-control/deploy.jsonl
```

## Production Admin Smoke

After VPS and Cloudflare env variables are configured:

1. Open `https://furniture-orders-mvp.pages.dev/admin`.
2. Enter admin token.
3. Create or select a landing site.
4. Click `Publish live`.
5. Verify status becomes `published`.
6. Check VPS site directory contains `index.html`.
7. Check deploy logs via admin VPS logs or `/deploy/logs`.

## Blockers In This Session

- No SSH/VPS shell access was available from this Codex session.
- `VPS_CONTROL_TOKEN` and the public VPS control URL are secrets/ops values and cannot be inferred safely from the repo.

