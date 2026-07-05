# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
- API contract：穩定 request/response/error schema，文件在 `docs/api-contract.md`
- OpenAPI contract：machine-readable schema 位於 `api/openapi.yaml`，用來對齊文件、測試、SDK、前端 mock 與 API contract scope coverage
- Readiness Lifecycle Contract：`/livez` 永遠公開回 `200`；`/readyz` ready 時回 `200`、draining 時回 `503`，並由 `make readiness-check` 固定文件、OpenAPI、Go tests 與 CI 入口
- Request correlation contract：`X-Request-ID` 需同時進入 response header、request context、structured log 與 trace attribute
- API Security Contract：可用 `API_KEY` 啟用 Bearer token 保護 `/jobs` 與 `/metrics`，health endpoint 保持公開，並由靜態 gate 固定文件、OpenAPI、Go tests 與 CI 入口
- CORS Allowlist Contract：`CORS_ALLOWED_ORIGINS` 預設空值；只有明確列入的 exact origin 才回 CORS header
- Request Body Limit Contract：`REQUEST_BODY_LIMIT_BYTES` 預設 1048576；`POST /jobs` 超限回 `413 payload_too_large`
- HTTP Server Timeout Contract：`HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 集中設定並 fail fast
- Startup Configuration Contract：`PORT`、`QUEUE_SIZE`、`WORKERS` 與 optional endpoint 集中驗證，錯誤設定 fail fast，並由 `make startup-config-check` 固定文件、測試、Makefile 與 CI 入口
- Worker Failure Contract：worker processor 成功/失敗都記錄 duration，並以 `worker_jobs_total{result="success|failed"}` 固定可觀測結果
- Worker Shutdown Contract：`Queue.Enqueue` 與 `Queue.ShutdownContext` 共用 mutex 保護 close / send 邊界；shutdown 後新 enqueue 回 `worker.ErrClosed`，並由 `make worker-shutdown-check` 固定
- Retry Cancellation Contract：deadlock retry backoff 必須尊重 `context` cancellation / deadline，取消後不得繼續交易或 enqueue
- Queue Backpressure Contract：bounded queue 滿載時回 `domain.ErrQueueFull`，API 對外回 `503 queue_full`，並記錄 `worker_jobs_total{result="dropped"}`
- Diagnostics / pprof contract：`ENABLE_PPROF` 預設關閉；啟用 `/debug/pprof/` 時必須提供 `PPROF_TOKEN` 或沿用 `API_KEY`
- Rate limit contract：`RATE_LIMIT_REQUESTS_PER_MINUTE` 依 client IP 保護 `/jobs` 與 `/jobs/{id}`，超限回 `429 rate_limited`
- Trusted Proxy Client IP Contract：`TRUSTED_PROXY_CIDRS` 預設空值；只有信任代理來源才採用 `X-Forwarded-For` 第一個 IP，並由 `make trusted-proxy-check` 固定文件、runbook、測試、Makefile 與 CI 入口
- Shutdown Signal Contract：`api-worker` 同時監聽 SIGINT / SIGTERM，收到訊號後才進入 draining、HTTP shutdown 與 queue drain
- Request Decoding Contract：拒絕 malformed JSON、unknown field、trailing JSON value 與空白 name，並由 `make request-decoding-check` 固定文件、OpenAPI、測試與 CI 入口
- Idempotency Key Contract：`POST /jobs` 支援 `Idempotency-Key` header；同一 key 的 client retry 回同一個 job 且不重複 enqueue，並由 `make idempotency-key-check` 固定 memory/Postgres、migration、OpenAPI、測試與 CI 入口
- API Latency Metrics Contract：`api_request_duration_seconds` 必須用 `route`、`method`、`status` 標籤輸出 HTTP latency，並由 `make api-latency-metrics-check` 固定 runtime、測試、文件與 CI 入口
- Service Transaction Boundary Contract：`sql.TxOptions{Isolation: sql.LevelReadCommitted}`、context-aware deadlock retry、commit 後 queue enqueue、queue-full failed 狀態回寫，並由 `make service-transaction-boundary-check` / `TestServiceTransactionBoundaryContract` 固定
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
- Operational Runbook Scope Freshness Contract：Operational runbook scope freshness contract gate 固定 runbook metadata、API contract scope coverage、Docs publishing contract gate、Release artifact chain contract gate、Secret handling governance contract gate 與 Supply chain artifact governance contract gate，並由 `make operational-runbook-scope-check` / `node scripts/check-operational-runbook-scope-contract.mjs` 固定
- Prometheus Config Contract：scrape config、alert rule loading、Compose monitoring profile 與 API key scrape auth 風險需由 `make prometheus-check` 固定
- Operational Observability Contract：runbook、Prometheus scrape config、alert rules、Compose monitoring profile 與 API key scrape auth risk 需由 `make operational-observability-check` 固定
- OTLP Export Governance Contract：local `debug exporter` 只供教學；正式 Tempo、Jaeger、OTLP backend 或雲端 APM 替換需保留 sampling rate、retention window、sensitive attribute redaction 與 trace data owner，並由 `make otel-export-governance-check` 固定
- Secret Handling Governance Contract：`API_KEY`、`PPROF_TOKEN`、Prometheus bearer token file、secret mount、secret rotation owner、no hard-coded production credentials 與 incident artifact redaction 必須由 `make secret-handling-governance-check` / `node scripts/check-secret-handling-governance-contract.mjs` 固定
- Supply Chain Artifact Governance Contract：release promotion 需保留 SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner，並由 `make supply-chain-artifact-governance-check` / `node scripts/check-supply-chain-artifact-governance-contract.mjs` 固定
- Platform Promotion Policy Contract：實際部署平台需保留 platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner，並由 `make platform-promotion-policy-check` / `node scripts/check-platform-promotion-policy-contract.mjs` 固定
- Deployment Controller Config Contract：實際部署需保留 deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger 與 promotion evidence，並由 `make deployment-controller-config-check` / `node scripts/check-deployment-controller-config-contract.mjs` 固定
- Trace Shutdown Contract：trace provider shutdown 必須使用 3 秒 bounded context；`api-worker` process exit 需呼叫 `obs.Shutdown(context.Background())`，並由 `make trace-shutdown-check` / `TestTraceShutdownContract` 固定
- Pipeline：migration CLI、Docker Compose、GitHub Actions workflow、Docker image build gate、Compose smoke gate
- CI Quality Gate Contract：GitHub Actions 必須保留 root course、production contracts、`go mod verify`、`go test -race -cover`、`govulncheck ./...`、Docker build 與 Compose smoke，並由 `make ci-quality-gate-check` 固定文件、Makefile 與 CI 入口
- CI Contract Parity Gate：`make ci-contract` 與 GitHub Actions production contract job 必須使用相同 API test selector，包含 `TestCORSAllowedOriginsContract`，並由 `make ci-contract-parity-check` 固定
- Contract Gate Inventory：48 個 root contract checker 必須全部被 GitHub Actions 呼叫，並由 `make contract-gate-inventory-check` / `node scripts/check-contract-gate-inventory-contract.mjs` 固定 Makefile、README、API contract、章節與整合視覺課程入口
- Docs Publishing Contract：`docs/index.html`、GitHub Pages link fix 與 HTML 主頁教程回鏈必須由 `make docs-publishing-check` / `node scripts/check-docs-publishing-contract.mjs` 固定，避免 Pages 首頁與整合課程來源漂移
- Production Workflow Contract：`production-api-worker/.github/workflows/production-api-worker.yml` 必須保留 `make ci-contract`、race/coverage、govulncheck、Docker build、Compose smoke、failure logs 與 cleanup，並由 `make production-workflow-check` 固定
- Syntax Flow SVG Contract：語法流程圖補充頁必須保留 25 個單語法 flow、標準流程圖符號、SVG metadata 與 blueprint renderer，並由 `make syntax-flow-svg-check` / `node scripts/check-syntax-flow-svg-contract.mjs` 固定
- Go ReleaseNote Contract：Go 1.1-1.26 專業報告、根目錄與 Pages 同步、官方來源、支援狀態與最新 patch 訊號必須由 `make go-release-notes-check` / `node scripts/check-go-release-notes-contract.mjs` 固定
- Release Artifact Chain Contract：發版需保留同 timestamp 的審查報告、內容需要更新的部分、更新資料、版本標記與 docs/index 同步，並由 `make release-artifact-chain-check` / `node scripts/check-release-artifact-chain-contract.mjs` 固定
- Dependency Governance Contract：root module 與 production module 都需保留 `go mod tidy`、`go mod verify`、`go list -m -u all`、`govulncheck ./...` 與離線限制說明，並由 `make dependency-governance-check` / `node scripts/check-dependency-governance-contract.mjs` 固定
- Performance Benchmark Governance Contract：API / worker / queue hot path 修改需保留 benchmark A/B、`benchstat old.txt new.txt`、pprof 或 metrics 證據，並由 `make performance-benchmark-governance-check` / `node scripts/check-performance-benchmark-governance-contract.mjs` 固定
- Release Rollback Drill Contract：release promotion 或 incident rollback 需保留 rollback decision、previous image restore、migration rollback boundary、health verification、metrics verification 與 postmortem evidence，並由 `make release-rollback-drill-check` / `node scripts/check-release-rollback-drill-contract.mjs` 固定
- Docker Build Contract：Dockerfile 必須保留 multi-stage build、`CGO_ENABLED=0`、`api-worker` / `migrate` binaries、`distroless/static-debian12` runtime image、`docker build -t production-api-worker:ci ./production-api-worker` 與 `docker build -t production-api-worker:standalone .`，並由 `make docker-build-check` / `node scripts/check-docker-build-contract.mjs` 固定
- Compose Runtime Env Contract：`docker-compose.yml` 必須保留 Postgres、migrate、api、OTEL collector、Prometheus `monitoring` profile、`DATABASE_URL`、`OTEL_EXPORTER_OTLP_ENDPOINT`、`API_KEY`、`REQUEST_BODY_LIMIT_BYTES`、`TRUSTED_PROXY_CIDRS`、`CORS_ALLOWED_ORIGINS` 與 service dependency，並由 `make compose-runtime-env-check` / `node scripts/check-compose-runtime-env-contract.mjs` 固定
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
  -H 'Idempotency-Key: demo-retry-key-1' \
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
go test ./internal/api ./internal/app -run 'TestIdempotencyKeyContract|TestCreateJobIdempotencyKeyContract' -count=1
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
make idempotency-key-check
make runbook-check
make prometheus-check
make pprof-check
make rate-limit-check
make trusted-proxy-check
make cors-check
make request-body-limit-check
make http-timeout-check
make startup-config-check
make request-correlation-check
make api-security-check
make worker-failure-check
make retry-cancellation-check
make queue-backpressure-check
make shutdown-signal-check
make ci-quality-gate-check
make ci-contract-parity-check
make production-workflow-check
make syntax-flow-svg-check
make go-release-notes-check
make compose-smoke-check
go test -run='^$' -bench=. -benchmem -count=10 ./... > bench.txt
docker compose up --build
make compose-smoke
```

