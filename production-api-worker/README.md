# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
- API contract：穩定 request/response/error schema，文件在 `docs/api-contract.md`
- OpenAPI contract：machine-readable schema 位於 `api/openapi.yaml`，用來對齊文件、測試、SDK 與前端 mock
- Readiness Lifecycle Contract：`/livez` 永遠公開回 `200`；`/readyz` ready 時回 `200`、draining 時回 `503`，並由 `make readiness-check` 固定文件、OpenAPI、Go tests 與 CI 入口
- Request correlation contract：`X-Request-ID` 需同時進入 response header、request context、structured log 與 trace attribute
- API Security Contract：可用 `API_KEY` 啟用 Bearer token 保護 `/jobs` 與 `/metrics`，health endpoint 保持公開，並由靜態 gate 固定文件、OpenAPI、Go tests 與 CI 入口
- CORS Allowlist Contract：`CORS_ALLOWED_ORIGINS` 預設空值；只有明確列入的 exact origin 才回 CORS header
- Request Body Limit Contract：`REQUEST_BODY_LIMIT_BYTES` 預設 1048576；`POST /jobs` 超限回 `413 payload_too_large`
- HTTP Server Timeout Contract：`HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 集中設定並 fail fast
- Worker Failure Contract：worker processor 成功/失敗都記錄 duration，並以 `worker_jobs_total{result="success|failed"}` 固定可觀測結果
- Retry Cancellation Contract：deadlock retry backoff 必須尊重 `context` cancellation / deadline，取消後不得繼續交易或 enqueue
- Queue Backpressure Contract：bounded queue 滿載時回 `domain.ErrQueueFull`，API 對外回 `503 queue_full`，並記錄 `worker_jobs_total{result="dropped"}`
- Diagnostics / pprof contract：`ENABLE_PPROF` 預設關閉；啟用 `/debug/pprof/` 時必須提供 `PPROF_TOKEN` 或沿用 `API_KEY`
- Rate limit contract：`RATE_LIMIT_REQUESTS_PER_MINUTE` 依 client IP 保護 `/jobs` 與 `/jobs/{id}`，超限回 `429 rate_limited`
- Trusted Proxy Client IP Contract：`TRUSTED_PROXY_CIDRS` 預設空值；只有信任代理來源才採用 `X-Forwarded-For` 第一個 IP，並由 `make trusted-proxy-check` 固定文件、runbook、測試、Makefile 與 CI 入口
- Shutdown Signal Contract：`api-worker` 同時監聽 SIGINT / SIGTERM，收到訊號後才進入 draining、HTTP shutdown 與 queue drain
- Request Decoding Contract：拒絕 malformed JSON、unknown field、trailing JSON value 與空白 name，並由 `make request-decoding-check` 固定文件、OpenAPI、測試與 CI 入口
- Service transaction boundary：`sql.TxOptions`、context-aware deadlock retry、queue enqueue
- Startup configuration：集中驗證 `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定，錯誤設定 fail fast
- DB Pool Contract：`DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS`、`DATABASE_CONN_MAX_LIFETIME` 由 config 驅動並套用到 `sql.DB`，由 `make db-pool-check` 固定文件、repository wiring 與 CI 入口
- Migration Contract：集中驗證 migration env、timeout、SQL version，並用 `schema_migrations` 記錄已套用版本；`make migration-check` / `node scripts/check-migration-contract.mjs` 固定文件、測試與 CI 入口
- Repository：memory 與 Postgres `database/sql` 版本
- Worker queue：bounded queue、worker pool、shutdown-safe enqueue / close
- Service lifecycle：`/livez`、`/readyz`、draining、HTTP shutdown、queue drain
- Panic recovery：handler 未預期 panic 時回穩定 `internal_error` JSON
- Request timeout：handler deadline exceeded 時回穩定 `request_timeout` JSON
- Observability：Prometheus client、OpenTelemetry OTLP/stdout exporter、slog、`X-Request-ID`
- Operational runbook：SLI/SLO、Prometheus alert rules、scrape config、incident workflow、verification、troubleshooting
- Pipeline：migration CLI、Docker Compose、GitHub Actions workflow、Docker image build gate、Compose smoke gate
- Compose Smoke Contract：`docker compose up -d --build` 後必須由 host-side `scripts/compose-smoke.sh` 驗證 `/livez`、`/readyz`、job create/read 與 `/metrics`，並由 `make compose-smoke-check` 固定文件、Makefile 與 CI 入口

## Local Memory Mode

```bash
go test ./...
go run ./cmd/api-worker
```

## Postgres + OTLP Mode

```bash
docker compose up --build
```

Then:

```bash
curl -X POST http://localhost:8080/jobs \
  -H 'Content-Type: application/json' \
  -H 'X-Request-ID: demo-request-1' \
  -H 'Authorization: Bearer dev-secret' \
  -d '{"name":"resize","payload":"image"}'

curl http://localhost:8080/metrics
curl -i http://localhost:8080/readyz
```

