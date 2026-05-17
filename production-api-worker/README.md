# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
- API contract：穩定 request/response/error schema，文件在 `docs/api-contract.md`
- OpenAPI contract：machine-readable schema 位於 `api/openapi.yaml`，用來對齊文件、測試、SDK 與前端 mock
- API security：可用 `API_KEY` 啟用 Bearer token 保護 `/jobs` 與 `/metrics`，health endpoint 保持公開
- Request decoding：拒絕 malformed JSON、unknown field、trailing JSON value 與空白 name
- Service transaction boundary：`sql.TxOptions`、context-aware deadlock retry、queue enqueue
- Startup configuration：集中驗證 `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定，錯誤設定 fail fast
- Migration contract：集中驗證 migration env、timeout、SQL version，並用 `schema_migrations` 記錄已套用版本
- Repository：memory 與 Postgres `database/sql` 版本
- Worker queue：bounded queue、worker pool、shutdown-safe enqueue / close
- Service lifecycle：`/livez`、`/readyz`、draining、HTTP shutdown、queue drain
- Panic recovery：handler 未預期 panic 時回穩定 `internal_error` JSON
- Request timeout：handler deadline exceeded 時回穩定 `request_timeout` JSON
- Observability：Prometheus client、OpenTelemetry OTLP/stdout exporter、slog、`X-Request-ID`
- Operational runbook：SLI/SLO、Prometheus alert rules、scrape config、incident workflow、verification、troubleshooting
- Pipeline：migration CLI、Docker Compose、GitHub Actions workflow、Docker image build gate、Compose smoke gate

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
go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract' -count=1
go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1
go test -race -cover ./...
make openapi-check
make runbook-check
make prometheus-check
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
| `go test ./internal/migration -count=1` | 固定 migration SQL 檔排序、版本命名與檔案掃描規則 |
| `go test ./internal/api -run 'Test.*Contract' -count=1` | 固定 HTTP status、JSON shape、錯誤 code 與 response header |
| `go test ./internal/api -run 'TestRequestDecodingContract' -count=1` | 固定 malformed JSON、unknown field、trailing JSON 與空白 name 的 `400 invalid_input` |
| `go test ./internal/api -run 'TestReadinessContract' -count=1` | 固定 ready / draining 狀態與 `/readyz` status code |
| `go test ./internal/api -run 'TestPanicRecoveryContract' -count=1` | 固定 handler panic 時的 `500 internal_error` JSON 與 request id 行為 |
| `go test ./internal/api -run 'TestRequestTimeoutContract' -count=1` | 固定 handler timeout 時的 `504 request_timeout` JSON 與 request id 行為 |
| `go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1` | 固定 API key 認證邊界、公開 health endpoint 與安全標頭 |
| `go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1` | 固定 deadlock retry backoff 會尊重 request cancellation / shutdown deadline |
| `go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1` | 固定 queue close/enqueue 同步邊界，避免 shutdown race panic |
| `go test -race -cover ./...` | 驗證 service、handler、queue 與併發安全 |
| `make openapi-check` | 固定 OpenAPI contract、endpoint、schema、error code、Bearer auth 與 README/API 文件入口 |
| `make runbook-check` | 固定 SLI/SLO、Prometheus alert rules、incident workflow 與 runbook link 不被移除 |
| `make prometheus-check` | 固定 Prometheus scrape config、rule_files、Compose monitoring profile 與 README/runbook 入口 |
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

`production-api-worker/docs/operational-runbook.md` 是值班與 incident review 的教學入口；`configs/prometheus/production-api-worker-alerts.yml` 是對應的 Prometheus alert rule 範例，`configs/prometheus/prometheus.yml` 則示範本地 scrape job 與 `rule_files` 載入。這些檔案分別由根目錄 `node scripts/check-operational-runbook.mjs` 與 `node scripts/check-prometheus-config.mjs` 固定，避免 observability 只剩 log / metrics 概念而沒有可操作告警與排障流程。

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

## API Contract

對外 API 合約請先看 `docs/api-contract.md`。任何 handler、domain status、錯誤處理或 route label 調整，都要先判斷是否改變該文件列出的外部行為。

Machine-readable contract 位於 `api/openapi.yaml`。它不是取代 Go contract tests，而是讓 schema 可以被 frontend mock、SDK generator、API gateway review 或 contract diff 工具重用。

| 合約項 | 目前策略 |
|---|---|
| Success response | 保持 `id`、`name`、`payload`、`status` 欄位向後相容 |
| Request decoding | 只接受單一 JSON object；unknown field、trailing JSON value 與空白 `name` 都回 `invalid_input` |
| Error response | 統一使用 `{"error":{"code":"...","message":"..."}}` |
| Request timeout | `context.DeadlineExceeded` 對外回 `504 request_timeout`，避免被誤分類成 `internal_error` |
| Status enum | `pending`、`processing`、`done`、`failed` 不任意改名 |
| Breaking change | 新增版本路由或遷移期，不直接覆蓋既有合約 |
| OpenAPI sync | endpoint、schema、error code、auth 邊界同步更新 `api/openapi.yaml` 與 `docs/api-contract.md` |

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

```bash
cd production-api-worker
PORT=9090 QUEUE_SIZE=128 WORKERS=8 API_KEY=dev-secret DATABASE_MAX_OPEN_CONNS=40 DATABASE_MAX_IDLE_CONNS=12 DATABASE_CONN_MAX_LIFETIME=45m go run ./cmd/api-worker
go test ./internal/config -count=1
```

DB pool 設定不可藏在 repository 內硬編碼，因為 production 容量通常同時受 API concurrency、worker 數、Postgres `max_connections`、migration job 與維運連線影響。設定 loader 會先驗證 idle connection 不可大於 open connection，避免部署後才由資料庫壓力或連線耗盡暴露問題。

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

## Observability Correlation

每個 HTTP request 都會保留 client 提供的 `X-Request-ID`，若未提供則由 server 產生 `req-*` 格式 ID。Handler 會把同一個 ID 放進 response header、request context、structured log 欄位與 trace attribute，讓 API 錯誤、worker 行為、Prometheus route label 與 OTLP span 可以在 incident review 時對起來。

| 關聯點 | 目前策略 |
|---|---|
| Response header | 永遠回傳 `X-Request-ID` |
| Log 欄位 | `request_id`、`method`、`route`、`error_code` |
| Trace attribute | `request.id`、`http.route` |
| Contract test | `TestRequestIDContract` 與 `TestCreateJobContract` 固定 header 行為 |

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

## Panic Recovery

Production API 不能讓未預期 panic 直接中斷連線或回傳非 JSON 錯誤頁。Routes 會先建立 request context，再經過 metrics 與 recover middleware；若 handler、service 或 queue 發生 panic，server 會記錄 structured log，保留原 `X-Request-ID`，並回傳穩定錯誤 envelope。

| 項目 | 行為 |
|---|---|
| HTTP status | `500 Internal Server Error` |
| Error envelope | `{"error":{"code":"internal_error","message":"internal error"}}` |
| Request ID | client 提供的 `X-Request-ID` 仍會原樣回傳 |
| Metrics | 仍可記錄 `/jobs`、method 與 `Internal Server Error` status label |
| Contract test | `TestPanicRecoveryContract` 固定 panic recovery 行為 |

## Request Timeout Contract

Handler 內部會用 request-scoped timeout 保護 service 呼叫。若 deadline exceeded，對外應回穩定 timeout 合約，而不是落到未分類 `500 internal_error`。

| 項目 | 行為 |
|---|---|
| HTTP status | `504 Gateway Timeout` |
| Error envelope | `{"error":{"code":"request_timeout","message":"request timeout"}}` |
| Request ID | client 提供的 `X-Request-ID` 仍會原樣回傳 |
| Contract test | `TestRequestTimeoutContract` 固定 timeout 外部行為 |

## Service Lifecycle

Production shutdown 不是單純收到 signal 就結束 process。`api-worker` 收到中斷訊號後會先把 readiness 標成 draining，讓 `/readyz` 回 `503 Service Unavailable`，再呼叫 `http.Server.Shutdown` 停止接新 request，最後等待 worker queue drain。

| 階段 | 行為 |
|---|---|
| Ready | `/livez=200`、`/readyz=200`，可接受 API request |
| Draining | `/livez=200`、`/readyz=503`，外部 load balancer 應停止導流 |
| HTTP shutdown | `http.Server.Shutdown` 最多等待 5 秒讓既有 request 完成 |
| Queue drain | `Queue.ShutdownContext` 最多等待 10 秒處理已排入工作 |
| Forced cancel | drain 超時才取消 worker context，避免 shutdown 無限卡住 |

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
