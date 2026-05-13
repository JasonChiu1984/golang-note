# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
- API contract：穩定 request/response/error schema，文件在 `docs/api-contract.md`
- Request decoding：拒絕 malformed JSON、unknown field、trailing JSON value 與空白 name
- Service transaction boundary：`sql.TxOptions`、context-aware deadlock retry、queue enqueue
- Startup configuration：集中驗證 `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定，錯誤設定 fail fast
- Repository：memory 與 Postgres `database/sql` 版本
- Worker queue：bounded queue、worker pool、shutdown-safe enqueue / close
- Service lifecycle：`/livez`、`/readyz`、draining、HTTP shutdown、queue drain
- Panic recovery：handler 未預期 panic 時回穩定 `internal_error` JSON
- Request timeout：handler deadline exceeded 時回穩定 `request_timeout` JSON
- Observability：Prometheus client、OpenTelemetry OTLP/stdout exporter、slog、`X-Request-ID`
- Pipeline：migration CLI、Docker Compose、GitHub Actions

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
  -d '{"name":"resize","payload":"image"}'

curl http://localhost:8080/metrics
curl -i http://localhost:8080/readyz
```

## Migration

```bash
DATABASE_URL='postgres://app:app@localhost:5432/app?sslmode=disable' go run ./cmd/migrate
```

## Release Quality Gate

```bash
go mod tidy
go mod verify
go list -m -u all
govulncheck ./...
go test ./internal/config -count=1
go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract' -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1
go test -race -cover ./...
go test -run='^$' -bench=. -benchmem -count=10 ./... > bench.txt
docker compose up --build
```

| Gate | 目的 |
|---|---|
| `go mod verify` | 確認 module cache 與 `go.sum` hash 一致 |
| `go list -m -u all` | 發現可更新依賴並建立維護紀錄 |
| `govulncheck ./...` | 掃描 API / worker 實際可達的已知漏洞 |
| `go test ./internal/config -count=1` | 固定啟動設定與 DB pool 預設值、合法 env 與錯誤設定 fail-fast 行為 |
| `go test ./internal/api -run 'Test.*Contract' -count=1` | 固定 HTTP status、JSON shape、錯誤 code 與 response header |
| `go test ./internal/api -run 'TestRequestDecodingContract' -count=1` | 固定 malformed JSON、unknown field、trailing JSON 與空白 name 的 `400 invalid_input` |
| `go test ./internal/api -run 'TestReadinessContract' -count=1` | 固定 ready / draining 狀態與 `/readyz` status code |
| `go test ./internal/api -run 'TestPanicRecoveryContract' -count=1` | 固定 handler panic 時的 `500 internal_error` JSON 與 request id 行為 |
| `go test ./internal/api -run 'TestRequestTimeoutContract' -count=1` | 固定 handler timeout 時的 `504 request_timeout` JSON 與 request id 行為 |
| `go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1` | 固定 deadlock retry backoff 會尊重 request cancellation / shutdown deadline |
| `go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1` | 固定 queue close/enqueue 同步邊界，避免 shutdown race panic |
| `go test -race -cover ./...` | 驗證 service、handler、queue 與併發安全 |
| `go test -run='^$' -bench=. -benchmem -count=10 ./...` | API / worker 效能改動需保留 benchmark 證據 |
| `docker compose up --build` | 驗證 Postgres、migration、API、worker、metrics 整體鏈路 |

## API Contract

對外 API 合約請先看 `docs/api-contract.md`。任何 handler、domain status、錯誤處理或 route label 調整，都要先判斷是否改變該文件列出的外部行為。

| 合約項 | 目前策略 |
|---|---|
| Success response | 保持 `id`、`name`、`payload`、`status` 欄位向後相容 |
| Request decoding | 只接受單一 JSON object；unknown field、trailing JSON value 與空白 `name` 都回 `invalid_input` |
| Error response | 統一使用 `{"error":{"code":"...","message":"..."}}` |
| Request timeout | `context.DeadlineExceeded` 對外回 `504 request_timeout`，避免被誤分類成 `internal_error` |
| Status enum | `pending`、`processing`、`done`、`failed` 不任意改名 |
| Breaking change | 新增版本路由或遷移期，不直接覆蓋既有合約 |

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

```bash
cd production-api-worker
PORT=9090 QUEUE_SIZE=128 WORKERS=8 DATABASE_MAX_OPEN_CONNS=40 DATABASE_MAX_IDLE_CONNS=12 DATABASE_CONN_MAX_LIFETIME=45m go run ./cmd/api-worker
go test ./internal/config -count=1
```

DB pool 設定不可藏在 repository 內硬編碼，因為 production 容量通常同時受 API concurrency、worker 數、Postgres `max_connections`、migration job 與維運連線影響。設定 loader 會先驗證 idle connection 不可大於 open connection，避免部署後才由資料庫壓力或連線耗盡暴露問題。

## Observability Correlation

每個 HTTP request 都會保留 client 提供的 `X-Request-ID`，若未提供則由 server 產生 `req-*` 格式 ID。Handler 會把同一個 ID 放進 response header、request context、structured log 欄位與 trace attribute，讓 API 錯誤、worker 行為、Prometheus route label 與 OTLP span 可以在 incident review 時對起來。

| 關聯點 | 目前策略 |
|---|---|
| Response header | 永遠回傳 `X-Request-ID` |
| Log 欄位 | `request_id`、`method`、`route`、`error_code` |
| Trace attribute | `request.id`、`http.route` |
| Contract test | `TestRequestIDContract` 與 `TestCreateJobContract` 固定 header 行為 |

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