可重跑 smoke gate：

```bash
docker compose up -d --build
make compose-smoke
docker compose down -v
```

## Migration

```bash
DATABASE_URL='postgres://app:app@localhost:5432/app?sslmode=disable' \
MIGRATIONS_DIR='./migrations' \
MIGRATION_TIMEOUT='30s' \
go run ./cmd/migrate
```

## Release Quality Gate

```bash
go mod tidy
go mod verify
go list -m -u all
govulncheck ./...
make ci-contract
go test ./internal/config -count=1
go test ./internal/migration -count=1
make migration-check
make readiness-check
go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract|TestRequestBodyLimitContract' -count=1
go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1
go test ./internal/api -run 'TestCORSAllowedOriginsContract' -count=1
go test ./internal/api -run 'TestPprofDiagnosticsContract' -count=1
go test ./internal/api -run 'TestRateLimitContract' -count=1
go test ./cmd/api-worker -run 'TestMonitoredSignalsContract|TestHTTPServerTimeoutContract' -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic|TestQueueBackpressureContract' -count=1
go test -race -cover ./...
make openapi-check
make request-decoding-check
make runbook-check
make prometheus-check
make pprof-check
make rate-limit-check
make trusted-proxy-check
make cors-check
make request-body-limit-check
make http-timeout-check
make request-correlation-check
make api-security-check
make worker-failure-check
make retry-cancellation-check
make queue-backpressure-check
make shutdown-signal-check
make compose-smoke-check
go test -run='^$' -bench=. -benchmem -count=10 ./... > bench.txt
docker compose up --build
make compose-smoke
```

