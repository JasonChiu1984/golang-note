#!/usr/bin/env bash
set -euo pipefail

base_url="${API_BASE_URL:-http://localhost:8080}"
request_id="${REQUEST_ID:-compose-smoke-1}"
timeout_seconds="${SMOKE_TIMEOUT_SECONDS:-60}"
api_key="${API_KEY:-}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 127
  fi
}

http_code() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local output="$4"

  local headers=(-H "X-Request-ID: $request_id")
  if [[ -n "$api_key" ]]; then
    headers+=(-H "Authorization: Bearer $api_key")
  fi
  if [[ -n "$body" ]]; then
    curl -fsS -o "$output" -w '%{http_code}' \
      -X "$method" \
      -H "Content-Type: application/json" \
      "${headers[@]}" \
      --data "$body" \
      "$url"
  else
    curl -fsS -o "$output" -w '%{http_code}' \
      -X "$method" \
      "${headers[@]}" \
      "$url"
  fi
}

wait_for_ready() {
  local deadline=$((SECONDS + timeout_seconds))
  local code

  until [[ "$SECONDS" -ge "$deadline" ]]; do
    if code="$(curl -fsS -o /dev/null -w '%{http_code}' "$base_url/readyz" 2>/dev/null)" && [[ "$code" == "200" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "service did not become ready within ${timeout_seconds}s: $base_url/readyz" >&2
  return 1
}

extract_json_string() {
  local key="$1"
  local file="$2"
  sed -nE 's/.*"'$key'"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$file" | head -n 1
}

require_cmd curl
require_cmd sed

wait_for_ready

live_body="$tmp_dir/livez.txt"
live_code="$(http_code GET "$base_url/livez" "" "$live_body")"
if [[ "$live_code" != "200" ]]; then
  echo "livez status=$live_code body=$(cat "$live_body")" >&2
  exit 1
fi

create_body="$tmp_dir/create.json"
create_code="$(http_code POST "$base_url/jobs" '{"name":"compose-smoke","payload":"docker"}' "$create_body")"
if [[ "$create_code" != "202" ]]; then
  echo "create job status=$create_code body=$(cat "$create_body")" >&2
  exit 1
fi

job_id="$(extract_json_string id "$create_body")"
if [[ -z "$job_id" ]]; then
  echo "create job response missing id: $(cat "$create_body")" >&2
  exit 1
fi

get_body="$tmp_dir/get.json"
get_code="$(http_code GET "$base_url/jobs/$job_id" "" "$get_body")"
if [[ "$get_code" != "200" ]]; then
  echo "get job status=$get_code body=$(cat "$get_body")" >&2
  exit 1
fi

status="$(extract_json_string status "$get_body")"
case "$status" in
  pending|processing|done|failed) ;;
  *)
    echo "unexpected job status=$status body=$(cat "$get_body")" >&2
    exit 1
    ;;
esac

metrics_body="$tmp_dir/metrics.txt"
metrics_code="$(http_code GET "$base_url/metrics" "" "$metrics_body")"
if [[ "$metrics_code" != "200" ]] || ! grep -q 'api_requests_total' "$metrics_body"; then
  echo "metrics check failed status=$metrics_code" >&2
  exit 1
fi

echo "compose smoke passed: livez=200 readyz=200 job=$job_id status=$status metrics=ok"
