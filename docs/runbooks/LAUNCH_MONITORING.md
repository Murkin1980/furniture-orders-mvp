# Launch Monitoring

Date: 2026-06-28

## Where to check errors

| Service | Location |
|---------|----------|
| Cloudflare Pages | Dashboard → Workers & Pages → furniture-orders-mvp → Logs |
| D1 database | `npx wrangler d1 execute furniture_orders --remote --command="SELECT * FROM ..."` |
| R2 media | Dashboard → R2 → furniture-portfolio-media |
| VPS control logs | SSH → `/var/log/furniture-vps-control/` |
| VPS deploy logs | `GET /api/vps/deploy/logs?limit=50` (ops scope) |

## Critical errors

- 5xx on order intake → stop sales, check D1
- Auth bypass → rotate tokens immediately
- Proposal data loss → restore from backup

## How to rollback

1. **Previous deploy**: Cloudflare Dashboard → Pages → deployments → rollback
2. **D1**: restore from backup export
3. **VPS**: `sudo systemctl restart furniture-vps-control`

## How to disable AI

```bash
npx wrangler pages secret delete AI_COMMUNICATIONS_ENABLED --project-name=furniture-orders-mvp
```

## How to disable Twenty sync

```bash
npx wrangler pages secret delete TWENTY_SYNC_ENABLED --project-name=furniture-orders-mvp
```