| Gate | 目的 |
|---|---|
| `.github/workflows/ci.yml` | 固定 root module、production contract、race/coverage、govulncheck 與 Docker build，避免 release gate 只停在文件 |
| `make ci-contract` | 本機快速重跑與 CI 相同的核心 production 合約測試 |
| `go mod verify` | 確認 module cache 與 `go.sum` hash 一致 |
| `go list -m -u all` | 發現可更新依賴並建立維護紀錄 |
| `govulncheck ./...` | 掃描 API / worker 實際可達的已知漏洞 |
| `go test ./internal/config -count=1` | 固定啟動設定與 DB pool 預設值、合法 env 與錯誤設定 fail-fast 行為 |
| `make db-pool-check` | 固定 DB Pool Contract、DB pool env、config validation、repository pool 套用、文件與 CI 入口 |
| `go test ./internal/migration -count=1` | 固定 migration SQL 檔排序、版本命名與檔案掃描規則 |
| `make migration-check` | 固定 Migration Contract、env、timeout、version table、transaction apply、Go tests、文件與 CI 入口 |
| `go test ./internal/api -run 'Test.*Contract' -count=1` | 固定 HTTP status、JSON shape、錯誤 code 與 response header |
| `go test ./internal/api -run 'TestRequestDecodingContract' -count=1` | 固定 malformed JSON、unknown field、trailing JSON 與空白 name 的 `400 invalid_input` |
| `make request-decoding-check` | 固定 Request Decoding Contract、Go tests、OpenAPI、README、章節、整合教程與 CI 入口 |
| `go test ./internal/api -run 'TestRequestBodyLimitContract' -count=1` | 固定 oversized request body 的 `413 payload_too_large` JSON 與 request id 行為 |
| `go test ./cmd/api-worker -run 'TestHTTPServerTimeoutContract' -count=1` | 固定 HTTP server read header、read、write、idle、shutdown 與 queue drain timeout 由 config 套用 |
| `go test ./internal/api -run 'TestReadinessContract' -count=1` | 固定 ready / draining 狀態與 `/readyz` status code |
| `make readiness-check` | 固定 Readiness Lifecycle Contract、`/livez`、`/readyz`、draining 503、public probes、Go tests、OpenAPI、README 與 CI 入口 |
| `go test ./internal/api -run 'TestPanicRecoveryContract' -count=1` | 固定 handler panic 時的 `500 internal_error` JSON 與 request id 行為 |
| `go test ./internal/api -run 'TestRequestTimeoutContract' -count=1` | 固定 handler timeout 時的 `504 request_timeout` JSON 與 request id 行為 |
| `go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1` | 固定 API key 認證邊界、公開 health endpoint 與安全標頭 |
| `go test ./internal/api -run 'TestCORSAllowedOriginsContract' -count=1` | 固定 CORS allowlist、allowed preflight、actual request header 與 blocked preflight |
| `go test ./internal/api -run 'TestPprofDiagnosticsContract' -count=1` | 固定 pprof 預設關閉、啟用後要求 Bearer token、合法 token 才能讀 `/debug/pprof/` |
| `go test ./internal/api -run 'TestRateLimitContract' -count=1` | 固定 per-client request limit、`429 rate_limited`、`Retry-After` 與 request id 行為 |
| `go test ./internal/worker -run 'TestWorkerFailureResultContract' -count=1` | 固定 worker processor 成功/失敗都會記錄 result metric 與 duration |
| `go test ./cmd/api-worker -run 'TestMonitoredSignalsContract' -count=1` | 固定 SIGINT/SIGTERM shutdown signal set，避免只處理 local Ctrl+C |
| `go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1` | 固定 deadlock retry backoff 會尊重 request cancellation / shutdown deadline |
| `go test ./internal/worker -run 'TestQueueBackpressureContract' -count=1` | 固定 bounded queue 滿載時回 `domain.ErrQueueFull`、記錄 dropped result 並維持 queue depth |
| `go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1` | 固定 queue close/enqueue 同步邊界，避免 shutdown race panic |
| `go test -race -cover ./...` | 驗證 service、handler、queue 與併發安全 |
| `make openapi-check` | 固定 OpenAPI contract、endpoint、schema、error code、Bearer auth 與 README/API 文件入口 |
| `make readiness-check` | 固定 readiness / liveness route、draining status、contract tests、章節與 CI 靜態檢查入口 |
| `make request-correlation-check` | 固定 Request correlation contract、`X-Request-ID`、request context、structured log、trace attribute、Go tests、OpenAPI 與 CI 入口 |
| `make api-security-check` | 固定 API security contract、`API_KEY`、Bearer auth、公開 health endpoint、安全標頭、Go tests、OpenAPI 與 CI 入口 |
| `make runbook-check` | 固定 SLI/SLO、Prometheus alert rules、incident workflow 與 runbook link 不被移除 |
| `make prometheus-check` | 固定 Prometheus scrape config、rule_files、Compose monitoring profile 與 README/runbook 入口 |
| `make pprof-check` | 固定 pprof diagnostics contract、`ENABLE_PPROF`、`PPROF_TOKEN`、runbook、Go tests 與 CI 入口 |
| `make rate-limit-check` | 固定 rate limit contract、`RATE_LIMIT_REQUESTS_PER_MINUTE`、OpenAPI、Go tests、README 與 CI 入口 |
| `make cors-check` | 固定 CORS allowlist contract、`CORS_ALLOWED_ORIGINS`、OpenAPI、Go tests、README 與 CI 入口 |
| `make request-body-limit-check` | 固定 request body limit contract、`REQUEST_BODY_LIMIT_BYTES`、OpenAPI、Go tests、README 與 CI 入口 |
| `make http-timeout-check` | 固定 HTTP server timeout contract、timeout env、main server 套用、Go tests、README、API contract 與 CI 入口 |
| `make worker-failure-check` | 固定 worker failure contract、result metric、duration、Go tests、README 與 CI 入口 |
| `make retry-cancellation-check` | 固定 retry cancellation contract、deadlock backoff、context cancellation、Go test、README 與 CI 入口 |
| `make queue-backpressure-check` | 固定 queue backpressure contract、`domain.ErrQueueFull`、`503 queue_full`、dropped metric、Go tests、README 與 CI 入口 |
| `make db-pool-check` | 固定 DB Pool Contract、`DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS`、`DATABASE_CONN_MAX_LIFETIME`、repository pool 套用與 CI 入口 |
| `make migration-check` | 固定 Migration Contract、`DATABASE_URL`、`MIGRATIONS_DIR`、`MIGRATION_TIMEOUT`、`schema_migrations`、transaction apply、Go tests 與 CI 入口 |
| `make request-correlation-check` | 固定 request id middleware、OpenAPI request id header、contract tests、章節與 CI 靜態檢查入口 |
| `make api-security-check` | 固定 API key auth middleware、security headers、OpenAPI bearerAuth、contract tests、章節與 CI 靜態檢查入口 |
| `make shutdown-signal-check` | 固定 shutdown signal contract、SIGINT/SIGTERM、main test、README、API contract 與 CI 入口 |
| `make compose-smoke-check` | 固定 Compose Smoke Contract、host-side smoke script、`/livez`、`/readyz`、job create/read、`/metrics`、失敗 logs、Makefile 與 CI 入口 |
| `go test -run='^$' -bench=. -benchmem -count=10 ./...` | API / worker 效能改動需保留 benchmark 證據 |
| `docker compose up --build` | 啟動 Postgres、migration、API、worker 與 metrics 整體鏈路 |
| `make compose-smoke` | 用主機端 curl 驗證 `/livez`、`/readyz`、job create/read 與 `/metrics` |

## CI Workflow Contract

根目錄 `.github/workflows/ci.yml` 是本專案的 release gate 實作，不只是文件範例。workflow 分成四個 job：