| Gate | 目的 |
|---|---|
| `.github/workflows/ci.yml` | 固定 root module、production contract、race/coverage、govulncheck 與 Docker build，避免 release gate 只停在文件 |
| `production-api-worker/.github/workflows/production-api-worker.yml` | 固定 standalone production workflow 也保留 contract tests、race/coverage、govulncheck、Docker build、Compose smoke、failure logs 與 cleanup |
| `make syntax-flow-svg-check` | 固定語法流程圖補充頁保留 25 個 flow、標準流程圖符號、SVG metadata、blueprint renderer、Makefile 與 CI 入口 |
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
| `go test ./internal/api ./internal/app -run 'TestIdempotencyKeyContract|TestCreateJobIdempotencyKeyContract' -count=1` | 固定 `Idempotency-Key` 重試回同一 job，且不重複 enqueue |
| `make idempotency-key-check` | 固定 Idempotency Key Contract、memory/Postgres repository、migration unique index、OpenAPI、README、章節與 CI 入口 |
| `go test ./internal/app -run 'TestServiceTransactionBoundaryContract' -count=1` | 固定 service transaction boundary、LevelReadCommitted、commit 後 enqueue 與 queue-full failed 回寫 |
| `make service-transaction-boundary-check` | 固定 Service Transaction Boundary Contract、Go tests、README、API contract、章節、整合教程與 CI 入口 |
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
| `make secret-handling-governance-check` | 固定 Secret Handling Governance Contract、`API_KEY`、`PPROF_TOKEN`、bearer token file、secret mount、secret rotation owner、no hard-coded production credentials 與 incident artifact redaction |
| `make supply-chain-artifact-governance-check` | 固定 Supply Chain Artifact Governance Contract、SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner |
| `make platform-promotion-policy-check` | 固定 Platform Promotion Policy Contract、platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner |
| `make deployment-controller-config-check` | 固定 Deployment Controller Config Contract、deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger 與 promotion evidence |
| `make runbook-check` | 固定 SLI/SLO、Prometheus alert rules、incident workflow 與 runbook link 不被移除 |
| `make prometheus-check` | 固定 Prometheus Config Contract、scrape config、rule_files、Compose monitoring profile、API key scrape auth 風險與 README/runbook 入口 |
| `make operational-observability-check` | 固定 runbook、Prometheus scrape config、alert rules、Compose monitoring profile、API key scrape auth 風險與 CI 入口 |
| `make pprof-check` | 固定 pprof diagnostics contract、`ENABLE_PPROF`、`PPROF_TOKEN`、runbook、Go tests 與 CI 入口 |
| `make trace-shutdown-check` | 固定 Trace Shutdown Contract、`TestTraceShutdownContract`、observability shutdown deadline、api-worker exit hook、文件與 CI 入口 |
| `make rate-limit-check` | 固定 rate limit contract、`RATE_LIMIT_REQUESTS_PER_MINUTE`、OpenAPI、Go tests、README 與 CI 入口 |
| `make cors-check` | 固定 CORS allowlist contract、`CORS_ALLOWED_ORIGINS`、OpenAPI、Go tests、README 與 CI 入口 |
| `make request-body-limit-check` | 固定 request body limit contract、`REQUEST_BODY_LIMIT_BYTES`、OpenAPI、Go tests、README 與 CI 入口 |
| `make http-timeout-check` | 固定 HTTP server timeout contract、timeout env、main server 套用、Go tests、README、API contract 與 CI 入口 |
| `make startup-config-check` | 固定 Startup Configuration Contract、`PORT`、`QUEUE_SIZE`、`WORKERS`、optional endpoint、config tests、README、API contract 與 CI 入口 |
| `make worker-failure-check` | 固定 worker failure contract、result metric、duration、Go tests、README 與 CI 入口 |
| `make worker-shutdown-check` | 固定 Worker Shutdown Contract、`ErrClosed`、`TestConcurrentEnqueueAndShutdownDoesNotPanic`、README、API contract 與 CI 入口 |
| `make retry-cancellation-check` | 固定 retry cancellation contract、deadlock backoff、context cancellation、Go test、README 與 CI 入口 |
| `make queue-backpressure-check` | 固定 queue backpressure contract、`domain.ErrQueueFull`、`503 queue_full`、dropped metric、Go tests、README 與 CI 入口 |
| `make db-pool-check` | 固定 DB Pool Contract、`DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS`、`DATABASE_CONN_MAX_LIFETIME`、repository pool 套用與 CI 入口 |
| `make migration-check` | 固定 Migration Contract、`DATABASE_URL`、`MIGRATIONS_DIR`、`MIGRATION_TIMEOUT`、`schema_migrations`、transaction apply、Go tests 與 CI 入口 |
| `make request-correlation-check` | 固定 request id middleware、OpenAPI request id header、contract tests、章節與 CI 靜態檢查入口 |
| `make api-security-check` | 固定 API key auth middleware、security headers、OpenAPI bearerAuth、contract tests、章節與 CI 靜態檢查入口 |
| `make shutdown-signal-check` | 固定 shutdown signal contract、SIGINT/SIGTERM、main test、README、API contract 與 CI 入口 |
| `make ci-contract-parity-check` | 固定 CI Contract Parity Gate，確認 `make ci-contract` 與 GitHub Actions production contract job 都涵蓋 `TestCORSAllowedOriginsContract` |
| `make docs-publishing-check` | 固定 Docs Publishing Contract、`docs/index.html`、GitHub Pages link fix、HTML 主頁教程回鏈、Makefile 與 CI 入口 |
| `make production-workflow-check` | 固定 Production Workflow Contract、standalone workflow、contract tests、race/coverage、govulncheck、Docker build、Compose smoke、failure logs 與 cleanup |
| `make syntax-flow-svg-check` | 固定 Syntax Flow SVG Contract、語法補充頁、25 個 flow、標準流程圖符號、SVG metadata、blueprint renderer 與 CI 入口 |
| `make go-release-notes-check` | 固定 Go ReleaseNote Contract、Go 1.1-1.26 報告、27 個 HTML、官方來源、最新 patch 訊號與 Pages 同步 |
| `make release-artifact-chain-check` | 固定 Release Artifact Chain Contract、審查報告、內容需要更新的部分、更新資料、版本標記與 docs/index 同步 |
| `make dependency-governance-check` | 固定 Dependency Governance Contract、module integrity、dependency update discovery、vulnerability scan、離線限制、Makefile 與 CI 入口 |
| `make supply-chain-artifact-governance-check` | 固定 Supply Chain Artifact Governance Contract、SBOM、image signing、provenance / attestation、artifact retention、promotion approval、release evidence owner 與 CI 入口 |
| `make platform-promotion-policy-check` | 固定 Platform Promotion Policy Contract、platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification、rollback owner 與 CI 入口 |
| `make deployment-controller-config-check` | 固定 Deployment Controller Config Contract、deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger、promotion evidence 與 CI 入口 |
| `make performance-benchmark-governance-check` | 固定 Performance Benchmark Governance Contract、benchmark A/B、benchstat、pprof、metrics、Makefile 與 CI 入口 |
| `make release-rollback-drill-check` | 固定 Release Rollback Drill Contract、rollback decision、previous image restore、migration rollback boundary、health verification、metrics verification、postmortem evidence 與 CI 入口 |
| `make docker-build-check` | 固定 Docker Build Contract、Dockerfile、`CGO_ENABLED=0`、`api-worker` / `migrate` binaries、`distroless/static-debian12`、Makefile 與 CI build tags |
| `make compose-smoke-check` | 固定 Compose Smoke Contract、host-side smoke script、`/livez`、`/readyz`、job create/read、`/metrics`、失敗 logs、Makefile 與 CI 入口 |
| `make compose-runtime-env-check` | 固定 Compose Runtime Env Contract、`docker-compose.yml` runtime env、migration dependency、OTEL endpoint、API security env、request limit、trusted proxy、CORS 與 monitoring profile |
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

