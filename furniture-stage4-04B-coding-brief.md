# Furniture Orders MVP - Stage 4.04B coding brief

Date: 2026-06-01

## Goal

Implement real landing artifact generation and a live single-file HTML deploy path.

## Baseline

- Stage 4.04A has `sites`, `site_domains`, `site_deployments`.
- `deploySite()` stores deployments and proxies to VPS control.
- Current default source URL is `/sites/{slug}.zip`, but no artifact endpoint exists.
- VPS control service supports `/deploy/site`, but `dryRun: false` returns `501`.

## Stage 4.04B MVP Direction

- Add a Cloudflare endpoint that generates a static HTML landing artifact from site data.
- Change default source URL to that artifact endpoint.
- Keep payload explicit and safe: `artifactType: "html"`.
- Update VPS control service to support live deploy for `artifactType: "html"`:
  - download allowlisted source URL;
  - validate HTML content;
  - write to staging `index.html`;
  - atomically replace target site dir;
  - write deploy log.

## Safety

- No arbitrary templates or user-authored code execution.
- No shell commands for deploy.
- Path traversal checks must remain.
- Source URL must remain allowlisted by VPS service config.