| Job | 驗證範圍 | 阻擋風險 |
|---|---|---|
| `root-course` | root module、範例、crawler、`docs/index.html` 與補充教材入口 | 教材範例壞掉、Pages 入口缺檔 |
| `production-contract` | production-api-worker config、migration、API contract、retry、worker shutdown、`-race -cover` | 對外 API / shutdown / migration / 併發合約漂移 |
| `vulnerability-scan` | root module 與 production module 的 `govulncheck ./...` | 已知漏洞進入 release |
| `docker-build` | `production-api-worker` Docker image build + Compose smoke | Dockerfile、migration binary、runtime image 或端到端啟動流程回歸 |

`production-api-worker/docs/api-contract.md` 是人讀的 API 合約；`production-api-worker/api/openapi.yaml` 是 machine-readable OpenAPI contract，供前端 mock、SDK 產生、契約測試與文件工具共用。兩者需和 Go contract tests 一起維護，並由 `node scripts/check-openapi-contract.mjs` 固定入口。

`production-api-worker/docs/operational-runbook.md` 是值班與 incident review 的教學入口；`configs/prometheus/production-api-worker-alerts.yml` 是對應的 Prometheus alert rule 範例，`configs/prometheus/prometheus.yml` 則示範本地 scrape job 與 `rule_files` 載入。這些檔案分別由根目錄 `node scripts/check-operational-runbook.mjs`、`node scripts/check-prometheus-config.mjs` 與 `node scripts/check-pprof-contract.mjs` 固定，避免 observability 只剩 log / metrics 概念而沒有可操作告警、排障與受控 diagnostics 流程。

本機修改 production 行為前，至少先跑：

```bash
cd production-api-worker
make ci-contract
go test -race -cover ./... -count=1
docker build -t production-api-worker:local .
docker compose up -d --build
make compose-smoke
docker compose down -v
```

`scripts/compose-smoke.sh` 故意在 host 端執行，而不是把 curl 塞進 distroless runtime image。這保留 runtime image 的最小攻擊面，同時仍能驗證 Compose 啟動後的 `/livez`、`/readyz`、`POST /jobs`、`GET /jobs/{id}` 與 Prometheus metrics。

Compose smoke static gate 需包含：

```bash
make compose-smoke-check
cd .. && node scripts/check-compose-smoke-contract.mjs
```

## API Contract

對外 API 合約請先看 `docs/api-contract.md`。任何 handler、domain status、錯誤處理或 route label 調整，都要先判斷是否改變該文件列出的外部行為。

Machine-readable contract 位於 `api/openapi.yaml`。它不是取代 Go contract tests，而是讓 schema 可以被 frontend mock、SDK generator、API gateway review 或 contract diff 工具重用。

| 合約項 | 目前策略 |
|---|---|
| Success response | 保持 `id`、`name`、`payload`、`status` 欄位向後相容 |
| Request decoding | 只接受單一 JSON object；unknown field、trailing JSON value 與空白 `name` 都回 `invalid_input`，並由 `make request-decoding-check` 固定 |
| Request body limit | `POST /jobs` body 由 `REQUEST_BODY_LIMIT_BYTES` 限制；超限回 `413 payload_too_large` |
| Queue backpressure | bounded queue 滿載時 service 回 `domain.ErrQueueFull`，HTTP API 對外回 `503 queue_full` |
| Error response | 統一使用 `{"error":{"code":"...","message":"..."}}` |
| Request timeout | `context.DeadlineExceeded` 對外回 `504 request_timeout`，避免被誤分類成 `internal_error` |
| Status enum | `pending`、`processing`、`done`、`failed` 不任意改名 |
| Breaking change | 新增版本路由或遷移期，不直接覆蓋既有合約 |
| OpenAPI sync | endpoint、schema、error code、auth / rate limit 邊界同步更新 `api/openapi.yaml` 與 `docs/api-contract.md` |

```bash
make openapi-check
cd .. && node scripts/check-openapi-contract.mjs
```

## Startup Configuration Contract

啟動設定也是 production 合約的一部分。`api-worker` 會先載入並驗證環境變數，設定錯誤時直接停止啟動，避免 staging / production 因 typo 或錯誤容量值而悄悄使用預設值。

