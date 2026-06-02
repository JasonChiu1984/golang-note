# Changelog

## v1.0.47 - 2026-06-03

- 新增 2026-06-03 06:01:33 CST +0800 資深工程師審查報告，確認 v1.0.46 已補齊 Request decoding contract gate，但 Panic recovery contract 仍缺少獨立靜態 gate 來固定 `recoverMiddleware`、`500 internal_error`、request id、OpenAPI、Makefile 與 CI 入口。
- 新增 `scripts/check-panic-recovery-contract.mjs`，固定 README、production README、API contract、OpenAPI、handler recovery middleware、Go tests、第 7 / 11 章、整合視覺課程、Makefile 與 GitHub Actions 都保留 Panic recovery contract gate。
- `.github/workflows/ci.yml` 新增 `Check panic recovery contract`；`production-api-worker/Makefile` 新增 `panic-recovery-check`。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md` 與既有 version-sensitive contract checks 版本標記更新為 `v1.0.47`。
- README、`production-api-worker/README.md`、第 7 / 11 章與整合視覺課程同步加入 Panic recovery contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.46 - 2026-06-02

- 新增 2026-06-02 06:01:49 CST +0800 資深工程師審查報告，確認 v1.0.45 已補齊 Migration contract gate，但 Request decoding contract 仍缺少獨立靜態 gate 來固定 malformed JSON、unknown field、trailing JSON value、空白 `name`、OpenAPI、Makefile 與 CI 入口。
- 新增 `scripts/check-request-decoding-contract.mjs`，固定 README、production README、API contract、OpenAPI、handler strict decoder、Go tests、第 7 / 11 章、整合視覺課程、Makefile 與 GitHub Actions 都保留 Request decoding contract gate。
- `.github/workflows/ci.yml` 新增 `Check request decoding contract`；`production-api-worker/Makefile` 新增 `request-decoding-check`。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md` 與既有 version-sensitive contract checks 版本標記更新為 `v1.0.46`。
- README、`production-api-worker/README.md`、第 7 / 11 章與整合視覺課程同步加入 Request decoding contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.45 - 2026-06-01

- 新增 2026-06-01 06:03:07 CST +0800 資深工程師審查報告，確認 v1.0.44 已補齊 Queue backpressure contract gate，但 Migration contract 仍缺少獨立靜態 gate 來固定 env、timeout、version table、transaction apply、Go tests、Makefile 與 CI 入口。
- 新增 `scripts/check-migration-contract.mjs`，固定 README、production README、API contract、config loader、migration runner、`cmd/migrate`、Go tests、第 7 / 11 章、進階 Cheat Sheet、整合視覺課程、Makefile 與 GitHub Actions 都保留 Migration contract gate。
- `.github/workflows/ci.yml` 新增 `Check migration contract`；`production-api-worker/Makefile` 新增 `migration-check`。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md` 與既有 version-sensitive contract checks 版本標記更新為 `v1.0.45`。
- README、`production-api-worker/README.md`、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Migration contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.44 - 2026-05-31

- 新增 2026-05-31 06:02:30 CST +0800 資深工程師審查報告，確認 v1.0.43 已補齊 Retry cancellation contract gate，但 bounded queue backpressure 還缺少獨立靜態 gate 來固定 `503 queue_full`、`domain.ErrQueueFull`、`dropped` metric 與 queue depth 行為。
- 新增 `TestQueueBackpressureContract`，固定 queue 容量滿載時第二個 enqueue 會回 `domain.ErrQueueFull`，同時記錄 `worker_jobs_total{result="dropped"}` 並保留 queue depth。
- 新增 `scripts/check-queue-backpressure-contract.mjs`、`make queue-backpressure-check` 與 GitHub Actions `Check queue backpressure contract`，讓 README、production README、API contract、OpenAPI、章節、Cheat Sheet、整合視覺課程、Go tests、Makefile 與 CI 入口一致。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md` 與既有 version-sensitive contract checks 版本標記更新為 `v1.0.44`。
- README、`production-api-worker/README.md`、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Queue backpressure contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.43 - 2026-05-27

- 新增 2026-05-27 08:01:25 CST +0800 資深工程師審查報告，確認 v1.0.42 已補齊 Worker failure contract gate，但 Retry cancellation 仍缺少獨立靜態 gate 來固定 deadlock retry backoff 與 `context` cancellation 行為。
- 新增 `scripts/check-retry-cancellation-contract.mjs`，固定 README、production README、API contract、service retry implementation、Go tests、第 7 / 11 章、進階 Cheat Sheet、整合視覺課程、Makefile 與 GitHub Actions 都保留 Retry cancellation contract。
- `.github/workflows/ci.yml` 新增 `Check retry cancellation contract`；`production-api-worker/Makefile` 新增 `retry-cancellation-check`。
- `production-api-worker/docs/api-contract.md`、OpenAPI 與既有 version-sensitive contract checks 版本標記更新為 `v1.0.43`。
- README、`production-api-worker/README.md`、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Retry cancellation contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.42 - 2026-05-23