Supply chain artifact governance contract gate 固定 release promotion 不能只看測試通過或 Docker build 成功。正式發版需保留 SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner，並由 `make supply-chain-artifact-governance-check` / `node scripts/check-supply-chain-artifact-governance-contract.mjs` 固定文件、Makefile、CI、API contract、OpenAPI、章節與整合教程入口。

Platform promotion policy contract gate 固定實際部署平台不能只停在 artifact 產出。正式 promotion 需保留 platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner，並由 `make platform-promotion-policy-check` / `node scripts/check-platform-promotion-policy-contract.mjs` 固定文件、Makefile、CI、API contract、OpenAPI、runbook、章節與整合教程入口。

`production-api-worker/docs/operational-runbook.md` 是值班與 incident review 的教學入口；`configs/prometheus/production-api-worker-alerts.yml` 是對應的 Prometheus alert rule 範例，`configs/prometheus/prometheus.yml` 則示範本地 scrape job 與 `rule_files` 載入。這些檔案分別由根目錄 `node scripts/check-operational-runbook.mjs`、`node scripts/check-prometheus-config-contract.mjs` 與 `node scripts/check-pprof-contract.mjs` 固定，避免 observability 只剩 log / metrics 概念而沒有可操作告警、排障與受控 diagnostics 流程。