| Env | 預設值 | 驗證規則 | 用途 |
|---|---:|---|---|
| `PORT` | `8080` | TCP port `1-65535` | HTTP listen port |
| `QUEUE_SIZE` | `64` | 正整數 | bounded queue 容量 |
| `WORKERS` | `4` | 正整數 | worker goroutine 數量 |
| `DATABASE_URL` | 空字串 | 空字串時使用 memory store | Postgres 連線字串 |
| `DATABASE_MAX_OPEN_CONNS` | `25` | 正整數 | Postgres 最大開啟連線數 |
| `DATABASE_MAX_IDLE_CONNS` | `10` | 正整數，且不可大於 `DATABASE_MAX_OPEN_CONNS` | Postgres idle connection 上限 |
| `DATABASE_CONN_MAX_LIFETIME` | `30m0s` | 正數 duration，例如 `30m`、`1h` | Postgres connection 最大生命週期 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 空字串 | 空字串時只用 stdout trace exporter | OTLP collector endpoint |
| `API_KEY` | 空字串 | 空字串時不啟用 API key；有值時 trim 後要求 Bearer token | 保護 `/jobs` 與 `/metrics` |
| `CORS_ALLOWED_ORIGINS` | 空字串 | comma-separated exact `http` / `https` origins；不可含 path / query / fragment | 瀏覽器前端跨域存取 allowlist |
| `REQUEST_BODY_LIMIT_BYTES` | `1048576` | 正整數 byte 數 | 限制 `POST /jobs` request body 大小 |
| `HTTP_READ_HEADER_TIMEOUT` | `3s` | 正數 duration | 限制讀取 request headers 的時間，降低 slowloris 風險 |
| `HTTP_READ_TIMEOUT` | `5s` | 正數 duration | 限制讀取整體 request body 的時間 |
| `HTTP_WRITE_TIMEOUT` | `10s` | 正數 duration | 限制 response 寫出時間 |
| `HTTP_IDLE_TIMEOUT` | `60s` | 正數 duration | 限制 keep-alive idle connection 佔用時間 |
| `HTTP_SHUTDOWN_TIMEOUT` | `5s` | 正數 duration | 收到 shutdown signal 後等待 HTTP server 停止的時間 |
| `QUEUE_DRAIN_TIMEOUT` | `10s` | 正數 duration | 收到 shutdown signal 後等待 worker queue drain 的時間 |
| `ENABLE_PPROF` | `false` | boolean；`true` 時必須同時有 `PPROF_TOKEN` 或 `API_KEY` | 短期啟用 `/debug/pprof/` diagnostics endpoint |
| `PPROF_TOKEN` | 空字串 | trim；空值時可沿用 `API_KEY`，但 `ENABLE_PPROF=true` 不可兩者皆空 | 保護 `/debug/pprof/` |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `120` | 正整數 | 每個 client IP 每分鐘可呼叫業務 endpoint 的次數 |
| `TRUSTED_PROXY_CIDRS` | 空字串 | comma-separated CIDR | 只有受信任代理來源才採用 `X-Forwarded-For` 第一個 IP |

```bash
cd production-api-worker
PORT=9090 QUEUE_SIZE=128 WORKERS=8 API_KEY=dev-secret DATABASE_MAX_OPEN_CONNS=40 DATABASE_MAX_IDLE_CONNS=12 DATABASE_CONN_MAX_LIFETIME=45m go run ./cmd/api-worker
go test ./internal/config -count=1
```

DB pool 設定不可藏在 repository 內硬編碼，因為 production 容量通常同時受 API concurrency、worker 數、Postgres `max_connections`、migration job 與維運連線影響。設定 loader 會先驗證 idle connection 不可大於 open connection，避免部署後才由資料庫壓力或連線耗盡暴露問題。

DB Pool Contract 不只檢查 config unit test。`make db-pool-check` 會固定 `OpenPostgresWithPool` 必須呼叫 `SetMaxOpenConns`、`SetMaxIdleConns`、`SetConnMaxLifetime`，且 `api-worker` 必須把 `cfg.DatabaseMaxOpenConns`、`cfg.DatabaseMaxIdleConns`、`cfg.DatabaseConnMaxLifetime` 傳入 repository，避免未來重構時退回 repository hard-code。

HTTP timeout 也不可只留在 `main.go` 的硬編碼。`HTTP_READ_HEADER_TIMEOUT` 保護慢速 header；`HTTP_READ_TIMEOUT` 與 request body limit 共同限制大型或慢速 body；`HTTP_WRITE_TIMEOUT` 避免 response 寫出卡住；`HTTP_IDLE_TIMEOUT` 控制 keep-alive 連線佔用；`HTTP_SHUTDOWN_TIMEOUT` 與 `QUEUE_DRAIN_TIMEOUT` 則固定 graceful shutdown 的最大等待時間。

## Diagnostics / pprof Contract

`/debug/pprof/` 是 production incident 的短期診斷工具，不是常駐公開 API。服務預設不註冊 pprof route；只有 `ENABLE_PPROF=true` 時才會開啟，且必須用 Bearer token 保護。

| 狀態 | 行為 |
|---|---|
| `ENABLE_PPROF=false` | `/debug/pprof/` 不註冊，請求回 404 |
| `ENABLE_PPROF=true` 且未設定 `PPROF_TOKEN` / `API_KEY` | 啟動設定 fail fast |
| `ENABLE_PPROF=true` 且未帶 token | `/debug/pprof/` 回 `401 unauthorized` |
| `ENABLE_PPROF=true` 且帶 `Authorization: Bearer <token>` | 可讀 profile index、CPU profile、trace 等 diagnostics endpoint |

