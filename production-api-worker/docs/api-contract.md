# production-api-worker API Contract

> 版本：v1.0.35 ｜ 基準日期：2026-05-18 ｜ 適用範圍：local memory mode、Postgres + OTLP mode、OpenAPI contract、Rate limit contract、Shutdown signal contract、Trusted proxy client IP contract

這份文件固定 `production-api-worker` 對外可見的 HTTP 合約。內部 service、repository、queue、lifecycle、panic recovery、retry 或 observability 可以重構，但下列 endpoint、status code、JSON shape、錯誤 code、request correlation header、readiness 與 cancellation 行為需要透過 contract test 保護。

Machine-readable contract 位於 `production-api-worker/api/openapi.yaml`。此 YAML 需與本文件及 Go contract tests 一起維護，用於前端 mock、SDK 產生、API gateway review 或 contract diff。

## Compatibility Rules

| 規則 | 說明 |
|---|---|
| 向後相容新增 | 可新增 response 欄位，但不得移除或改名既有欄位 |
| Request decoding | `POST /jobs` 只接受單一 JSON object；malformed JSON、unknown field、trailing JSON value 與空白 `name` 都必須回 `400 invalid_input` |
| 錯誤分支 | client 應依 `error.code` 判斷，不依自然語言 message |
| Status enum | `pending`、`processing`、`done`、`failed` 是穩定字串 |
| Request correlation | server 必須回傳 `X-Request-ID`；client 提供時需原樣保留 |
| Readiness lifecycle | draining 時 `/readyz` 必須回 `503`，讓外部導流系統停止送新 request |
| Panic recovery | 未預期 panic 必須回 `500` 與穩定 `internal_error` JSON，不暴露 panic 細節 |
| Request timeout | handler deadline exceeded 必須回 `504 request_timeout`，不得漂移成 `500 internal_error` |
| Startup configuration | `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定必須先驗證；錯誤設定 fail fast，不可 silent fallback |
| API security | `API_KEY` 有值時，`/jobs` 與 `/metrics` 必須要求 Bearer token；health endpoint 仍需公開供部署系統探測 |
| Security headers | 所有 response 應回 `X-Content-Type-Options`、`X-Frame-Options` 與 `Referrer-Policy` |
| Rate limit | `/jobs` 與 `/jobs/{id}` 需有 per-client IP 限速；超限回 `429 rate_limited`，health endpoint 不限速 |
| Trusted proxy | 只有 `RemoteAddr` 落在 `TRUSTED_PROXY_CIDRS` 時才採用 `X-Forwarded-For` 第一個 IP；未信任來源不可用 header 偽造 client IP |
| Shutdown signal | `api-worker` 必須同時監聽 SIGINT 與 SIGTERM，讓 local Ctrl+C、Docker stop 與 Kubernetes rolling deploy 都進入 draining |
| OpenAPI sync | endpoint、request schema、response schema、error code、Bearer auth 與 `X-Request-ID` 需同步 `api/openapi.yaml` |
| Worker shutdown | queue close 與 enqueue send 必須同步，shutdown 後新 enqueue 回穩定錯誤 |
| Retry cancellation | deadlock retry 的 backoff 必須尊重 `context` cancellation / deadline |
| Breaking change | 需新增版本路由或遷移期，不能直接覆蓋既有合約 |
| Release gate | 任何 handler、service retry 或 queue lifecycle 改動都要跑 contract / cancellation / shutdown safety test |

## Request Correlation

所有 endpoint 都回傳 `X-Request-ID`：

- Client 提供 `X-Request-ID` 時，server 原樣回傳同一個值。
- Client 未提供時，server 產生 `req-*` 格式 ID。
- 同一個 ID 會放進 request context、structured log 欄位 `request_id` 與 trace attribute `request.id`。

```http
X-Request-ID: request-from-client
```

## Error Envelope

所有錯誤回應使用相同格式：

```json
{
  "error": {
    "code": "invalid_input",
    "message": "invalid input"
  }
}
```

| Code | HTTP status | 觸發條件 |
|---|---:|---|
| `invalid_input` | 400 | JSON 無法解析、unknown field、trailing JSON value、缺少/空白 `name`、payload 超過限制 |
| `not_found` | 404 | 查詢不存在的 job |
| `queue_full` | 503 | bounded queue 無法接受新工作 |
| `request_timeout` | 504 | request context deadline exceeded |
| `rate_limited` | 429 | 同一 client IP 超過 `RATE_LIMIT_REQUESTS_PER_MINUTE` |
| `unauthorized` | 401 | `API_KEY` 已設定但缺少或送錯 `Authorization: Bearer <token>` |
| `internal_error` | 500 | 未分類的伺服器錯誤或 handler panic recovery |

## API Security

`API_KEY` 是最小安全合約，用於示範 production API 不應讓業務 endpoint 與 metrics endpoint 無條件公開。空值代表 local teaching mode；有值時受保護 endpoint 必須帶 Bearer token。

```http
Authorization: Bearer dev-secret
```

| Endpoint | 認證策略 |
|---|---|
| `POST /jobs` | `API_KEY` 有值時必須帶 Bearer token |
| `GET /jobs/{id}` | `API_KEY` 有值時必須帶 Bearer token |
| `GET /metrics` | `API_KEY` 有值時必須帶 Bearer token |
| `GET /livez` | 永遠公開 |
| `GET /readyz` | 永遠公開 |

所有 endpoint response 需保留：

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

## POST /jobs

建立 job 並排入 worker queue。

### Request

```http
POST /jobs
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "name": "resize",
  "payload": "image"
}
```

| 欄位 | 型別 | 必填 | 限制 |
|---|---|---|---|
| `name` | string | 是 | 不可為空 |
| `payload` | string | 否 | 最大 4096 bytes |

Request body 必須是單一 JSON object；多個 JSON value、未知欄位或格式錯誤都視為 `invalid_input`。

### Success Response

```http
202 Accepted
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "id": "job-1",
  "name": "resize",
  "payload": "image",
  "status": "pending",
  "attempts": 0,
  "created_at": "2026-05-13T06:03:49Z",
  "updated_at": "2026-05-13T06:03:49Z"
}
```

## GET /jobs/{id}

查詢 job 目前狀態。

### Success Response

```http
200 OK
Content-Type: application/json
```

Response schema 與 `POST /jobs` 成功回應相同。

### Not Found

```http
404 Not Found
Content-Type: application/json
```

```json
{
  "error": {
    "code": "not_found",
    "message": "not found"
  }
}
```

## Health and Metrics

| Endpoint | Status | 用途 |
|---|---:|---|
| `GET /livez` | 200 | process 存活檢查 |
| `GET /readyz` | 200 | readiness 檢查，可接新 request |
| `GET /readyz` | 503 | draining，停止接新流量並等待既有工作收斂 |
| `GET /metrics` | 200 | Prometheus metrics |

## Startup Configuration

`api-worker` 啟動前會先驗證環境變數。這些設定雖然不是 HTTP response schema，但會直接影響操作合約、容量規劃與 incident 排查。

| Env | 預設值 | 驗證 |
|---|---:|---|
| `PORT` | `8080` | TCP port `1-65535` |
| `QUEUE_SIZE` | `64` | 正整數 |
| `WORKERS` | `4` | 正整數 |
| `DATABASE_URL` | 空字串 | 空字串時使用 memory store |
| `DATABASE_MAX_OPEN_CONNS` | `25` | 正整數 |
| `DATABASE_MAX_IDLE_CONNS` | `10` | 正整數，且不可大於 `DATABASE_MAX_OPEN_CONNS` |
| `DATABASE_CONN_MAX_LIFETIME` | `30m0s` | 正數 duration，例如 `30m` 或 `1h` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 空字串 | 空字串時使用 stdout trace exporter |
| `API_KEY` | 空字串 | 空值停用 API key；有值時保護 `/jobs` 與 `/metrics` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `120` | 正整數；每個 client IP 每分鐘業務 endpoint 呼叫上限 |
| `TRUSTED_PROXY_CIDRS` | 空字串 | comma-separated CIDR；空值時不信任 `X-Forwarded-For` |

錯誤設定必須讓 process fail fast，例如 `PORT=http`、`QUEUE_SIZE=0`、`WORKERS=-1`、`DATABASE_MAX_IDLE_CONNS > DATABASE_MAX_OPEN_CONNS`、`DATABASE_CONN_MAX_LIFETIME=soon`、`RATE_LIMIT_REQUESTS_PER_MINUTE=0` 或 `TRUSTED_PROXY_CIDRS=not-a-cidr` 不應被靜默改成預設值。

## Rate Limit

Rate limit 固定 API 的過載保護邊界，避免單一 client 持續壓垮 handler、queue 或 DB。此合約保護 `/jobs` 與 `/jobs/{id}`；`/livez`、`/readyz` 保持公開且不受限速影響。

```http
429 Too Many Requests
Content-Type: application/json
X-Request-ID: request-from-client
Retry-After: 60
```

```json
{
  "error": {
    "code": "rate_limited",
    "message": "rate limited"
  }
}
```

| 項目 | 合約 |
|---|---|
| 設定 | `RATE_LIMIT_REQUESTS_PER_MINUTE`，預設 `120` |
| Key | client IP；預設使用 TCP `RemoteAddr`，只有 trusted proxy 來源才採用 `X-Forwarded-For` 第一個 IP |
| Protected routes | `/jobs`、`/jobs/{id}` |
| Public routes | `/livez`、`/readyz`、`/metrics` |
| Trusted proxy env | `TRUSTED_PROXY_CIDRS=10.0.0.0/8,192.168.10.0/24` |
| Test gate | `go test ./internal/api -run 'TestRateLimitContract|TestRateLimitTrustedProxyContract' -count=1` |

若服務直接暴露在外部網段，`TRUSTED_PROXY_CIDRS` 應保持空值。若服務位於 Nginx、Envoy、API Gateway、Kubernetes ingress 或 load balancer 後方，只能把這些代理所在的內部 CIDR 加入信任清單，並由代理層清理外部傳入的 `X-Forwarded-For`。

## Migration Operation Contract

`cmd/migrate` 是部署操作合約的一部分。它不提供 HTTP endpoint，但會直接影響 schema 版本、release rollback 與 incident 排查，因此也需要可測的設定與版本紀錄。

| Env | 預設值 | 驗證 |
|---|---:|---|
| `DATABASE_URL` | 無 | 必填，空值 fail fast |
| `MIGRATIONS_DIR` | `migrations` | 不可為空白 |
| `MIGRATION_TIMEOUT` | `30s` | 正數 duration |

| 行為 | 合約 |
|---|---|
| Migration table | 啟動時建立 `schema_migrations(version, applied_at)` |
| Version key | SQL 檔名去掉 `.sql`，不可空白、不可含 whitespace |
| Re-run | 已存在於 `schema_migrations` 的 version 會被略過 |
| Apply | 每個新 SQL 檔在 transaction 內執行並記錄版本 |
| Test gate | `go test ./internal/config ./internal/migration -count=1` |

## Panic Recovery

若 handler、service 或 queue 發生未預期 panic，API 必須保留 request correlation 並回傳穩定錯誤格式。

```http
500 Internal Server Error
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal error"
  }
}
```

## Request Timeout

若 handler 內部 request deadline 到期，API 必須明確回 timeout 合約，避免使用端把 timeout 當成未知伺服器錯誤處理。

```http
504 Gateway Timeout
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "error": {
    "code": "request_timeout",
    "message": "request timeout"
  }
}
```

## Contract Test Gate

```bash
cd production-api-worker
make openapi-check
go test ./internal/api -run 'Test.*Contract' -count=1
go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1
go test ./internal/config -count=1
go test ./cmd/api-worker -run 'TestMonitoredSignalsContract' -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1
```

這個 gate 固定：

- `POST /jobs` 成功時回傳 `202 Accepted` 與穩定 job JSON 欄位。
- 不合法 request 回傳 `400` 與 `error.code=invalid_input`，包含 malformed JSON、unknown field、trailing JSON value 與空白 `name`。
- 查詢不存在 job 回傳 `404` 與 `error.code=not_found`。
- queue 滿載時回傳 `503` 與 `error.code=queue_full`。
- 錯誤與成功回應都維持 `Content-Type: application/json`。
- client 提供的 `X-Request-ID` 需原樣回傳；未提供時需自動產生 `req-*`。
- draining 時 `/readyz` 需回 `503 Service Unavailable`，避免 shutdown 期間仍接收新流量。
- handler panic 需回 `500 internal_error` JSON，並保留原 `X-Request-ID`。
- request deadline exceeded 需回 `504 request_timeout`，並保留原 `X-Request-ID`。
- shutdown signal set 需同時包含 SIGINT 與 SIGTERM，避免正式部署收到 SIGTERM 時跳過 draining。
- 啟動設定需固定預設值、合法 env 與錯誤設定 fail-fast 行為。
- deadlock retry backoff 遇到 context cancellation / deadline 時需停止，不得繼續重試或 enqueue。
- queue shutdown 期間不可發生 `send on closed channel`；close 後新 enqueue 需回穩定錯誤。
