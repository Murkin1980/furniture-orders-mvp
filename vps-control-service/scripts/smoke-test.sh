#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${VPS_CONTROL_BASE_URL:-http://127.0.0.1:8789}"
TOKEN="${VPS_CONTROL_TOKEN:-}"

if [ -z "${TOKEN}" ]; then
  echo "ERROR: VPS_CONTROL_TOKEN environment variable is required." >&2
  exit 1
fi

AUTH="Authorization: Bearer ${TOKEN}"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local method="$2"
  local url="$3"
  shift 3
  local expected_code="$1"
  shift 1

  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" -X "${method}" \
    -H "${AUTH}" \
    ${*:+"$@"} \
    "${BASE_URL}${url}" 2>/dev/null || echo "000")

  if [ "${response}" = "${expected_code}" ]; then
    echo "  PASS [${expected_code}] ${method} ${url} - ${desc}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL [got ${response}, expected ${expected_code}] ${method} ${url} - ${desc}"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke testing VPS control service at ${BASE_URL}"
echo ""

check "health endpoint" GET /health 200
check "services endpoint" GET /services 200
check "reload nginx" POST /reload/webserver 200 \
  -H "Content-Type: application/json" -d '{"webserver":"nginx"}'
check "invalid webserver" POST /reload/webserver 400 \
  -H "Content-Type: application/json" -d '{"webserver":"apache"}'
check "deploy dry-run" POST /deploy/site 200 \
  -H "Content-Type: application/json" \
  -d '{"siteSlug":"test-site","sourceUrl":"https://example.com/site.zip","dryRun":true}'
check "deploy without dryRun" POST /deploy/site 200 \
  -H "Content-Type: application/json" \
  -d '{"siteSlug":"test-site","sourceUrl":"https://example.com/site.zip"}'
check "logs endpoint" "GET /deploy/logs" 200
check "missing token returns 401" GET /health 401

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "${FAIL}" -gt 0 ]; then
  exit 1
fi