```bash
ENABLE_PPROF=true PPROF_TOKEN=debug-token go run ./cmd/api-worker
curl -H 'Authorization: Bearer debug-token' http://localhost:8080/debug/pprof/
curl -H 'Authorization: Bearer debug-token' 'http://localhost:8080/debug/pprof/profile?seconds=30' -o profile.pb.gz
go tool pprof profile.pb.gz
```

正式部署時應再加上 VPN、內網來源限制或 gateway policy。診斷完成後要關閉 `ENABLE_PPROF`，避免 heap、goroutine、cmdline 或 trace 資訊長期暴露。

## Rate Limit Contract

Rate limit 是 API 操作保護，不是商業授權邏輯。`production-api-worker` 使用固定 window 的 per-client IP 限速保護 `/jobs` 與 `/jobs/{id}`；health endpoint 保持不受影響，避免 load balancer、Docker Compose 或 Kubernetes 探測被誤擋。

| 狀態 | 行為 |
|---|---|
| 未超過限制 | 正常進入 handler 與 service |
| 超過 `RATE_LIMIT_REQUESTS_PER_MINUTE` | 回 `429 Too Many Requests` |
| Error envelope | `{"error":{"code":"rate_limited","message":"rate limited"}}` |
| Header | 保留 `X-Request-ID`，並回 `Retry-After: 60` |
| Trusted proxy | `TRUSTED_PROXY_CIDRS` 空值時不信任 `X-Forwarded-For`；CIDR 命中時採用第一個 forwarded IP |
| Test gate | `TestRateLimitContract`、`TestRateLimitTrustedProxyContract` |

```bash
RATE_LIMIT_REQUESTS_PER_MINUTE=120 go run ./cmd/api-worker
TRUSTED_PROXY_CIDRS=10.0.0.0/8 RATE_LIMIT_REQUESTS_PER_MINUTE=120 go run ./cmd/api-worker
go test ./internal/config ./internal/api -run 'TestLoadFromLookup|TestRateLimitContract|TestRateLimitTrustedProxyContract' -count=1
make rate-limit-check
make trusted-proxy-check
```

正式環境若位於 Nginx、Envoy、API Gateway 或 Kubernetes ingress 後方，只能把代理所在的內部 CIDR 放進 `TRUSTED_PROXY_CIDRS`。服務直接暴露時保持空值，避免外部 client 自行送 `X-Forwarded-For` 繞過限速。Trusted Proxy Client IP Contract 由 `make trusted-proxy-check` / `node scripts/check-trusted-proxy-contract.mjs` 固定 `TRUSTED_PROXY_CIDRS`、`X-Forwarded-For`、untrusted `RemoteAddr` fallback 與 `TestRateLimitTrustedProxyContract`。

## OTLP Collector Contract

OpenTelemetry 不能只停在程式碼呼叫 `Tracer.Start`。教學環境至少要固定 receiver、exporter、Compose endpoint 與 CI 檢查，避免 trace 設定在版本更新後失效。

| 邊界 | 合約 |
|---|---|
| Collector config | `production-api-worker/otel-collector.yaml` |
| Receiver | OTLP gRPC `0.0.0.0:4317` |
| Local exporter | `debug exporter`，教學環境輸出基本 trace 訊號 |
| Compose endpoint | `OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317` |
| Host port | `4317:4317` 供本機測試與替換 backend 使用 |
| Verification | `make otel-check` 或 `node scripts/check-otel-collector-contract.mjs` |

```bash
cd production-api-worker
make otel-check
docker compose config
```

正式環境通常會把 exporter 換成 OTLP backend、Tempo、Jaeger 或雲端 APM。替換時應保留 receiver、pipeline 與服務端 endpoint 的合約，並在 runbook 註明資料保留期限、取樣率與敏感欄位處理策略。

## API Security Contract

`API_KEY` 是教學用的最小 production security gate。它不取代正式 IAM、OAuth2、mTLS 或 API gateway，但能把「公開 health endpoint」與「受保護業務 / metrics endpoint」的邊界寫成可測合約。

| Endpoint | `API_KEY` 空值 | `API_KEY` 有值 |
|---|---|---|
| `POST /jobs` | 不要求認證 | 需 `Authorization: Bearer <API_KEY>` |
| `GET /jobs/{id}` | 不要求認證 | 需 `Authorization: Bearer <API_KEY>` |
| `GET /metrics` | 不要求認證 | 需 `Authorization: Bearer <API_KEY>` |
| `GET /livez` / `GET /readyz` | 公開 | 公開，供 LB / orchestrator 探測 |

