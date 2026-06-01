# furniture-vps-control

Лёгкий Ubuntu-side VPS control сервис для Furniture Orders MVP.

Принимает безопасный ограниченный набор HTTP-команд от Cloudflare admin proxy и выполняет инфраструктурные операции на VPS.

Сервер: 1 CPU, 1 GB RAM, 20 GB disk, Ubuntu 22.04 LTS.

## Security model

- **Bearer token**: каждый запрос проверяет `Authorization: Bearer <token>`. `/health` также требует токен.
- **Allowlist команд**: endpoints фиксированы, никакой динамической маршрутизации.
- **Allowlist webserver**: только `nginx` или `caddy`.
- **Allowlist source hosts**: загрузка артефактов deploy только с разрешённых доменов.
- **Нет shell-инъекций**: `child_process.execFile` с фиксированными аргументами, без `exec`/`eval`.
- **Path traversal protection**: все пути проверяются через `resolve` + `startsWith`.
- **Dry run по умолчанию**: deploy требует явного `dryRun: false` для реального выполнения.
- **Body limit**: POST body ограничен `VPS_CONTROL_MAX_BODY_BYTES`, а token проверяется до чтения тела запроса.
- **Не логируются**: токен, секреты, `env`, стектрейсы.
- **Изоляция systemd**: `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=full`, `ProtectHome=true`.

## Endpoints

| Method | Path | Описание |
|--------|------|----------|
| `GET` | `/health` | Статус сервиса |
| `GET` | `/services` | Список сервисов (nginx, caddy, furniture-vps-control) |
| `POST` | `/reload/webserver` | Reload nginx или caddy через systemctl |
| `POST` | `/deploy/site` | Deploy статического сайта (dry-run по умолчанию) |
| `GET` | `/deploy/logs?siteSlug=&limit=` | Логи deploy из JSONL |

## Env variables

| Variable | Default | Обязательная |
|----------|---------|:---:|
| `VPS_CONTROL_TOKEN` | — | да |
| `VPS_CONTROL_HOST` | `127.0.0.1` | |
| `VPS_CONTROL_PORT` | `8789` | |
| `VPS_CONTROL_WEBSERVER` | `nginx` | |
| `VPS_CONTROL_SITES_DIR` | `/srv/sites` | |
| `VPS_CONTROL_STAGING_DIR` | `/srv/deploy-staging` | |
| `VPS_CONTROL_LOG_DIR` | `/var/log/furniture-control` | |
| `VPS_CONTROL_MAX_BODY_BYTES` | `262144` | |
| `VPS_CONTROL_ALLOWED_SOURCE_HOSTS` | `github.com,raw.githubusercontent.com,example.com` | |

## Local run

```bash
cd vps-control-service
export VPS_CONTROL_TOKEN=dev-token
npm run check
npm start
```

В отдельном терминале:

```bash
export VPS_CONTROL_TOKEN=dev-token
curl -H "Authorization: Bearer $VPS_CONTROL_TOKEN" http://127.0.0.1:8789/health
```

## Tests

```bash
npm test
```

## systemd installation

На VPS:

```bash
sudo bash scripts/install-systemd.sh
```

Скрипт:
- создаёт пользователя `furniture-control`;
- копирует исходники в `/opt/furniture-control`;
- создаёт директории `/srv/sites`, `/srv/deploy-staging`, `/var/log/furniture-control`;
- копирует systemd unit;
- создаёт `/etc/furniture-control.env` (если не существует);
- выводит инструкцию по запуску.

После установки отредактируйте `/etc/furniture-control.env` и задайте `VPS_CONTROL_TOKEN`.

## Reverse proxy recommendation

Не публикуйте сервис напрямую в интернет. Используйте nginx/caddy как reverse proxy с HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name control.example.com;

    location / {
        proxy_pass http://127.0.0.1:8789;
        proxy_set_header Authorization $http_authorization;
        limit_req zone=control burst=5 nodelay;
    }
}
```

Если control API вообще не обязан быть публичным, лучше не публиковать его наружу.

## sudoers guidance

Если reload требует прав root, добавьте через `visudo`:

```
furniture-control ALL=(root) NOPASSWD: /bin/systemctl reload nginx, /bin/systemctl reload caddy, /bin/systemctl is-active nginx, /bin/systemctl is-active caddy
```

## Почему нет произвольных команд

Сервис специально не принимает произвольные shell-команды, `eval`, `curl | bash`, git clone, post-deploy хуки. Это снижает поверхность атаки на VPS с 1 CPU / 1 GB RAM. Весь API — фиксированный allowlist операций, каждая с известными параметрами и границами.

## Что реализовано

- `GET /health` — возвращает статус, версию, uptime, webserver, время
- `GET /services` — опрашивает systemctl для трёх сервисов, безопасно падает в `unknown`
- `POST /reload/webserver` — reload через `execFile` с allowlisted `sudo /bin/systemctl reload nginx|caddy`
- `POST /deploy/site` — валидация, dry-run (план без модификации файлов), `501` для real deploy
- `GET /deploy/logs` — чтение `deploy.jsonl` с фильтром по `siteSlug` и bounded limit
- Bearer token auth на всех endpoints
- Валидация `siteSlug`, `sourceUrl`, `webserver`, `limit`
- Path traversal protection
- Auth before POST body parsing
- POST body size limit
- JSONL аудит deploy/reload событий
- systemd unit с изоляцией
- sudoers guidance
- smoke-test.sh скрипт

## TODO

- Real deploy (`dryRun: false`) — скачивание архива, распаковка, атомарная замена, reload
- Rate limiting для endpoints
- Prometheus metrics endpoint
- Graceful shutdown (SIGTERM handler)
- Настройка firewall (ufw rules)
- Health check для webserver перед reload
- HTTPS на самом сервисе (сейчас предполагается reverse proxy)
- Ротация логов (logrotate)
- Интеграционные тесты с реальным VPS

## Структура

```
vps-control-service/
  README.md
  package.json
  src/
    server.js          — entry point, роутинг, запуск
    config.js          — env + createConfig()
    auth.js            — Bearer token проверка
    http.js            — минимальный HTTP роутер + sendJson
    services.js        — systemctl allowlist
    deploy.js          — deploy handler + dry-run
    logs.js            — JSONL deploy audit log
    validation.js      — siteSlug, sourceUrl, webserver, limit
  scripts/
    install-systemd.sh — установка на VPS
    smoke-test.sh      — curl-based smoke test
  systemd/
    furniture-vps-control.service
  examples/
    furniture-vps-control.env.example
  tests/
    vps-control.test.js
```

## Stage 4.04B update

- `POST /deploy/site` now keeps dry-run behavior and also supports live single-file HTML deploy when `dryRun: false` and `artifactType: "html"`.
- Live HTML deploy downloads an allowlisted HTML artifact URL, validates that it is HTML, writes staging `index.html`, then atomically replaces the target site directory.
- Multi-file/zip deploy remains a future follow-up.
