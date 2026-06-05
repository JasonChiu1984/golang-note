# production-api-worker API Contract

> 版本：v1.0.49 ｜ 基準日期：2026-06-05 ｜ 適用範圍：local memory mode、Postgres + OTLP mode、OpenAPI contract、Readiness lifecycle contract、Request decoding contract、Panic recovery contract、Request correlation contract、API security contract、Rate limit contract、Shutdown signal contract、Trusted proxy client IP contract、CORS allowlist contract、Request body limit contract、HTTP server timeout contract、Worker failure contract、Retry cancellation contract、Queue backpressure contract、DB pool contract gate、Migration Operation Contract

這份文件固定 `production-api-worker` 對外可見的 HTTP 合約。內部 service、repository、queue、lifecycle、panic recovery、retry 或 observability 可以重構，但下列 endpoint、status code、JSON shape、錯誤 code、request correlation header、readiness 與 cancellation 行為需要透過 contract test 保護。

Machine-readable contract 位於 `production-api-worker/api/openapi.yaml`。此 YAML 需與本文件及 Go contract tests 一起維護，用於前端 mock、SDK 產生、API gateway review 或 contract diff。

## Compatibility Rules

| 規則 | 說明 |
|---|---|
| 向後相容新增 | 可新增 response 欄位，但不得移除或改名既有欄位 |
| Request decoding | `POST /jobs` 只接受單一 JSON object；malformed JSON、unknown field、trailing JSON value 與空白 `name` 都必須回 `400 invalid_input` |
| Request decoding gate | `node scripts/check-request-decoding-contract.mjs` 必須固定 `DisallowUnknownFields`、單一 JSON value 檢查、`TestRequestDecodingContract`、OpenAPI、README、章節、Makefile 與 CI 入口 |
| Request body limit | `POST /jobs` request body 超過 `REQUEST_BODY_LIMIT_BYTES` 時必須回 `413 payload_too_large`，不可繼續 decode 或排入 queue |
| HTTP server timeout | `HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 必須集中設定並 fail fast |
| Worker failure contract | worker processor 回錯時仍需記錄 duration，並把結果標記為 `failed`；成功路徑需標記 `success`，避免 queue failure 只存在於 log |
| 錯誤分支 | client 應依 `error.code` 判斷，不依自然語言 message |
| Status enum | `pending`、`processing`、`done`、`failed` 是穩定字串 |
| Request correlation | server 必須回傳 `X-Request-ID`；client 提供時需原樣保留 |
| Request correlation gate | `node scripts/check-request-correlation-contract.mjs` 必須固定 `X-Request-ID`、request context、structured log、trace attribute、OpenAPI 與 CI 入口 |
| Readiness lifecycle | draining 時 `/readyz` 必須回 `503`，讓外部導流系統停止送新 request |
| Readiness lifecycle gate | `node scripts/check-readiness-contract.mjs` 必須固定 `/livez=200`、`/readyz=200/503`、public probes、Go tests、OpenAPI、README、章節、Makefile 與 CI 入口 |
| Panic recovery | 未預期 panic 必須回 `500` 與穩定 `internal_error` JSON，不暴露 panic 細節 |
| Panic recovery gate | `node scripts/check-panic-recovery-contract.mjs` 必須固定 `recoverMiddleware`、`TestPanicRecoveryContract`、OpenAPI、README、章節、Makefile 與 CI 入口 |
| Request timeout | handler deadline exceeded 必須回 `504 request_timeout`，不得漂移成 `500 internal_error` |
| Startup configuration | `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定必須先驗證；錯誤設定 fail fast，不可 silent fallback |
| DB pool contract gate | `node scripts/check-db-pool-contract.mjs` 必須固定 DB pool env、config default / override / fail-fast、repository pool 套用、`api-worker` wiring、文件、Makefile 與 CI 入口 |
| API security | `API_KEY` 有值時，`/jobs` 與 `/metrics` 必須要求 Bearer token；health endpoint 仍需公開供部署系統探測 |
| API security gate | `node scripts/check-api-security-contract.mjs` 必須固定 `API_KEY`、Bearer auth、公開 health probes、安全標頭、Go tests、OpenAPI 與 CI 入口 |
| Security headers | 所有 response 應回 `X-Content-Type-Options`、`X-Frame-Options` 與 `Referrer-Policy` |
| CORS allowlist | 預設不回 CORS header；只有 `CORS_ALLOWED_ORIGINS` 明確列入的 exact origin 才回 `Access-Control-Allow-Origin` |
| Rate limit | `/jobs` 與 `/jobs/{id}` 需有 per-client IP 限速；超限回 `429 rate_limited`，health endpoint 不限速 |
| Trusted proxy | 只有 `RemoteAddr` 落在 `TRUSTED_PROXY_CIDRS` 時才採用 `X-Forwarded-For` 第一個 IP；未信任來源不可用 header 偽造 client IP |
| Shutdown signal | `api-worker` 必須同時監聽 SIGINT 與 SIGTERM，讓 local Ctrl+C、Docker stop 與 Kubernetes rolling deploy 都進入 draining |
| OpenAPI sync | endpoint、request schema、response schema、error code、Bearer auth 與 `X-Request-ID` 需同步 `api/openapi.yaml` |
| Worker shutdown | queue close 與 enqueue send 必須同步，shutdown 後新 enqueue 回穩定錯誤 |
| Worker result metric | `TestWorkerFailureResultContract` 需固定 `worker_jobs_total{result="success"}` / `worker_jobs_total{result="failed"}` 的分類邊界 |
| Retry cancellation contract | deadlock retry 的 backoff 必須尊重 `context` cancellation / deadline，並由 `node scripts/check-retry-cancellation-contract.mjs` 固定文件、Go test、Makefile 與 CI 入口 |
| Breaking change | 需新增版本路由或遷移期，不能直接覆蓋既有合約 |
| Release gate | 任何 handler、service retry 或 queue lifecycle 改動都要跑 contract / cancellation / shutdown safety test |