本機修改 production 行為前，至少先跑：

```bash
cd production-api-worker
make ci-contract
make ci-contract-parity-check
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

Compose runtime env static gate 需包含：

```bash
make compose-runtime-env-check
cd .. && node scripts/check-compose-runtime-env-contract.mjs
```

這個 gate 固定 `docker-compose.yml` 的 Postgres、migration、API、OTEL collector 與 Prometheus monitoring profile，也固定 `DATABASE_URL`、`OTEL_EXPORTER_OTLP_ENDPOINT`、`API_KEY`、`REQUEST_BODY_LIMIT_BYTES`、`TRUSTED_PROXY_CIDRS`、`CORS_ALLOWED_ORIGINS` 等 runtime env，避免部署設定被 smoke test 間接覆蓋但沒有單獨的漂移檢查。

CI contract parity gate 需包含：

```bash
make ci-contract-parity-check
cd .. && node scripts/check-ci-contract-parity-contract.mjs
```

這個 gate 固定 `make ci-contract` 和 GitHub Actions `production-contract` job 的 API test selector 完全一致，特別是 `TestCORSAllowedOriginsContract` 不能只存在於 CI workflow 或單獨 `make cors-check`。

Contract Gate Inventory 需包含：

```bash
make contract-gate-inventory-check
cd .. && node scripts/check-contract-gate-inventory-contract.mjs
```

這個 gate 會盤點 root `scripts/check-*-contract.mjs`，確認 48 個 root contract checker 全部被 `.github/workflows/ci.yml` 呼叫，避免新增 checker 後只留在 repo、沒有進入 release gate。

Production Workflow Contract 需包含：

```bash
make production-workflow-check
cd .. && node scripts/check-production-workflow-contract.mjs
```

`production-api-worker/.github/workflows/production-api-worker.yml` 是 tracked standalone workflow。若未來把 production worker 抽成獨立 repo，這個 workflow 不應退化成只跑 `go test`；它必須保留 `make ci-contract`、`go test -race -cover ./... -count=1`、`govulncheck ./...`、Docker build、Compose smoke、failure logs 與 cleanup。

Docs Publishing Contract 需包含：

```bash
make docs-publishing-check
cd .. && node scripts/check-docs-publishing-contract.mjs
```

這個 gate 會固定 `docs/index.html` 已套用 GitHub Pages link fix，並確認所有 HTML 教材頁保留可解析到 `docs/index.html` 的「主頁教程」回鏈。

Syntax Flow SVG Contract 需包含：

```bash
make syntax-flow-svg-check
cd .. && node scripts/check-syntax-flow-svg-contract.mjs
```

這個 gate 會固定 `docs/golang-syntax-application-svg.html` 與整合來源都保留 25 個單語法流程圖、Start/End、Input/Output、Decision、Process 等標準流程圖符號、`aria-labelledby` SVG metadata 與 blueprint renderer，避免視覺化教材退回靜態截圖或缺少可存取性描述。

Go ReleaseNote Contract 需包含：

```bash
make go-release-notes-check
cd .. && node scripts/check-go-release-notes-contract.mjs
```

這個 gate 會固定 `scripts/generate-go-release-notes.mjs`、`ReleaseNote/` 與 `docs/ReleaseNote/`：Go 1.1-1.26 共 27 個 HTML 必須存在且 Pages 版逐檔一致，每個版本頁需保留 `Executive Summary`、`官方段落覆蓋矩陣`、`新增功能列表`、`Patch Revisions`、官方來源與回主頁入口，Go 1.25 / Go 1.26 頁也必須保留 Go 1.25.11 / Go 1.26.4 的 2026-06-02 patch 訊號。

Release Artifact Chain Contract 需包含：

```bash
make release-artifact-chain-check
cd .. && node scripts/check-release-artifact-chain-contract.mjs
```

這個 gate 會固定每次 release 的三段式 artifact chain：`審查報告/`、`內容需要更新的部分/`、`更新資料/` 必須使用同一 timestamp，並同步 `VERSION`、`CHANGELOG.md`、`docs/index.html`、Makefile 與 GitHub Actions，避免 release 只留下 commit/tag 卻缺少可回查的審查與更新紀錄。

Dependency Governance Contract 需包含：

```bash
make dependency-governance-check
cd .. && node scripts/check-dependency-governance-contract.mjs
```

這個 gate 會固定 root module 與 `production-api-worker` 的依賴治理條款：新增或升級 module 前後需保留 `go mod tidy`、`go mod verify`、`go list -m -u all` 與 `govulncheck ./...`，且文件需明確標示 module proxy / vulnerability database 無法連線時要記錄為待補掃描，不可把離線限制誤標為安全通過。

Supply Chain Artifact Governance Contract 需包含：

```bash
make supply-chain-artifact-governance-check
cd .. && node scripts/check-supply-chain-artifact-governance-contract.mjs
```

這個 gate 固定 SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner。它補在 dependency governance、Docker build、Compose smoke 與 rollback drill 之間，確保 release artifact 可追溯，而不只是原始碼測試通過。

Platform Promotion Policy Contract 需包含：

```bash
make platform-promotion-policy-check
cd .. && node scripts/check-platform-promotion-policy-contract.mjs
```

這個 gate 固定 platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner。它把 supply chain artifact evidence 推進到實際部署平台，避免 artifact 已簽章但 production promotion、canary rollout、environment approval 或 rollback owner 沒有可審核紀錄。

Deployment Controller Config Contract 需包含：

```bash
make deployment-controller-config-check
cd .. && node scripts/check-deployment-controller-config-contract.mjs
```

Deployment controller config contract gate 固定 deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger 與 promotion evidence。它把 platform promotion policy 落到實際控制器設定，避免 release policy 寫得完整，但 Kubernetes / cloud deploy controller、rollout health gate 或 rollback trigger 沒有可審核設定。

Operational Runbook Scope Freshness Contract 需包含：

```bash
make operational-runbook-scope-check
cd .. && node scripts/check-operational-runbook-scope-contract.mjs
```

這個 gate 固定 `production-api-worker/docs/operational-runbook.md` 的文件日期、完整日期時間、版本與適用範圍。runbook 不只描述 SLI / SLO 與 incident workflow，也必須明確列入 API contract scope coverage、Docs publishing contract gate、Release artifact chain contract gate、Secret handling governance contract gate 與 Supply chain artifact governance contract gate。

Performance Benchmark Governance Contract 需包含：

```bash
make performance-benchmark-governance-check
cd .. && node scripts/check-performance-benchmark-governance-contract.mjs
go test -run='^$' -bench=. -benchmem -count=10 ./... > bench.txt
benchstat old.txt new.txt
```

這個 gate 會固定效能修改的 release 條款：API / worker / queue hot path 改動前後需保留 benchmark A/B、`benchstat old.txt new.txt`、pprof 或 metrics 證據與原始輸出路徑。若本機或 CI 環境無法穩定執行完整 benchmark，更新紀錄需把限制寫成待補驗證，而不是把功能測試通過誤當成效能回歸證據。

## API Contract

對外 API 合約請先看 `docs/api-contract.md`。任何 handler、domain status、錯誤處理或 route label 調整，都要先判斷是否改變該文件列出的外部行為。

Machine-readable contract 位於 `api/openapi.yaml`。它不是取代 Go contract tests，而是讓 schema 可以被 frontend mock、SDK generator、API gateway review 或 contract diff 工具重用。

| 合約項 | 目前策略 |
|---|---|
| Success response | 保持 `id`、`name`、`payload`、`status` 欄位向後相容 |
| Request decoding | 只接受單一 JSON object；unknown field、trailing JSON value 與空白 `name` 都回 `invalid_input`，並由 `make request-decoding-check` 固定 |
| Idempotency key | `POST /jobs` 可帶 `Idempotency-Key`；同一 key 重試回同一 job，不重複寫入與 enqueue |
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

## Idempotency Key Contract

建立型 API 常被 client、gateway 或 queue retry 重送。`POST /jobs` 支援 `Idempotency-Key` header：第一次請求會建立 job 並 enqueue；同一 key 的後續重試回同一個 job，不再次 enqueue。空 header 保持原本每次建立新 job 的教學行為。

| 項目 | 合約 |
|---|---|
| Header | `Idempotency-Key`，選填 |
| Key validation | 不可含空白，長度不可超過 128 bytes |
| Memory mode | `MemoryStore` 在 transaction snapshot 內查找既有 key |
| Postgres mode | `jobs.idempotency_key` 搭配 `idx_jobs_idempotency_key` unique index |
| Duplicate retry | 回既有 job，worker queue 不重複 enqueue |
| Static gate | `make idempotency-key-check` 或 `node scripts/check-idempotency-key-contract.mjs` |

```bash
curl -X POST http://localhost:8080/jobs \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: retry-demo-1' \
  -d '{"name":"resize","payload":"image"}'