- 新增 2026-05-23 06:26:02 CST +0800 資深工程師審查報告，確認 v1.0.41 已補齊 API security contract gate，但 worker processor failure 仍缺少獨立靜態 gate 來固定 `failed` / `success` result metric 與 duration 行為。
- 新增 `TestWorkerFailureResultContract`，固定 worker processor 成功與失敗都會記錄 duration，且分別寫入 `worker_jobs_total{result="success"}` 與 `worker_jobs_total{result="failed"}`。
- 新增 `scripts/check-worker-failure-contract.mjs`、`make worker-failure-check` 與 GitHub Actions `Check worker failure contract`，讓 README、production README、API contract、OpenAPI、章節、Cheat Sheet、整合視覺課程、Go tests、Makefile 與 CI 入口一致。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md`、OpenAPI / request correlation / API security 靜態檢查版本標記更新為 `v1.0.42`。
- README、`production-api-worker/README.md`、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Worker failure contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.41 - 2026-05-22

- 新增 2026-05-22 08:39:49 CST +0800 資深工程師審查報告，確認 v1.0.40 已補齊 Request correlation contract gate，但 API security 仍缺少獨立靜態 gate 來保護 `API_KEY`、Bearer token、公開 health probes 與安全標頭教學邊界。
- 新增 `scripts/check-api-security-contract.mjs`，固定 README、production README、OpenAPI、API contract、handler middleware、Go tests、第 7 / 11 章、進階 Cheat Sheet、整合視覺課程、Makefile 與 GitHub Actions 都保留 API security contract。
- `.github/workflows/ci.yml` 新增 `Check API security contract`；`production-api-worker/Makefile` 新增 `api-security-check`。
- `production-api-worker/api/openapi.yaml`、`production-api-worker/docs/api-contract.md` 與 `scripts/check-openapi-contract.mjs` 版本標記更新為 `v1.0.41`，並在 OpenAPI description 補上 optional `API_KEY` security boundary。
- README、`production-api-worker/README.md`、API contract、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 API security contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.40 - 2026-05-21

- 新增 2026-05-21 07:52:54 CST +0800 資深工程師審查報告，確認 v1.0.39 已補齊 HTTP server timeout contract，但 `X-Request-ID` 仍缺少獨立 request correlation 靜態 gate。
- 新增 `scripts/check-request-correlation-contract.mjs`，固定 README、production README、OpenAPI、API contract、handler middleware、Go tests、第 7 / 11 章、進階 Cheat Sheet、整合視覺課程、Makefile 與 GitHub Actions 都保留 request correlation contract。
- `.github/workflows/ci.yml` 新增 `Check request correlation contract`；`production-api-worker/Makefile` 新增 `request-correlation-check`。
- `production-api-worker/api/openapi.yaml` 與 `scripts/check-openapi-contract.mjs` 版本標記更新為 `v1.0.40`，並在 OpenAPI description 補上 `X-Request-ID`、request context、structured log 與 trace attribute `request.id` 關聯說明。
- README、`production-api-worker/README.md`、API contract、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Request correlation contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.39 - 2026-05-20

- 新增 2026-05-20 15:53:59 CST +0800 資深工程師審查報告，確認 v1.0.38 已補齊 Request body limit contract，但 HTTP server timeout 還缺少正式設定化、測試與 CI gate。
- `production-api-worker` 新增 `HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 設定，預設分別為 `3s`、`5s`、`10s`、`60s`、`5s`、`10s`。
- `api-worker` 新增 `serverTimeouts`，將 timeout 集中套用到 `http.Server` 的 read header、read、write、idle timeout，以及 shutdown / queue drain timeout。
- 新增 `TestHTTPServerTimeoutContract` 與 config 測試，固定 timeout 預設值、合法 env override 與不合法 duration fail-fast。
- 新增 `scripts/check-http-timeout-contract.mjs`、`make http-timeout-check` 與 GitHub Actions gate，讓 README、production README、API contract、main.go、Go tests 與 CI 入口保持一致。
- README、`production-api-worker/README.md`、API contract、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 HTTP server timeout contract。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.38 - 2026-05-19

- 新增 2026-05-19 15:50:00 CST +0800 資深工程師審查報告，確認 v1.0.37 已補齊 CORS allowlist contract，但 production API 仍缺少正式版本化的 request body size limit 合約。
- `production-api-worker` 新增 `REQUEST_BODY_LIMIT_BYTES` 設定，預設 `1048576` bytes；設定錯誤會在啟動設定載入階段 fail fast。
- `POST /jobs` 改由設定值驅動 `http.MaxBytesReader`，oversized body 會回 `413 payload_too_large` JSON，並保留 `X-Request-ID`。
- 新增 `TestRequestBodyLimitContract` 與 config 測試，固定 request body limit 預設值、合法 env override、錯誤設定與超限 HTTP 行為。
- 新增 `scripts/check-request-body-limit-contract.mjs`、`make request-body-limit-check` 與 GitHub Actions root-course gate，讓 README、production README、API contract、OpenAPI、Go tests 與 CI 入口保持一致。
- README、`production-api-worker/README.md`、API contract、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Request body limit contract。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.37 - 2026-05-18