所有 response 會帶上 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY` 與 `Referrer-Policy: no-referrer`。啟用 API key 後重跑 smoke test 時，host 端也要帶同一個環境變數：

```bash
API_KEY=dev-secret docker compose up -d --build
API_KEY=dev-secret make compose-smoke
docker compose down -v
```

## Migration Contract

Migration CLI 是 deployment pipeline 的一部分，不應只是逐檔執行 SQL。`cmd/migrate` 會先驗證 migration 專用設定，再建立 `schema_migrations` table，略過已套用版本，並用 transaction 套用每一個新的 SQL 檔。

| Env | 預設值 | 驗證規則 | 用途 |
|---|---:|---|---|
| `DATABASE_URL` | 無 | 必填，空值 fail fast | migration 連線目標 |
| `MIGRATIONS_DIR` | `migrations` | 不可為空白 | SQL migration 目錄 |
| `MIGRATION_TIMEOUT` | `30s` | 正數 duration | migration ping / apply deadline |

| 規則 | 行為 |
|---|---|
| SQL 檔排序 | 依檔名排序，例如 `001_init.sql` 先於 `002_add_index.sql` |
| Version | 取檔名去掉 `.sql`，不可空白、不可含 whitespace |
| 已套用版本 | `schema_migrations.version` 已存在時略過 |
| 新版本 | 在單一 transaction 內執行 SQL 並寫入 `schema_migrations` |
| Regression test | `go test ./internal/config ./internal/migration -count=1` |
| Static gate | `make migration-check` 或 repo root 執行 `node scripts/check-migration-contract.mjs` |

## Observability Correlation

每個 HTTP request 都會保留 client 提供的 `X-Request-ID`，若未提供則由 server 產生 `req-*` 格式 ID。Handler 會把同一個 ID 放進 response header、request context、structured log 欄位與 trace attribute，讓 API 錯誤、worker 行為、Prometheus route label 與 OTLP span 可以在 incident review 時對起來。

| 關聯點 | 目前策略 |
|---|---|
| Response header | 永遠回傳 `X-Request-ID` |
| Log 欄位 | `request_id`、`method`、`route`、`error_code` |
| Trace attribute | `request.id`、`http.route` |
| Contract test | `TestRequestIDContract` 與 `TestCreateJobContract` 固定 header 行為 |
| Static gate | `make request-correlation-check` / `node scripts/check-request-correlation-contract.mjs` 固定文件、OpenAPI、測試與 CI 入口 |

## Prometheus Local Monitoring

本專案提供最小 Prometheus profile，讓 alert rules 不只存在於檔案，也能被本地 Prometheus 載入。此 profile 供教學與 smoke review 使用，不宣稱取代正式監控平台。

| Artifact | 用途 |
|---|---|
| `../configs/prometheus/prometheus.yml` | 固定 `production-api-worker` scrape job、`/metrics` path 與 alert rule 載入 |
| `../configs/prometheus/production-api-worker-alerts.yml` | 固定 5xx、queue depth、worker latency 與 metrics missing 告警 |
| `make prometheus-check` | 靜態檢查 Prometheus config、Compose profile、README、runbook 與 CI 入口 |

```bash
cd production-api-worker
docker compose --profile monitoring up -d --build
open http://localhost:9090
docker compose down -v
```

若啟用 `API_KEY`，Prometheus scrape 必須同步設計 Bearer token 或 bearer token file。教學 profile 預設使用未設定 `API_KEY` 的 local mode，避免把密碼寫進 `prometheus.yml`。

## Panic Recovery Contract

Production API 不能讓未預期 panic 直接中斷連線或回傳非 JSON 錯誤頁。Routes 會先建立 request context，再經過 metrics 與 recover middleware；若 handler、service 或 queue 發生 panic，server 會記錄 structured log，保留原 `X-Request-ID`，並回傳穩定錯誤 envelope。

| 項目 | 行為 |
|---|---|
| HTTP status | `500 Internal Server Error` |
| Error envelope | `{"error":{"code":"internal_error","message":"internal error"}}` |
| Request ID | client 提供的 `X-Request-ID` 仍會原樣回傳 |
| Metrics | 仍可記錄 `/jobs`、method 與 `Internal Server Error` status label |
| Contract test | `TestPanicRecoveryContract` 固定 panic recovery 行為 |
| Static gate | `make panic-recovery-check` / `node scripts/check-panic-recovery-contract.mjs` 固定文件、OpenAPI、測試與 CI 入口 |

## Request Timeout Contract

Handler 內部會用 request-scoped timeout 保護 service 呼叫。若 deadline exceeded，對外應回穩定 timeout 合約，而不是落到未分類 `500 internal_error`。

| 項目 | 行為 |
|---|---|
| HTTP status | `504 Gateway Timeout` |
| Error envelope | `{"error":{"code":"request_timeout","message":"request timeout"}}` |
| Request ID | client 提供的 `X-Request-ID` 仍會原樣回傳 |
| Contract test | `TestRequestTimeoutContract` 固定 timeout 外部行為 |
| Static gate | `make request-timeout-check` / `node scripts/check-request-timeout-contract.mjs` 固定文件、OpenAPI、測試與 CI 入口 |

## Service Lifecycle

Production shutdown 不是單純收到 signal 就結束 process。`api-worker` 的 Shutdown Signal Contract 必須同時處理 local Ctrl+C 的 SIGINT 與 orchestrator / Docker / Kubernetes rolling deploy 常用的 SIGTERM。收到中斷訊號後會先把 readiness 標成 draining，讓 `/readyz` 回 `503 Service Unavailable`，再呼叫 `http.Server.Shutdown` 停止接新 request，最後等待 worker queue drain。

| 階段 | 行為 |
|---|---|
| Ready | `/livez=200`、`/readyz=200`，可接受 API request |
| Signal | SIGINT/SIGTERM 皆需進入同一套 draining 流程 |
| Draining | `/livez=200`、`/readyz=503`，外部 load balancer 應停止導流 |
| HTTP shutdown | `http.Server.Shutdown` 最多等待 5 秒讓既有 request 完成 |
| Queue drain | `Queue.ShutdownContext` 最多等待 10 秒處理已排入工作 |
| Forced cancel | drain 超時才取消 worker context，避免 shutdown 無限卡住 |

### Readiness Lifecycle Contract

Readiness contract 是 deployment 的外部合約。`/livez` 表示 process 還活著，必須公開且回 `200`；`/readyz` 表示是否可接新流量，ready 時回 `200`，draining 時回 `503 Service Unavailable`。這讓 load balancer 或 orchestrator 可以在 rolling deploy 時先停止導流，再讓既有 HTTP request 與 queue 工作收斂。

| 項目 | 合約 |
|---|---|
| Liveness | `GET /livez` 公開，回 `200` |
| Readiness ready | `GET /readyz` 公開，ready 時回 `200` |
| Readiness draining | `GET /readyz` draining 時回 `503`，body 含 `draining` |
| Go test | `TestReadinessContract`、`TestReadinessSwitchesToDraining` |
| Static gate | `make readiness-check` 或 repo root 執行 `node scripts/check-readiness-contract.mjs` |

`Queue.Enqueue` 與 `Queue.ShutdownContext` 共用同一個 mutex 保護 `closed` 狀態、channel send 與 channel close。這個邊界確保 shutdown 開始後的新 enqueue 會得到 `worker.ErrClosed`，不會在高併發關閉期間觸發 `send on closed channel` panic。

## Retry Cancellation

資料庫 deadlock retry 不能只用固定 `time.Sleep`。Production request 可能已經 timeout、client 已經斷線，或 shutdown context 已開始取消；此時 service 應停止 backoff 與後續交易重試，避免把已取消的 request 延長成背景工作。

| 場景 | 行為 |
|---|---|
| deadlock 後 context 仍有效 | 進入短 backoff，再重試交易 |
| backoff 期間 context canceled | 立即回傳 `context.Canceled` 或 `context.DeadlineExceeded` |
| retry 已停止 | 不再 enqueue job，也不再建立後續交易 |
| Regression test | `TestCreateJobStopsDeadlockRetryWhenContextCanceled` |

## Performance Diagnostics

| 場景 | 建議工具 |
|---|---|
| API handler CPU 高 | `go tool pprof` CPU profile |
| queue 或 worker throughput 下降 | benchmark A/B + `benchstat` |
| worker goroutine 數量異常 | goroutine profile + `/sched/goroutines:goroutines` |
| repository lock contention | mutex profile |
| request latency 長尾 | OpenTelemetry span + execution trace |

## Operational Runbook

| 項目 | 文件 / 設定 |
|---|---|
| Runbook | `docs/operational-runbook.md` |
| OpenAPI contract | `api/openapi.yaml` |
| OpenAPI check | `make openapi-check` 或從 repo root 執行 `node scripts/check-openapi-contract.mjs` |
| Prometheus alert rules | `../configs/prometheus/production-api-worker-alerts.yml` |
| Prometheus scrape config | `../configs/prometheus/prometheus.yml` |
| Runbook check | `make runbook-check` 或從 repo root 執行 `node scripts/check-operational-runbook.mjs` |
| Prometheus config check | `make prometheus-check` 或從 repo root 執行 `node scripts/check-prometheus-config.mjs` |
| 主要 SLI | API 5xx rate、worker p95 latency、queue depth、readiness、metrics scrape |
| Incident correlation | `X-Request-ID`、route label、structured log、OpenTelemetry span |

告警觸發時先用 `api_requests_total`、`worker_queue_depth`、`worker_job_duration_seconds` 判斷影響範圍，再用 `X-Request-ID` 追 log / trace。若行為涉及外部合約，先重跑 `make ci-contract` 與 compose smoke，再決定 rollback、drain 或容量調整。