curl -X POST http://localhost:8080/jobs \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: retry-demo-1' \
  -d '{"name":"resize","payload":"image"}'
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

## OTLP Export Governance Contract

Local `debug exporter` 只用於教學與 smoke review，不是 production tracing backend。正式環境替換 Tempo、Jaeger、OTLP backend 或雲端 APM 時，必須在 runbook 保留 backend owner、sampling rate、retention window、sensitive attribute redaction 與 trace data owner，避免 trace pipeline 只驗證可連線卻沒有資料治理。

```bash
make otel-export-governance-check
```

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
| `make prometheus-check` | 靜態檢查 Prometheus Config Contract、Compose profile、README、runbook、API key scrape auth 風險與 CI 入口 |

```bash
cd production-api-worker
docker compose --profile monitoring up -d --build
open http://localhost:9090
docker compose down -v
```

若啟用 `API_KEY`，Prometheus scrape 必須同步設計 Bearer token、bearer token file、secret mount 或平台原生 scrape auth。教學 profile 預設使用未設定 `API_KEY` 的 local mode，避免把密碼寫進 `prometheus.yml`。

## Secret Handling Governance Contract

Secret handling governance contract gate 把分散在 API security、pprof diagnostics、Prometheus scrape auth 與 OTLP redaction 的 secret 邊界收斂成 release gate。正式環境不可使用 hard-coded production credentials；`API_KEY`、`PPROF_TOKEN`、Prometheus bearer token file 與 secret mount 必須有 secret rotation owner，incident profile、log、trace 或 smoke artifact 需先做 incident artifact redaction 才能保存或分享。