- 新增 2026-05-18 14:52:25 CST +0800 資深工程師審查報告，確認 `v1.0.36` tag 已完成版本/CI 標示，但 CORS allowlist 的實作、測試、合約文件與靜態檢查仍停留在本地工作樹，需以新版本正式發布。
- `production-api-worker` 正式納入 `CORS_ALLOWED_ORIGINS` 設定、allowlist middleware、preflight `204`、blocked origin `403`、actual request CORS header 與 `Vary: Origin` 行為。
- 新增並發布 `TestCORSAllowedOriginsContract`、config invalid-origin fail-fast 測試、`scripts/check-cors-contract.mjs`、`make cors-check` 與 GitHub Actions CORS gate。
- README、`production-api-worker/README.md`、API contract、第 7 / 11 章、進階 Cheat Sheet、OpenAPI 與整合視覺課程同步標示 CORS allowlist contract；`docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.36 - 2026-05-18

- 新增 2026-05-18 06:51:09 CST +0800 本輪資深工程師審查報告、內容需要更新的部分與更新紀錄，修正自動化產物日期需符合本次環境目前日期的交付要求。
- 保留 v1.0.35 已完成的 Trusted proxy client IP 與 Shutdown signal contract：`TRUSTED_PROXY_CIDRS`、`X-Forwarded-For` 信任邊界、`TestRateLimitTrustedProxyContract`、`monitoredSignals()` 與 `TestMonitoredSignalsContract`。
- 更新 README / VERSION 標示為 v1.0.36，並重新同步 `docs/index.html`，讓 GitHub Pages 首頁與 source course 一致。

## v1.0.35 - 2026-05-18

- 新增 2026-05-18 06:51:09 CST +0800 資深工程師審查報告，確認 v1.0.34 已補齊 Rate limit contract，但 shutdown signal 與 trusted proxy client IP 邊界需被版本、文件、CI 與 Pages 入口完整收斂。
- `production-api-worker/cmd/api-worker` 新增 `monitoredSignals()`，明確監聽 `SIGINT` 與 `SIGTERM`，讓 local Ctrl+C 與 Kubernetes / Compose rolling deploy 的 shutdown contract 對齊。
- 新增 `TestMonitoredSignalsContract` 與 `TestRateLimitTrustedProxyContract`，固定 signal set 不可退化成只處理 SIGINT，且未信任來源不可用 `X-Forwarded-For` 偽造 rate limit key。
- `production-api-worker` 新增 `TRUSTED_PROXY_CIDRS` 設定，只有 trusted proxy 的 `RemoteAddr` 才能採用 `X-Forwarded-For` 第一個 IP 作為 rate limit key。
- 更新 `scripts/check-rate-limit-contract.mjs`，並新增 `scripts/check-shutdown-signal-contract.mjs`、`make shutdown-signal-check` 與 GitHub Actions gate，讓 README、production README、API contract、runbook、章節、Cheat Sheet、main.go、測試與 CI 保持一致。
- README、`production-api-worker/README.md`、API contract、operational runbook、OpenAPI version、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 Shutdown signal / Trusted proxy contract。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.34 - 2026-05-17

- 新增 2026-05-17 20:42:15 CST +0800 資深工程師審查報告，確認 v1.0.33 已補齊 OTLP collector contract，但 production API 仍缺少可測的 per-client rate limit 防護。
- `production-api-worker` 新增 `RATE_LIMIT_REQUESTS_PER_MINUTE` 設定，預設每個 client IP 每分鐘 120 次；設定錯誤會在啟動設定載入階段 fail fast。
- API handler 新增 rate limit middleware，保護 `/jobs` 與 `/jobs/{id}`；超限時回 `429 rate_limited` JSON，保留 `X-Request-ID`，並設定 `Retry-After: 60`。
- 新增 `internal/api/rate_limit.go`、`TestRateLimitContract` 與 config 測試，固定 per-IP window、錯誤碼、header 與設定驗證。
- OpenAPI spec 新增 `429` / `rate_limited` 合約；README、production README、API contract、runbook、第 7 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 rate limit gate。
- 新增 `scripts/check-rate-limit-contract.mjs`、`make rate-limit-check` 與 GitHub Actions root-course gate，讓文件、OpenAPI、Go tests、Docker Compose env 與 CI 保持一致。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.33 - 2026-05-17

- 新增 2026-05-17 16:38 資深工程師審查報告，確認 v1.0.32 已補齊 pprof diagnostics contract，但 OpenTelemetry collector 尚未形成可重跑的 receiver / exporter / Compose endpoint 檢查。
- `production-api-worker/otel-collector.yaml` 將本地 exporter 改為 `debug`，固定 OTLP gRPC receiver `0.0.0.0:4317` 與 traces pipeline。
- 新增 `scripts/check-otel-collector-contract.mjs`，檢查 collector config、Docker Compose OTLP endpoint、runbook、README、章節與 CI workflow 都保留 OTLP collector contract。
- `production-api-worker/Makefile` 新增 `otel-check` target，GitHub Actions root-course gate 新增 OTLP collector contract check。
- README、`production-api-worker/README.md`、operational runbook、第 7 / 10 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 OTLP collector contract。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.32 - 2026-05-17

- 新增 2026-05-17 14:02 資深工程師審查報告，確認 v1.0.31 已補齊 Prometheus / OpenAPI 合約，但 production diagnostics / pprof 仍缺少可測的啟用條件、認證邊界與 runbook 流程。
- `production-api-worker` 新增 `ENABLE_PPROF` 與 `PPROF_TOKEN` 設定；pprof 預設關閉，啟用時必須提供 `PPROF_TOKEN` 或 `API_KEY`，否則啟動 fail fast。
- API handler 新增受控 `/debug/pprof/` route，只有合法 `Authorization: Bearer <token>` 才能讀取 profile index、CPU profile、heap、goroutine 與 trace endpoint。
- 新增 `TestPprofDiagnosticsContract` 與 config 測試，固定 pprof 預設 404、未授權 401、合法 token 200，以及 `ENABLE_PPROF=true` 未設定 token 的錯誤部署。
- 新增 `scripts/check-pprof-contract.mjs`、`make pprof-check` 與 GitHub Actions root-course gate，讓 README、runbook、Go tests、CI 與實作保持一致。
- README、`production-api-worker/README.md`、operational runbook、第 10 / 11 章、進階 Cheat Sheet 與整合視覺課程同步加入 pprof diagnostics contract。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.31 - 2026-05-17

- 新增 2026-05-17 13:40 資深工程師審查報告，確認 v1.0.30 已補齊 operational runbook，但 API 合約仍缺少可供前端、SDK、測試工具與文件生成共用的 machine-readable OpenAPI artifact。
- 新增 `configs/prometheus/prometheus.yml`、Compose `monitoring` profile 與 `scripts/check-prometheus-config.mjs`，讓 Prometheus alert rules 可由本地 Prometheus 載入並被 CI 靜態檢查。
- 新增 `production-api-worker/api/openapi.yaml`，以 OpenAPI 3.1 固定 `POST /jobs`、`GET /jobs/{id}`、`GET /livez`、`GET /readyz`、`GET /metrics`、Bearer auth、`X-Request-ID`、job schema、error envelope 與 error code。
- 新增 `scripts/check-openapi-contract.mjs`，檢查 OpenAPI spec、README、production README、API contract 文件與 CI workflow 都保留 OpenAPI contract gate。
- README、`production-api-worker/README.md`、`production-api-worker/docs/api-contract.md`、第 7 / 10 / 11 章、進階 Cheat Sheet、整合視覺課程與 CI workflow 同步加入 Prometheus config / OpenAPI contract gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.30 - 2026-05-17

- 新增 2026-05-17 11:02 資深工程師審查報告，確認 v1.0.29 已補齊語法應用 SVG 流程圖品質門檻，但 production observability 仍缺少可交付的 SLI/SLO、告警規則與事故處理 runbook。
- 新增 `production-api-worker/docs/operational-runbook.md`，固定 API availability、5xx error rate、worker latency、queue depth、readiness、incident triage、verification、troubleshooting 與 risk notes。
- 新增 `configs/prometheus/production-api-worker-alerts.yml`，提供 5xx warning/critical、queue depth、worker p95 latency 與 metrics missing 的 Prometheus alert rule 範例。
- 新增 `scripts/check-operational-runbook.mjs`，檢查 runbook、alert rules、README 與 CI workflow 都保留必要 SLI/SLO、alert、runbook link 與驗證入口。
- README、`production-api-worker/README.md`、第 10 / 11 章、整合視覺課程與 CI workflow 同步加入 operational runbook gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.29 - 2026-05-17

- 新增 2026-05-17 10:31 資深工程師審查報告，確認 v1.0.28 已補齊 production API security contract，但語法應用圖解仍缺少可重跑的 SVG 流程圖品質門檻。
- `docs/golang-syntax-application-svg.html` 與 `圖解筆記3-4整合/golang-syntax-application-svg.html` 將 25 個單語法應用圖統一為 Start/End、Input/Output、Decision、Process 等標準流程圖符號。
- 每個單語法流程圖改由 blueprint renderer 產生，保留 `flowTitle`、branch label、節點 role 與 `<title>` / `<desc>` / `aria-labelledby` SVG metadata。
- 新增 `scripts/check-syntax-flow-svg.mjs`，檢查 `docs/` 與整合來源都具備 25 個語法 flow、25 個 blueprint、標準流程圖符號、metadata renderer，並避免舊的城市路線圖說明回流。
- README 驗證矩陣新增語法 SVG 流程圖品質門檻；`docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.28 - 2026-05-13