## Request Correlation

所有 endpoint 都回傳 `X-Request-ID`：

- Client 提供 `X-Request-ID` 時，server 原樣回傳同一個值。
- Client 未提供時，server 產生 `req-*` 格式 ID。
- 同一個 ID 會放進 request context、structured log 欄位 `request_id` 與 trace attribute `request.id`。
- Release gate 需包含 `TestRequestIDContract`、`TestCreateJobContract` 與 `node scripts/check-request-correlation-contract.mjs`，避免 middleware 或 OpenAPI 重構時漏掉 request id。

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
| `invalid_input` | 400 | JSON 無法解析、unknown field、trailing JSON value、缺少/空白 `name` |
| `payload_too_large` | 413 | `POST /jobs` request body 超過 `REQUEST_BODY_LIMIT_BYTES` |
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

Release gate 需包含：

```bash
go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1
node scripts/check-api-security-contract.mjs
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

Request body 必須是單一 JSON object；多個 JSON value、未知欄位或格式錯誤都視為 `invalid_input`。整體 body 大小由 `REQUEST_BODY_LIMIT_BYTES` 控制，超限時回 `413 payload_too_large`。

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

Readiness lifecycle gate 需包含：

```bash
go test ./internal/api -run 'TestReadinessContract' -count=1
go test ./internal/lifecycle -run 'TestReadinessSwitchesToDraining' -count=1
node scripts/check-readiness-contract.mjs
```

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
| `CORS_ALLOWED_ORIGINS` | 空字串 | comma-separated exact `http` / `https` origins；不可使用 wildcard、path、query 或 fragment |
| `REQUEST_BODY_LIMIT_BYTES` | `1048576` | 正整數 byte 數；限制 `POST /jobs` body |
| `HTTP_READ_HEADER_TIMEOUT` | `3s` | 正數 duration；限制讀取 request headers 的時間 |
| `HTTP_READ_TIMEOUT` | `5s` | 正數 duration；限制讀取完整 request 的時間 |
| `HTTP_WRITE_TIMEOUT` | `10s` | 正數 duration；限制 response 寫出時間 |
| `HTTP_IDLE_TIMEOUT` | `60s` | 正數 duration；限制 keep-alive idle connection |
| `HTTP_SHUTDOWN_TIMEOUT` | `5s` | 正數 duration；限制 HTTP server graceful shutdown 等待時間 |
| `QUEUE_DRAIN_TIMEOUT` | `10s` | 正數 duration；限制 worker queue drain 等待時間 |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `120` | 正整數；每個 client IP 每分鐘業務 endpoint 呼叫上限 |
| `TRUSTED_PROXY_CIDRS` | 空字串 | comma-separated CIDR；空值時不信任 `X-Forwarded-For` |

錯誤設定必須讓 process fail fast，例如 `PORT=http`、`QUEUE_SIZE=0`、`WORKERS=-1`、`DATABASE_MAX_IDLE_CONNS > DATABASE_MAX_OPEN_CONNS`、`DATABASE_CONN_MAX_LIFETIME=soon`、`RATE_LIMIT_REQUESTS_PER_MINUTE=0`、`REQUEST_BODY_LIMIT_BYTES=0`、`HTTP_READ_TIMEOUT=0s`、`QUEUE_DRAIN_TIMEOUT=-5s`、`TRUSTED_PROXY_CIDRS=not-a-cidr` 或 `CORS_ALLOWED_ORIGINS=https://app.example.com/path` 不應被靜默改成預設值。