```bash
make secret-handling-governance-check
```

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

`Queue.Enqueue` 與 `Queue.ShutdownContext` 共用同一個 mutex 保護 `closed` 狀態、channel send 與 channel close。這個邊界確保 shutdown 開始後的新 enqueue 會得到 `worker.ErrClosed`，不會在高併發關閉期間觸發 `send on closed channel` panic。Worker Shutdown Contract 由 `make worker-shutdown-check` / `node scripts/check-worker-shutdown-contract.mjs` 固定 `ErrClosed`、`TestEnqueueAfterShutdownReturnsClosedError`、`TestConcurrentEnqueueAndShutdownDoesNotPanic`、Makefile 與 CI 入口。

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
| Prometheus Config Contract | `make prometheus-check` 或從 repo root 執行 `node scripts/check-prometheus-config-contract.mjs` |
| Operational observability contract | `make operational-observability-check` 或從 repo root 執行 `node scripts/check-operational-observability-contract.mjs` |
| 主要 SLI | API 5xx rate、worker p95 latency、queue depth、readiness、metrics scrape |
| Incident correlation | `X-Request-ID`、route label、structured log、OpenTelemetry span |

告警觸發時先用 `api_requests_total`、`api_request_duration_seconds`、`worker_queue_depth`、`worker_job_duration_seconds` 判斷影響範圍，再用 `X-Request-ID` 追 log / trace。若行為涉及外部合約，先重跑 `make ci-contract` 與 compose smoke，再決定 rollback、drain 或容量調整。