- 新增 2026-05-13 22:55 資深工程師審查報告，確認 v1.0.27 已補齊效能與補充頁發布鏈路，但 production API security contract 仍未進入可測合約。
- `production-api-worker` 新增可選 `API_KEY` 設定；設定後 `/jobs` 與 `/metrics` 需帶 `Authorization: Bearer <token>`，`/livez`、`/readyz` 保持公開供 LB / orchestrator 使用。
- API middleware 新增 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY` 與 `Referrer-Policy: no-referrer` 安全標頭。
- 新增 `TestAPIKeyAuthContract` 與 `TestSecurityHeadersContract`，固定認證邊界與 security headers 行為；config test 同步固定 `API_KEY` trim 行為。
- `compose-smoke.sh` 支援 `API_KEY`，Docker Compose 也可由環境注入 API key，讓啟用認證時仍可重跑 smoke gate。
- README、production README、第 7 / 11 章、進階 Cheat Sheet、API 合約文件與整合視覺課程同步補上 API security contract 驗證 gate。
- `docs/index.html` 已由整合課程重新同步並套用 GitHub Pages link fix。

## v1.0.27 - 2026-05-13

- `docs/c-python-go-performance-supplement.html` 加入 GPU / Metal 效能比較與正式測試結果，明確分開 CPU sequential workload、GPU kernel time 與 GPU total time。
- 新增 `examples/performance-comparison/gpu/bench.swift`，並擴充 `TestCode/performance-comparison/run-real-benchmark.sh` 產生 C / Go / Python / GPU 綜合報告。
- 將原本合併的 Assembly 微服務教材拆成 `docs/golang-assembly-tutorial.html` 與 `docs/golang-microservice-tutorial.html`，讓 hot path 與服務架構分開學習。
- `docs/golang-assembly-microservice.html` 改為過渡入口，保留舊連結導流到兩個新教程。
- 新增 `scripts/fix-docs-index-links.mjs`，每次重產 `docs/index.html` 後可自動修正 GitHub Pages `docs/` root 相對路徑，避免 `/docs` 與 `/ReleaseNote` 404。
- README、整合課程入口、語法應用圖解與測試報告索引同步補上 GPU、Assembly、微服務與 Docs index 連結驗證 gate。

## v1.0.26 - 2026-05-13

- 新增 2026-05-13 22:03 資深工程師審查報告，確認 v1.0.25 已補齊 Compose smoke gate，但進階效能教材仍有兩個整合缺口：真實效能測試報告尚未進入主教材 gate，Assembly 微服務補充頁尚未形成正式學習入口與風險邊界。
- 新增 `TestCode/performance-comparison/run-real-benchmark.sh` 與 `測試報告/`，可自動產出 C / Python / Go 真實效能測試 Markdown 報告與 raw stdout。
- `docs/c-python-go-performance-supplement.html` 補上真實測試報告區塊、測試環境、圖表、raw output 連結與解讀限制。
- 新增 `docs/golang-assembly-microservice.html`，說明 Assembly 只作為可量測 hot path adapter，並保留 pure Go fallback、engine selection、benchmark、disassembly 與部署風險。
- `docs/golang-syntax-application-svg.html` 與整合來源同步保留單語法流程、if 流程圖與語法域圖解，讓語法補充頁更貼近專案應用。
- README、第 10 章、進階 Cheat Sheet、康乃爾筆記同步加入正式效能報告與 Assembly hot path gate。
- `.gitignore` 忽略 raw benchmark binary，保留可審查的文字 raw output 與 Markdown 報告。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，讓 GitHub Pages 主入口包含 Assembly 微服務補充頁。

## v1.0.25 - 2026-05-13

- 新增 2026-05-13 21:03 資深工程師審查報告，確認 v1.0.24 已把 CI / release gate 落成 workflow，但 Docker job 仍只驗證 image build，缺少 Compose 端到端 smoke gate。
- 新增 `production-api-worker/scripts/compose-smoke.sh`，用 host 端 `curl` 驗證 `/readyz`、`/livez`、`POST /jobs`、`GET /jobs/{id}` 與 `/metrics`。
- `production-api-worker/Makefile` 新增 `compose-smoke` target，讓本機與 CI 可共用同一個 smoke 驗證入口。
- `.github/workflows/ci.yml` 的 Docker job 改為 build 後啟動 Compose stack，執行 smoke script，失敗時輸出 compose logs，最後清理 volume。
- README、production-api-worker README、第 9 / 11 章、進階 Cheat Sheet、康乃爾筆記與整合視覺課程補上 Compose smoke gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，保留 GitHub Pages 入口同步。

## v1.0.24 - 2026-05-13

- 新增 2026-05-13 20:02 資深工程師審查報告，確認教材已具備 production 合約與效能補充深度，但 CI / release gate 仍停在章節說明，缺少 repo 內可執行 workflow。
- 新增 `.github/workflows/ci.yml`，把 root module、production-api-worker contract tests、race/coverage、govulncheck 與 Docker build 固定成 GitHub Actions release gate。
- `production-api-worker/Makefile` 新增 `ci`、`ci-contract` 與 `docker-build` target，讓本機驗證可以對齊 CI job。
- README、production-api-worker README、第 9 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 CI workflow contract 與本機對照指令。
- `圖解筆記3-4整合/golang-complete-visual-course.html` 修正 GitHub Actions 連結到根目錄 `.github/workflows/ci.yml`，`docs/index.html` 重新由整合課程複製產生。

## v1.0.23 - 2026-05-13

- 新增 2026-05-13 19:13 資深工程師審查報告，確認 Go 1.1-1.26 ReleaseNote 與補充教材入口已成形，但 C/Python/Go 效能補充頁仍需要可重跑 benchmark、正式報告模板與教材驗證 gate。
- `docs/c-python-go-performance-supplement.html` 補上圖解說明、部署檢查表、可重跑 benchmark 指令與正式測試報告模板，避免跨語言比較停留在概念倍率。
- 新增 `examples/performance-comparison/`，提供同一個整數運算 workload 的 C、Go、Python 版本與 README，作為效能比較方法示範。
- README、第 10 章、進階 Cheat Sheet 與康乃爾筆記補上跨語言效能範例、raw output、compiler flags、語言版本與工業通訊 I/O wait 風險。
- `圖解筆記3-4整合/golang-complete-visual-course.html` 主導覽新增語法應用圖解與效能補充頁入口；`docs/index.html` 重新由整合課程複製產生並修正 Pages 相對連結。
- `.gitignore` 新增 Python bytecode 規則，避免效能範例執行後把 `__pycache__` / `*.pyc` 納入版本。

## v1.0.22 - 2026-05-13

- 新增 2026-05-13 18:03 資深工程師審查報告，確認 v1.0.21 已補齊 Go 1.2-1.26 官方段落覆蓋，但 ReleaseNote 索引仍缺 Go 1.1 起點、支援狀態視覺化與補充教材入口整理。
- `scripts/generate-go-release-notes.mjs` 納入 Go 1.1 release data，擴充 Roadmap 分期、官方支援政策資料與支援狀態 SVG 圖表產生邏輯。
- `ReleaseNote/go1.1-release-note.html` 與 `docs/ReleaseNote/go1.1-release-note.html` 新增 Go 1.1 專業整理報告，覆蓋 method values、`-race`、`go1.1` build tag、performance 30%-40%、`bufio.Scanner` 與相容性風險。
- `ReleaseNote/index.html` 與 `docs/ReleaseNote/index.html` 擴充為 Go 1.1-1.26，新增 Roadmap 圖表、目前支援版本 SVG 圖表與 Go 1.25 / Go 1.26 支援窗口註記。
- 新增 `docs/golang-syntax-application-svg.html`、`docs/golang-third-party-modules.html`、`docs/c-python-go-performance-supplement.html` 三個補充頁，並由主整合課程入口連結。
- README 與 VERSION 更新到 `v1.0.22`，新增 Release Note 支援狀態與補充教材頁驗證 gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並保留 GitHub Pages 可用的相對連結。

## v1.0.21 - 2026-05-13

- 新增 2026-05-13 17:03 資深工程師審查報告，確認 Go 1.20 效能矩陣已補齊，但 Go 1.2-1.26 Release Note 仍需要把官方段落細節重寫成果正式發布並同步到 Pages。
- `scripts/generate-go-release-notes.mjs` 補強官方段落解析與細節重寫，讓非 Go 1.20 版本也有 `官方段落細節重寫摘要`，並把 Tools、Ports、minor changes、new package 與 Patch Revisions 轉成工程導入與驗證語言。
- `ReleaseNote/go1.2-release-note.html` 到 `ReleaseNote/go1.26-release-note.html` 重新產生，補齊 Go 1.21-Go 1.26 的 Tools / Ports / minor changes / 新 package rows，並統一 Go 1.19-Go 1.26 phase wording。
- `docs/ReleaseNote/` 已同步根目錄 ReleaseNote HTML，避免 GitHub Pages 版落後於本地正式報告。
- README 與 VERSION 更新到 `v1.0.21`，新增 Release Note 官方覆蓋驗證 gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並保留 GitHub Pages 可用的 `ReleaseNote/index.html` 連結。

## v1.0.20 - 2026-05-13

- 新增 2026-05-13 16:03 資深工程師審查報告，確認 production migration contract 已補齊，但 Go 1.20 Release Note 仍缺少可直接用於升級決策的效能比較矩陣。
- `scripts/generate-go-release-notes.mjs` 新增 Go 1.20 `performance` 資料結構，讓後續重新產生頁面時保留效能比較區塊。
- `ReleaseNote/go1.20-release-note.html` 新增「效能比較」區塊，整理 Runtime / GC、PGO、build speed、ECDSA、RSA decrypt/encrypt 與 runtime metrics histogram 的官方數字、成本與驗證方式。
- 擴充 Go 1.20 coverage / added / compatibility 表，補強 struct/array comparison order、XML validation、net/http、runtime/cgo、syscall cgroup、crypto/x509 ECDH key parsing 等細節。
- README、第 10 章、進階 Cheat Sheet 與康乃爾筆記補上 Release Note 效能矩陣的驗證 gate，避免升級說明只列功能而不列性能成本。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並修正 Release Notes 連結為 GitHub Pages 可用的 `ReleaseNote/index.html`。
- `docs/ReleaseNote/` 已同步 Go 1.20 效能比較內容，讓 Pages 版與根目錄 ReleaseNote 保持一致。

## v1.0.19 - 2026-05-13

- 新增 2026-05-13 15:03 資深工程師審查報告，確認 DB pool contract 已補齊，但 migration CLI 仍缺少 production migration contract。
- `production-api-worker/internal/config` 新增 `MigrationConfig`、`MIGRATIONS_DIR` 與 `MIGRATION_TIMEOUT` 驗證，migration 缺少 `DATABASE_URL` 時會 fail fast。
- 新增 `production-api-worker/internal/migration`，負責 SQL 檔排序、版本命名檢查、`schema_migrations` table、已套用版本略過與每檔 transaction 套用。
- `cmd/migrate` 改為只做設定載入、DB open/ping 與 migration runner wire-up，避免 CLI 入口堆疊 migration 業務邏輯。
- 新增 config / migration unit tests，固定 migration env、timeout、SQL 檔排序與版本解析規則。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 migration contract 與 release gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並保持 GitHub Pages 可用的 Release Notes 連結。
- 一併發布前序產生的 Go 1.2-1.26 專業 Release Note HTML 與 `scripts/generate-go-release-notes.mjs`，並同步到 `docs/ReleaseNote/`。

## v1.0.18 - 2026-05-13

- 新增 2026-05-13 14:02 資深工程師審查報告，確認教程已具備 startup configuration contract，但 Postgres connection pool 仍硬編碼在 repository 層。
- `production-api-worker/internal/config` 新增 `DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS` 與 `DATABASE_CONN_MAX_LIFETIME` 驗證。
- `production-api-worker/internal/repository` 新增 `PoolConfig` 與 `OpenPostgresWithPool`，讓 `cmd/api-worker` 由啟動設定注入 DB pool。
- 新增 config unit tests，固定 DB pool 預設值、合法 env、idle/open 關係與 duration 錯誤行為。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 DB pool contract 與 release gate。
- `docs/index.html` 已重新執行同步步驟，並保留 GitHub Pages 可用的 `ReleaseNote/index.html` 連結，避免回退前次 release-note 路徑修正。

## v1.0.17 - 2026-05-13

- 新增 2026-05-13 13:02 資深工程師審查報告，確認教程已具備 API / timeout / shutdown / retry 合約，但啟動設定仍會 silent fallback。
- `production-api-worker` 新增 `internal/config`，集中讀取 `PORT`、`QUEUE_SIZE`、`WORKERS`、`DATABASE_URL` 與 `OTEL_EXPORTER_OTLP_ENDPOINT`。
- `cmd/api-worker` 啟動時會驗證 port 範圍與正整數容量設定；錯誤設定直接 fail fast，不再悄悄套用預設值。
- 新增 config unit tests，固定預設值、合法 env、非法 port、非法 queue size 與非法 worker count。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 startup configuration contract 與 release gate。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.16 - 2026-05-13

- 新增 2026-05-13 12:02 資深工程師審查報告，確認教程已補齊 retry cancellation，但 HTTP handler 對 `context.DeadlineExceeded` 尚未形成 timeout 合約。
- `production-api-worker/internal/api.Handler.writeError` 現在會把 request deadline exceeded 分類為 `504 Gateway Timeout` 與 `error.code=request_timeout`。
- 新增 `TestRequestTimeoutContract`，固定 request timeout path 保留 `X-Request-ID` 並回穩定 JSON envelope。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 request timeout contract 與 release gate。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.15 - 2026-05-13

- 新增 2026-05-13 11:51 資深工程師審查報告，確認教程已具備 API contract、lifecycle、panic recovery 與 queue shutdown safety，但 service deadlock retry 尚未固定 context cancellation 行為。
- `production-api-worker/internal/app.Service` 的 deadlock retry backoff 改為監聽 `ctx.Done()`，request timeout、client disconnect 或 shutdown context 取消後會立即停止重試。
- `app.Service` 改依賴小型 `Store` / `Observability` interface，讓 service 層取消語意可在無 Postgres / OpenTelemetry 下載的受限環境獨立測試。
- 新增 `TestCreateJobStopsDeadlockRetryWhenContextCanceled`，固定取消後不再呼叫下一次交易，也不 enqueue 背景 job。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 context-aware retry、cancellation gate 與驗證指令。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.14 - 2026-05-13

- 新增 2026-05-13 11:02 資深工程師審查報告，確認 production API 合約已補齊，但 worker queue shutdown 仍有 enqueue 與 close 競態風險。
- `production-api-worker/internal/worker` 移除對完整 observability package 的直接依賴，改用小型 `Observer` interface，讓 worker queue 可在離線/受限環境獨立測試。
- `Queue.Enqueue` 與 `Queue.ShutdownContext` 現在共用 mutex 保護 `closed` 狀態與 channel close/send 邊界，避免 shutdown 期間 `send on closed channel` panic。
- 新增 worker queue shutdown 回歸測試，固定 close 後 enqueue 回 `ErrClosed`，並覆蓋 concurrent enqueue + shutdown 不 panic 的情境。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 queue shutdown safety 與驗證 gate。

## v1.0.13 - 2026-05-13

- 新增 2026-05-13 10:02 資深工程師審查報告，確認教程已具備 API contract、request correlation、lifecycle 與 panic recovery，但 request decode 失敗仍會誤分類成 500。
- README 新增 strict request decoding 版本策略與驗證指令，將 `TestRequestDecodingContract` 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 request decoder gate：malformed JSON、unknown field、trailing JSON value 與空白 name 都需回 `400 invalid_input`。
- `production-api-worker` API handler 新增 `decodeJobInput`，使用 `DisallowUnknownFields`、單一 JSON value 檢查與 `domain.ErrInvalidInput` wrapping。
- `production-api-worker` contract tests 新增 request decoding 回歸檢查，避免 JSON parser 錯誤漂移為 `500 internal_error`。

## v1.0.12 - 2026-05-13

- 新增 2026-05-13 09:02 資深工程師審查報告，確認教程已具備 API contract、request correlation 與 lifecycle gate，但 HTTP panic recovery 尚未形成可測合約。
- README 新增 panic recovery 版本策略與驗證指令，將 `TestPanicRecoveryContract` 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 recover middleware 的 production 邊界：保留 `X-Request-ID`、回 `500 internal_error` JSON、記錄 structured log。
- `production-api-worker` API routes 新增 recover middleware，panic 會轉為穩定錯誤 envelope，並讓 metrics middleware 可記錄 500 結果。
- `production-api-worker` contract tests 新增 panic recovery 回歸檢查，避免 handler / queue 未預期 panic 破壞外部錯誤格式。

## v1.0.11 - 2026-05-13

- 新增 2026-05-13 08:03 資深工程師審查報告，確認教材已具備 production API / observability 深度，但服務生命週期仍需可測化。
- README 新增服務生命週期版本策略與 readiness / drain 驗證指令，將 `/readyz` draining contract 納入主教材入口。
- 第 7 / 11 章與進階 Cheat Sheet 補上 graceful shutdown 決策：先 readiness draining，再停止 HTTP intake，最後等待 worker queue drain。
- `production-api-worker` 新增 lifecycle readiness 狀態，`/readyz` 在 draining 時回 `503 Service Unavailable`。
- `production-api-worker` shutdown flow 改為獨立 worker context、HTTP shutdown deadline 與 queue drain deadline，並新增 readiness contract test。

## v1.0.10 - 2026-05-13

- 新增 2026-05-13 07:02 資深工程師審查報告，確認教材已具備專案深度，但 production observability correlation 仍需落到可測試合約。
- README 新增 Request ID 與觀測性關聯版本策略，將 `X-Request-ID` contract test 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 request correlation gate：header、structured log 欄位、trace attribute 與 metrics label 需保持穩定。
- `production-api-worker` API middleware 新增 `X-Request-ID` 保留/產生、request-scoped logger、trace attributes，錯誤 log 會帶上 `request_id` 與 `error_code`。
- `production-api-worker` contract tests 新增 Request ID header 回傳與自動產生回歸檢查。

## v1.0.9 - 2026-05-13

- 新增 2026-05-13 06:03 資深工程師審查報告，確認教材已具備專案開發深度與廣度，但 production API 合約與相容性 gate 仍需補強。
- README 新增 API 合約版本策略與驗證指令，將 `production-api-worker` 的 contract test 納入主教材入口。
- 第 7 章補上 API 合約與相容性設計：request/response schema、錯誤格式、狀態碼、版本策略與 release gate。
- 第 11 章與進階 Cheat Sheet 補上 API contract test 檢查重點，避免 HTTP status、JSON shape 或 error code 意外破壞使用端。
- `production-api-worker` 新增 API 合約文件，並把錯誤回應改成穩定的 `error.code` / `error.message` envelope，附上合約回歸測試。

## v1.0.8 - 2026-05-13

- 新增 2026-05-13 05:04 資深工程師審查報告，確認教程已具備專案開發深度，但效能調優章仍缺少可重複的診斷決策流程。
- README 新增效能診斷版本策略與驗證指令，將 benchmark A/B、`benchstat`、pprof 與 execution trace 納入主教材入口。
- 第 10 章補上效能問題定位流程、benchmark 統計比較、runtime metrics、block/mutex profile、production profiling 安全邊界與 trace 使用時機。
- 康乃爾筆記與進階 Cheat Sheet 同步補上 runtime metrics、`benchstat`、block/mutex profile、GODEBUG 與 trace 決策表。
- `production-api-worker` README 新增效能驗證 gate，要求 API / worker 改動保留 benchmark、profile 或 metrics 證據。

## v1.0.7 - 2026-05-13

- 新增 2026-05-13 04:04 資深工程師審查報告，確認教程已具備專案開發主線，但依賴治理與供應鏈安全 gate 仍需明確化。
- README 新增依賴治理版本策略與驗證指令，將 `go mod tidy`、`go mod verify`、`go list -m -u all`、`govulncheck ./...` 納入主教材入口。
- 第 8 章補上依賴升級審核流程、`govulncheck` 使用方式、Go 1.24+ `tool` directive 管理開發工具，以及 private module 的供應鏈風險提醒。
- 第 9 / 11 章補上 release / CI gate，讓部署與測試不只跑單元測試，也檢查 module hash、可更新版本與已知漏洞。
- 康乃爾筆記、進階 Cheat Sheet 與 `production-api-worker` README 同步加入依賴安全速查與受限環境說明。

## v1.0.6 - 2026-05-13

- 新增 2026-05-13 03:03 資深工程師審查報告，確認教程專案開發深度已足夠，但 Go 1.26 升級與部署決策面仍需補強。
- README 新增 Go 1.26 升級檢查項，將 bootstrap toolchain、OS/ARCH、Docker base image、CI 與 CGO 依賴納入版本策略。
- 第 1 章補上 Go 1.26 平台生命週期與 bootstrap 重點：Go 1.26 需 Go 1.24.6+ bootstrap、Go 1.27 將要求 macOS 13+、windows/arm 已移除、freebsd/riscv64 標記 broken。
- 第 9 章補上 Go 1.26 build/release gate，將 `go.mod`、Docker builder image、GitHub Actions `setup-go`、交叉編譯目標與 CGO 動態連結檢查放入 release checklist。
- 康乃爾筆記第 1 / 9 章同步補上平台支援、Docker `golang:1.26-alpine` 與靜態連結限制，避免學習摘要保留舊版部署訊號。

## v1.0.5 - 2026-05-13

- 新增 2026-05-13 02:05 資深工程師審查報告，確認 Go 1.26.3 仍是目前官方最新穩定版本，但教材內有新版 API 範例需校正。
- 修正進階 Cheat Sheet 的 `errors.AsType` 範例，改為官方簽名 `func AsType[E error](err error) (E, bool)` 對應的 `value, ok` 寫法。
- 修正 README 與第 11 章的 Go 1.26 test artifact 指令，明確使用 `go test -artifacts -outputdir ./test-artifacts ./...`。
- 康乃爾筆記第 4 章補充 `errors.AsType` 回傳 `(E, bool)`，避免讀者誤以為可用單一回傳值判斷 nil。
- 本輪未變更 `go.mod` 的 `go 1.22` 相容層，也未新增外部依賴。

## v1.0.4 - 2026-05-13

- 新增 2026-05-13 01:03 資深工程師審查報告，確認主章節已現代化，但輔助教材仍有 Go 1.22/1.21-1.22 版本訊號不一致。
- 康乃爾筆記索引與各章版本基準同步到 Go 1.26.3。
- 康乃爾筆記補上 Go 1.26 `errors.AsType`、`new(expression)`、Green Tea GC 與 Go 1.25 `testing/synctest` / container-aware `GOMAXPROCS` 摘要。
- 進階 Cheat Sheet 將「現代 Go API」延伸到 Go 1.26，修正 `cmp.Ordered`、補上 `go fix` modernizers、`testing/synctest`、`T.ArtifactDir`、Green Tea GC 與 goroutine leak profile。
- 圖解筆記4與圖解筆記3-4整合頁更新 production 補強篇的版本定位，避免首頁仍顯示只涵蓋 Go 1.21/1.22。

## v1.0.3 - 2026-05-13

- 新增 2026-05-13 資深工程師審查報告，確認教材深度足夠但 Go 版本基準需現代化。
- README 升級教材版本資訊到 `v1.0.3`，以 Go 1.26.3 作為 2026-05 教材講解基準。
- 第 1 章補上 Go 1.26.3 基準與教材版本策略，區分教學基準與範例 module 相容層。
- 第 6 章更新 Go 1.25+ container-aware `GOMAXPROCS` 行為。
- 第 10 章新增 Go 1.26 Green Tea GC 說明。
- 第 11 章新增 `testing/synctest` 與 `T.ArtifactDir` 現代測試補充。
- 第 4 章與 A1 附錄補上 Go 1.26 `errors.AsType`、`new(expression)` 與泛型自我參照約束。

## v1.0.2 - 2026-05-12

- 新增資深工程師審查報告、內容更新清單與時間戳更新紀錄。
- README 補齊雙專案學習路線，將 `production-api-worker` 納入主教材入口。
- 第 7 章新增第二階段 production 專案導讀，讓大型專案教學不只停在 crawler。
- 第 11 章新增實務驗證指令矩陣與受限環境排錯說明。
- `.gitignore` 補上 `.gomodcache/`，避免本地 module cache 被誤提交。
