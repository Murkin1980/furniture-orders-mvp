# Landing VPS Operations Runbook

Last verified: 2026-06-12

This runbook records the production landing path, failures found during LC
Slice 6, and verified solutions. Read it before changing Pages, D1, nginx, VPS
control, DNS, or customer landing SSL.

## Verified Production Path

- Platform: `https://furniture-orders-mvp.pages.dev`
- VPS: `194.32.140.229`
- VPS user: `ubuntu`
- VPS control: `https://control.194-32-140-229.nip.io`
- Public demo: `https://demo.salamat-mebel.kz`
- Demo directory: `/srv/sites/lc6-production-landing`
- Demo platform site ID: `1`
- Demo platform slug: `lc6-production-landing`

```text
Cloudflare Pages admin/API
-> VPS control service
-> /srv/sites/.staging
-> /srv/sites/<site-slug>/index.html
-> exact nginx virtual host
-> Cloudflare proxied customer domain
```

`demo.salamat-mebel.kz` has dedicated HTTP and HTTPS nginx virtual hosts. Its
origin certificate is a hostname-matching self-signed certificate. Cloudflare
SSL mode `Full` accepts it and public HTTPS is verified.

Preferred future hardening: install a Cloudflare Origin Certificate and switch
the zone to `Full (strict)`.

## VPS Access

Run Linux commands only after connecting to the VPS:

```powershell
ssh -i "$HOME\.ssh\furniture_vps_ed25519" ubuntu@194.32.140.229
```

Running `sudo` directly in Windows PowerShell produces "`sudo` is not
recognized". This is expected because `sudo` is a Linux command.

## Current Operational Status

As of 2026-06-12, the Cloudflare Pages application, production D1 migrations,
and R2 buckets are available. The VPS path is degraded:

- production `/api/vps/health`, `/api/vps/services`, and deploy logs return
  `502 vps_control_unreachable`;
- direct SSH to `194.32.140.229` times out;
- the PS.kz panel could not be inspected from the automated browser because
  the environment network policy blocks that console.

Do not retry deploy/reload operations in a loop while the node is unreachable.
Inspect the VPS state in the provider panel manually. If it is stopped, obtain
explicit approval before starting it. If it is running, use VNC/provider
console to verify networking, `sshd`, nginx, and `furniture-vps-control`, then
repeat one health/services/deploy-log check.

## Known Problems And Verified Solutions

### Duplicate Cloudflare Pages projects

Symptom: both `furniture-orders-mvp` and `furniture-orders-mvp-2` appear.

Cause: the intentional Wrangler-managed project and an accidental Git-connected
auto-deploy project existed together.

Resolution: keep `furniture-orders-mvp`; verify the duplicate has no required
domains or bindings, then delete only `furniture-orders-mvp-2`. There was no
matching GitHub repository to delete.

Prevention: inspect existing Pages projects and confirm whether Wrangler or Git
integration owns production before creating another project.

### Local D1 migration replay fails on an existing column

Cause: local D1 migration history and local schema state are out of sync.

Resolution: do not infer production state from a broken local replay. Audit the
remote migration list and schema, export production before mutation, and apply
only confirmed pending migrations. Use an isolated clean local D1 database for
migration-chain QA.

### VPS deploy fails with EXDEV

Symptom: deploy fails with `cross-device link not permitted`.

Cause: systemd `ReadWritePaths` isolation placed `/srv/deploy-staging` and
`/srv/sites` on different mount boundaries.

Resolution:

```text
VPS_CONTROL_STAGING_DIR=/srv/sites/.staging
```

Restart the VPS control service and verify a real deploy.

### Services unknown and reload returns 500

Cause: `NoNewPrivileges=true` prevents sudo privilege escalation.

Decision: preserve `NoNewPrivileges=true`. Do not weaken systemd security merely
to enable remote nginx reload. Normal single-file HTML deploy does not require
reload.

### Let's Encrypt secondary validation times out

Primary ACME validators reached nginx and received HTTP 200, but secondary
validation timed out for `nip.io`, `sslip.io`, and the customer domain.

Resolution used: proxy the customer domain through Cloudflare and encrypt the
origin connection. Preferred production state is a Cloudflare Origin
Certificate plus `Full (strict)`.

### HTTPS opens the VPS control-service 404

Cause: no exact HTTPS nginx virtual host existed for the customer domain, so
nginx selected the control-service default SSL host.

Resolution: create a dedicated `listen 443 ssl` server block with the exact
customer `server_name`, correct site root, and matching origin certificate.

Verify origin SNI before testing through Cloudflare:

```bash
curl -kfsSI --resolve demo.salamat-mebel.kz:443:127.0.0.1 https://demo.salamat-mebel.kz/
```

### Windows reports NXDOMAIN after DNS creation

Cause: Windows or ISP resolver negative DNS cache.

Resolution: verify with public resolvers and explicit edge IPs before waiting
for local cache refresh:

```powershell
Resolve-DnsName demo.salamat-mebel.kz -Server 1.1.1.1
Resolve-DnsName demo.salamat-mebel.kz -Server 8.8.8.8
curl.exe --resolve demo.salamat-mebel.kz:443:104.21.80.196 https://demo.salamat-mebel.kz/
```

### Cyrillic smoke data becomes question marks

Cause: the PowerShell request path did not preserve UTF-8 encoding.

Resolution: use ASCII smoke values for infrastructure checks or a UTF-8-safe
request tool for real Cyrillic customer data.

### Cloudflare CSR form says CSR is empty

Resolution used after repeated dashboard failure: create a hostname-matching
self-signed origin certificate and keep Cloudflare in `Full` mode.

Do not switch to `Full (strict)` until a trusted or Cloudflare Origin
Certificate is installed.

### Retiring the trial furniture-ai-agent service

The standalone `Murkin1980/furniture-ai-agent` repository was a trial service,
not a required platform component. It was archived; its PM2 process, nginx
site, files, secrets, and temporary backup were removed. Port `3000` was
verified closed. The main platform AI modules remain in this repository.

## Standard Customer Landing Procedure

1. Create and validate the landing in `furniture-orders-mvp`.
2. Confirm the selected calculator is published and its embed works.
3. Deploy the generated artifact through the admin/API path.
4. Confirm `/srv/sites/<site-slug>/index.html` exists on the VPS.
5. Add exact HTTP and HTTPS nginx virtual hosts for the customer domain.
6. Add the domain to Cloudflare DNS as Proxied.
7. Prefer a Cloudflare Origin Certificate with `Full (strict)`. Use a matching
   self-signed origin certificate temporarily with `Full` only when needed.
8. Verify nginx config, origin SNI, and public HTTPS through both edge IPs.
9. Test the landing form and calculator lead path.

## Safety Rules

- Do not touch `salamat-mebel.kz`, `bek-mebel.kz`, `tuba-kz`, or other live
  donor/client sites unless the task explicitly names them.
- Do not print or commit admin tokens, VPS tokens, API keys, or private keys.
- Export and audit production D1 before applying a migration.
- Do not disable `NoNewPrivileges=true` merely to make reload convenient.
- Do not delete a Pages project or repository until its domains, bindings,
  deployment owner, and dependencies are verified.
- Keep smoke tests small and use UTF-8-safe tooling for real customer data.
- Do not start, stop, or restart the VPS without explicit approval.
- Stop repeated infrastructure retries after a timeout or rate-limit signal;
  diagnose the provider/node state first.