Release Rollback Drill Contract 會把 rollback decision、previous image restore、migration rollback boundary、health verification、metrics verification 與 postmortem evidence 寫成 release gate。Release rollback drill contract gate 演練時先記錄是否停止導流或回復 previous image，再確認 migration 是否可逆或需 forward fix，最後用 `/livez`、`/readyz`、`/metrics`、API smoke 與 incident notes 驗證修復結果。

Docker Build Contract 會把 Dockerfile 的 multi-stage build、`CGO_ENABLED=0`、`api-worker` / `migrate` binaries、`distroless/static-debian12` runtime image、migration copy、`ENTRYPOINT ["/app/api-worker"]`、root CI 的 `docker build -t production-api-worker:ci ./production-api-worker` 與 standalone workflow 的 `docker build -t production-api-worker:standalone .` 寫成 release gate。Docker build contract 補上 Compose smoke 前的映像建置邊界，避免 Dockerfile 或 workflow tag 漂移時只靠端到端 smoke 才發現。

Compose Runtime Env Contract 會把 `docker-compose.yml` 的 Postgres healthcheck、migrate `service_healthy` dependency、api `service_completed_successfully` / `service_started` dependency、OTEL collector endpoint、API security env、request limit、trusted proxy、CORS allowlist 與 Prometheus `monitoring` profile 寫成 release gate。Compose runtime env contract 補上 Docker build 與 Compose smoke 之間的部署設定面，避免 service dependency 或 env wiring 漂移。