DB pool contract gate 需確認 `OpenPostgresWithPool` 將 `DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS`、`DATABASE_CONN_MAX_LIFETIME` 套用到 `sql.DB`，且 `api-worker` 從 config 傳遞 pool 設定到 repository：

```bash
node scripts/check-db-pool-contract.mjs
cd production-api-worker && make db-pool-check
```

## HTTP Server Timeout

HTTP timeout 是 server 操作合約，不是單純效能參數。`api-worker` 必須同時設定 request header、request body、response write、keep-alive idle、shutdown 與 queue drain timeout，避免 slow client、卡住的 response 或過長 drain 讓 rolling deploy 無法預測。

```bash
HTTP_READ_HEADER_TIMEOUT=3s \
HTTP_READ_TIMEOUT=5s \
HTTP_WRITE_TIMEOUT=10s \
HTTP_IDLE_TIMEOUT=60s \
HTTP_SHUTDOWN_TIMEOUT=5s \
QUEUE_DRAIN_TIMEOUT=10s \
go run ./cmd/api-worker
```

| 項目 | 合約 |
|---|---|
| Slow header | `HTTP_READ_HEADER_TIMEOUT` 套用到 `http.Server.ReadHeaderTimeout` |
| Slow body | `HTTP_READ_TIMEOUT` 套用到 `http.Server.ReadTimeout`，並和 `REQUEST_BODY_LIMIT_BYTES` 一起保護輸入邊界 |
| Slow response | `HTTP_WRITE_TIMEOUT` 套用到 `http.Server.WriteTimeout` |
| Keep-alive | `HTTP_IDLE_TIMEOUT` 套用到 `http.Server.IdleTimeout` |
| Shutdown | `HTTP_SHUTDOWN_TIMEOUT` 控制 `server.Shutdown` 最大等待時間 |
| Queue drain | `QUEUE_DRAIN_TIMEOUT` 控制 worker queue drain 最大等待時間 |
| Test gate | `go test ./cmd/api-worker -run 'TestHTTPServerTimeoutContract' -count=1` |

## Request Body Limit

Request body limit 是 HTTP 邊界保護，不是 domain validation。`POST /jobs` 會先用 `http.MaxBytesReader` 限制 body，再交給 JSON decoder；超過 `REQUEST_BODY_LIMIT_BYTES` 時，服務必須回 `413 payload_too_large`，並保留 `X-Request-ID` 方便排障。

```http
413 Request Entity Too Large
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "error": {
    "code": "payload_too_large",
    "message": "payload too large"
  }
}
```

| 項目 | 合約 |
|---|---|
| 設定 | `REQUEST_BODY_LIMIT_BYTES`，預設 `1048576` |
| Protected routes | `POST /jobs` |
| Error code | `payload_too_large` |
| Test gate | `go test ./internal/api -run 'TestRequestBodyLimitContract' -count=1` |

## CORS Allowlist

CORS 是瀏覽器同源政策的瀏覽器端合約，不是 API 認證。`production-api-worker` 預設不回 `Access-Control-Allow-Origin`，避免教學範例被誤解成可對任意網站開放。只有明確設定 `CORS_ALLOWED_ORIGINS` 時，server 才會對符合 allowlist 的 exact origin 回 CORS headers。

```bash
CORS_ALLOWED_ORIGINS=https://app.example.com,http://localhost:5173 go run ./cmd/api-worker
```

| 項目 | 合約 |
|---|---|
| 設定 | `CORS_ALLOWED_ORIGINS`，預設空值 |
| Origin 格式 | exact `http` / `https` origin，例如 `https://app.example.com` 或 `http://localhost:5173` |
| 禁止格式 | wildcard `*`、path、query、fragment、`file://` |
| Allowed preflight | `OPTIONS` 回 `204`、`Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers`、`Vary: Origin` |
| Blocked preflight | 未列入 allowlist 的 origin 回 `403`，且不回 `Access-Control-Allow-Origin` |
| Test gate | `go test ./internal/api -run 'TestCORSAllowedOriginsContract' -count=1` |

正式部署仍應讓 API Gateway、Ingress 或 WAF 管理外部 TLS、認證與跨域政策；此合約只固定 Go service 在需要被瀏覽器前端呼叫時的最小安全邊界。

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
| Static gate | `node scripts/check-migration-contract.mjs` |

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
- oversized request body 回傳 `413` 與 `error.code=payload_too_large`，且不排入 queue。
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
- Queue backpressure contract 需由 `node scripts/check-queue-backpressure-contract.mjs` 固定 bounded queue 滿載、`domain.ErrQueueFull`、`503 queue_full`、dropped metric 與 queue depth。
- queue shutdown 期間不可發生 `send on closed channel`；close 後新 enqueue 需回穩定錯誤。
