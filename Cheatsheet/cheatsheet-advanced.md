# Go 進階 Cheat Sheet

> 進階開發者日常速查。涵蓋 interface、generics、併發 pattern、效能工具、部署。

---

## Interface 與 Type Assertion

```go
// 定義 interface（在使用端定義，越小越好）
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Type assertion
r, ok := w.(io.Reader)

// Type switch
switch v := i.(type) {
case string:   fmt.Println("string:", v)
case int:      fmt.Println("int:", v)
default:       fmt.Println("unknown")
}

// 編譯期 interface 滿足檢查
var _ io.Writer = (*MyWriter)(nil)

// 空 interface → any（Go 1.18+）
func process(v any) { }
```

| 概念 | 說明 |
|---|---|
| Implicit satisfaction | 不需要 `implements`，method set 匹配就滿足 |
| Interface 在使用端定義 | 消費者決定需要什麼行為 |
| nil interface 陷阱 | `(*T)(nil)` 放進 interface ≠ `nil` interface |
| 小 interface | `io.Reader`（1 method）比大 interface 更有彈性 |

---

## Generics

```go
// 泛型函式
func Map[T, U any](items []T, fn func(T) U) []U {
    result := make([]U, len(items))
    for i, v := range items {
        result[i] = fn(v)
    }
    return result
}

// 泛型約束
type Number interface {
    ~int | ~int64 | ~float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// 泛型 struct
type Result[T any] struct {
    Data  T
    Error error
}
```

| 約束 | 意義 |
|---|---|
| `any` | 任意型別 |
| `comparable` | 可用 `==` / `!=` |
| `~int` | 底層型別是 int（含自訂型別） |
| `cmp.Ordered` | Go 1.21+ 標準庫約束，可比較大小（`<`, `>` 等） |

---

## 併發 Pattern

### Worker Pool

```go
func workerPool(ctx context.Context, jobs <-chan Job, workers int) <-chan Result {
    results := make(chan Result)
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case results <- process(job):
                case <-ctx.Done():
                    return
                }
            }
        }()
    }
    go func() { wg.Wait(); close(results) }()
    return results
}
```

### Fan-in（合併多個 channel）

```go
func merge[T any](channels ...<-chan T) <-chan T {
    out := make(chan T)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan T) {
            defer wg.Done()
            for v := range c { out <- v }
        }(ch)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}
```

### Pipeline

```go
// stage 1 → stage 2 → stage 3
out := filter(square(generate(1, 2, 3, 4, 5)))
```

### Semaphore（限流）

```go
sem := make(chan struct{}, maxConcurrency)
sem <- struct{}{}        // acquire
defer func() { <-sem }() // release
```

### errgroup

```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // 最多 10 併發

for _, url := range urls {
    g.Go(func() error {
        return fetch(ctx, url)
    })
}
if err := g.Wait(); err != nil { /* 第一個錯誤 */ }
```

---

## 進階同步與記憶體 (sync)

| 工具 | 說明 |
|---|---|
| `sync.OnceValues` | (Go 1.21+) 執行一次並緩存回傳值/錯誤 |
| `sync.Map` | 併發安全的 Map。適合**讀多寫少**或 key 不重疊寫入 |
| `sync/atomic` | 無鎖操作。如 `var count atomic.Int64` -> `count.Add(1)` |
| `sync.Pool` | 物件池，減輕 GC 壓力。用完記得 `Reset()` |

```go
// sync.Pool 範例
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}
buf := bufPool.Get().(*bytes.Buffer)
defer func() { buf.Reset(); bufPool.Put(buf) }()
```

---

## Context 規範

```go
// 建立
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

ctx = context.WithValue(ctx, keyRequestID, "abc-123")

// 使用（第一個參數永遠是 ctx）
func FetchUser(ctx context.Context, id int) (*User, error) {
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }
    // ...
}
```

| 規則 | 說明 |
|---|---|
| `ctx` 是第一個參數 | `func Foo(ctx context.Context, ...)` |
| 不要存在 struct 裡 | 按 request 傳遞 |
| 只向下傳 | 不要從子 goroutine 回傳 ctx |
| `WithValue` 只放 request-scoped | trace ID、auth token，不放業務邏輯 |

### Graceful Shutdown

| 階段 | Go 實作重點 |
|---|---|
| Signal | `signal.NotifyContext` 接收中斷訊號 |
| Draining | readiness 狀態轉為 false，讓 `/readyz` 回 503 |
| HTTP shutdown | `http.Server.Shutdown(ctx)` 停止接新連線並等待既有 request |
| Worker drain | close queue 並用 `WaitGroup` 等待已排入 task 完成 |
| Queue close/send | close 與 enqueue send 需共用 mutex 或單一 owner，避免送入已關閉 channel |
| Queue backpressure contract | `node scripts/check-queue-backpressure-contract.mjs` 固定 bounded queue 滿載、`domain.ErrQueueFull`、`503 queue_full`、dropped metric 與 Go test |
| Timeout | drain deadline 到期才 cancel worker context |

### Startup Config Contract

| 設定 | Go 實作重點 |
|---|---|
| `PORT` | 啟動時 parse 成 1-65535；不要接受 `:8080` 或任意字串 |
| `QUEUE_SIZE` | 必須是正整數；錯誤值 fail fast，不要 silent fallback |
| `WORKERS` | 必須是正整數；容量規劃要能被測試固定 |
| Startup config contract gate | `node scripts/check-startup-config-contract.mjs` 固定 `PORT`、`QUEUE_SIZE`、`WORKERS`、optional endpoint、config tests、Makefile 與 CI 入口 |
| DB pool | `DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS`、`DATABASE_CONN_MAX_LIFETIME` 要由 env 驗證；idle 不可大於 open |
| DB pool contract gate | `node scripts/check-db-pool-contract.mjs` 固定 config、repository pool 套用、`api-worker` wiring、Makefile 與 CI 入口 |
| Trusted proxy client IP contract gate | `node scripts/check-trusted-proxy-contract.mjs` 固定 `TRUSTED_PROXY_CIDRS`、`X-Forwarded-For`、untrusted `RemoteAddr` fallback、Makefile 與 CI 入口 |
| Optional endpoint | `DATABASE_URL` 空值時明確進 memory mode；OTLP endpoint 空值時明確使用 stdout exporter |
| Migration CLI | `DATABASE_URL` 必填；`MIGRATIONS_DIR` 預設 `migrations`；`MIGRATION_TIMEOUT` 預設 `30s` |
| Migration version | SQL 檔名去掉 `.sql` 後寫入 `schema_migrations.version`；不可空白或含 whitespace |
| Migration contract gate | `node scripts/check-migration-contract.mjs` 固定 README、API contract、config、migration runner、`cmd/migrate`、Go tests、Makefile 與 CI 入口 |
| 測試 | `go test ./internal/config -count=1` 固定 default、valid env、invalid env |

### API Security Contract

| 項目 | Go 實作重點 |
|---|---|
| `API_KEY` | 空值代表 local teaching mode；有值時 trim 後啟用 Bearer token |
| Protected endpoints | `/jobs`、`/jobs/{id}`、`/metrics` 需 `Authorization: Bearer <API_KEY>` |
| Public probes | `/livez`、`/readyz` 不要被認證擋住，否則 LB / orchestrator 無法探測 |
| Error code | 認證失敗回 `401 unauthorized`，不要回 HTML 或自然語言錯誤頁 |
| Security headers | middleware 統一設定 `nosniff`、`DENY`、`no-referrer` |
| Smoke test | `compose-smoke.sh` 要能帶 `API_KEY`，避免啟用認證後 smoke gate 失效 |
| API security contract gate | `node scripts/check-api-security-contract.mjs` 固定 README、OpenAPI、Go tests、Makefile 與 CI |
| Secret handling governance contract gate | `node scripts/check-secret-handling-governance-contract.mjs` 固定 `API_KEY`、`PPROF_TOKEN`、secret rotation owner、no hard-coded production credentials 與 incident artifact redaction |
| Worker failure contract | `node scripts/check-worker-failure-contract.mjs` 固定 worker success/failed result metric、duration、Go test 與 CI |
| 測試 | `go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1` |

---

## Error Wrapping

```go
// 包裝
return fmt.Errorf("get user id=%d: %w", id, err)

// 判斷
if errors.Is(err, sql.ErrNoRows) { /* not found */ }

// 取出特定錯誤型別
var netErr *net.OpError
if errors.As(err, &netErr) {
    fmt.Println("network op:", netErr.Op)
}

// Go 1.26+ 泛型版 errors.As
if netErr, ok := errors.AsType[*net.OpError](err); ok {
    fmt.Println("network op:", netErr.Op)
}

// 自訂錯誤型別
type NotFoundError struct {
    Resource string
    ID       int
}
func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s id=%d not found", e.Resource, e.ID)
}
```

---

## Testing 進階

```go
// Table-driven test
func TestCalc(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        want     int
        wantErr  bool
    }{
        {"ok", 10, 2, 5, false},
        {"div-zero", 10, 0, 0, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)
            if (err != nil) != tt.wantErr { t.Fatal(err) }
            if got != tt.want { t.Fatalf("got %d want %d", got, tt.want) }
        })
    }
}

// Benchmark
func BenchmarkProcess(b *testing.B) {
    for i := 0; i < b.N; i++ { process() }
}

// Fuzz test（Go 1.18+）
func FuzzParse(f *testing.F) {
    f.Add("hello")
    f.Fuzz(func(t *testing.T, input string) {
        Parse(input) // 不應 panic
    })
}

// TestMain（setup/teardown）
func TestMain(m *testing.M) {
    setup()
    code := m.Run()
    teardown()
    os.Exit(code)
}
```

| 指令 | 用途 |
|---|---|
| `go test -v ./...` | 詳細輸出 |
| `go test -run TestFoo` | 指定測試 |
| `go test -bench=.` | benchmark |
| `go test -fuzz=FuzzParse` | fuzz |
| `go test -cover` | 覆蓋率 |
| `go test -coverprofile=c.out` | 覆蓋率報告 |
| `go tool cover -html=c.out` | 視覺化覆蓋率 |

> **提示**：整合測試使用 `t.Cleanup` 取代 `defer` 釋放資源（如 Database 連線、Testcontainers）。

---

## Build 與 Deploy 速查

```bash
# 交叉編譯
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o app ./cmd/api

# 注入版本
go build -ldflags "-s -w -X main.version=v1.0.0" -o app .

# 逃逸分析 (Escape Analysis)
go build -gcflags="-m" .

# 嵌入檔案
//go:embed static/*
var staticFS embed.FS

# Docker multi-stage
FROM golang:1.22 AS builder
RUN CGO_ENABLED=0 go build -o /app .
FROM scratch
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

---

## API 合約速查

| 合約項 | Release 前檢查 |
|---|---|
| Endpoint | method、path、path parameter 是否仍相容 |
| Request schema | 必填欄位、型別、unknown field、trailing JSON 與大小限制是否改變 |
| Response schema | status code、JSON 欄位、enum 是否仍可被舊 client decode |
| Error envelope | 是否維持穩定 `error.code` 與 `error.message` |
| OpenAPI contract | `api/openapi.yaml` 是否同步 endpoint、schema、error code、Bearer auth、`X-Request-ID` 與 API contract scope coverage |
| Idempotency key contract | 是否由 `node scripts/check-idempotency-key-contract.mjs` 固定 `Idempotency-Key`、重試回同一 job、不重複 enqueue、migration unique index 與 CI 入口 |
| API latency metrics contract | 是否由 `node scripts/check-api-latency-metrics-contract.mjs` 固定 `api_request_duration_seconds`、route / method / status labels 與 CI 入口 |
| Service transaction boundary contract | 是否由 `node scripts/check-service-transaction-boundary-contract.mjs` 固定 LevelReadCommitted transaction、commit 後 enqueue、queue-full failed 回寫與 `TestServiceTransactionBoundaryContract` |
| Trace shutdown contract | 是否由 `node scripts/check-trace-shutdown-contract.mjs` 固定 `Observability.Shutdown` 的 3 秒 bounded context、api-worker exit hook 與 `TestTraceShutdownContract` |
| CORS allowlist | `CORS_ALLOWED_ORIGINS` 是否只允許 exact origin，並固定 preflight `204` / blocked `403` |
| Request body limit | `REQUEST_BODY_LIMIT_BYTES` 是否固定 oversized body 的 `413 payload_too_large` |
| HTTP server timeout | `HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 是否由 config 套用 |
| Rate limit | `RATE_LIMIT_REQUESTS_PER_MINUTE` 是否固定 per-client IP、`429 rate_limited`、`Retry-After` 與 health endpoint 不限速 |
| Trusted proxy client IP | `TRUSTED_PROXY_CIDRS` 是否只信任內部 proxy CIDR，未信任來源是否忽略 `X-Forwarded-For` |
| Shutdown signal | SIGINT/SIGTERM 是否都會進入 graceful shutdown，並由 `TestMonitoredSignalsContract` 固定 |
| Request ID | `X-Request-ID` 是否會回傳，client 提供時是否原樣保留 |
| Request correlation contract | 是否由 `node scripts/check-request-correlation-contract.mjs` 固定 request context、structured log `request_id`、trace attribute `request.id`、OpenAPI 與 CI 入口 |
| API security contract gate | 是否由 `node scripts/check-api-security-contract.mjs` 固定 `API_KEY`、Bearer auth、公開 health probes、安全標頭、OpenAPI 與 CI 入口 |
| Worker failure contract | 是否由 `node scripts/check-worker-failure-contract.mjs` 固定 worker 成功/失敗 result metric 與 duration |
| Queue backpressure contract | 是否由 `node scripts/check-queue-backpressure-contract.mjs` 固定 queue 滿載 error、HTTP `503 queue_full` 與 dropped metric |
| Observability label | route label、span name、metrics label、`request.id` 是否會破壞 dashboard |
| Worker shutdown contract | concurrent enqueue + shutdown 是否不 panic，close 後是否回穩定錯誤，並由 `node scripts/check-worker-shutdown-contract.mjs` 固定 |
| Panic recovery | 未預期 panic 是否仍回 `500 internal_error` JSON 與原 request id |
| Request timeout | `context.DeadlineExceeded` 是否回 `504 request_timeout`，而不是漂移成 `500 internal_error` |
| Retry cancellation contract | deadlock backoff 是否由 `node scripts/check-retry-cancellation-contract.mjs` 固定尊重 `ctx.Done()`，取消後是否停止交易與 enqueue |
| Shutdown signal | `api-worker` 是否同時監聽 SIGINT/SIGTERM，確保 local Ctrl+C 與 rolling deploy 都進入 draining |

```bash
cd production-api-worker
go test ./internal/api -run 'Test.*Contract' -count=1
go test ./internal/api -run 'TestRequestDecodingContract' -count=1
go test ./internal/api -run 'TestRequestBodyLimitContract' -count=1
go test ./internal/api -run 'TestRequestIDContract|TestCreateJobContract' -count=1
node ../scripts/check-request-correlation-contract.mjs
go test ./internal/api -run 'TestCORSAllowedOriginsContract' -count=1
node ../scripts/check-ci-contract-parity-contract.mjs
go test ./cmd/api-worker -run 'TestHTTPServerTimeoutContract' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1
go test ./internal/api -run 'TestPanicRecoveryContract' -count=1
go test ./internal/api -run 'TestRequestTimeoutContract' -count=1
node scripts/check-request-timeout-contract.mjs
node ../scripts/check-request-timeout-contract.mjs
make request-timeout-check
go test ./internal/api -run 'TestRateLimitContract' -count=1
go test ./cmd/api-worker -run 'TestMonitoredSignalsContract' -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
node ../scripts/check-retry-cancellation-contract.mjs
```

CI contract parity gate：在 repo root 執行 `node scripts/check-ci-contract-parity-contract.mjs`，固定 `make ci-contract` 與 GitHub Actions production contract job 都涵蓋 `TestCORSAllowedOriginsContract`。

Contract gate inventory：在 repo root 執行 `node scripts/check-contract-gate-inventory-contract.mjs`，固定 52 個 root contract checker 全部被 GitHub Actions 呼叫，避免 checker 只存在於 repo 沒有進入 release gate。

Docs publishing contract gate：在 repo root 執行 `node scripts/check-docs-publishing-contract.mjs`，固定 `docs/index.html`、GitHub Pages link fix、HTML 主頁教程回鏈、Makefile 與 CI 入口。

API contract scope coverage：在 repo root 執行 `node scripts/check-openapi-contract.mjs`，固定 `production-api-worker/docs/api-contract.md` 首段適用範圍必須同步 Docs publishing contract gate 與發布面 scope。

Production workflow contract gate：在 repo root 執行 `node scripts/check-production-workflow-contract.mjs`，固定 `production-api-worker/.github/workflows/production-api-worker.yml` 保留 `make ci-contract`、race/coverage、govulncheck、Docker build、Compose smoke、failure logs 與 cleanup。

Syntax flow SVG contract gate：在 repo root 執行 `node scripts/check-syntax-flow-svg-contract.mjs`，固定 `docs/golang-syntax-application-svg.html` 與整合來源保留 25 個單語法 flow、標準流程圖符號、SVG metadata、blueprint renderer、Makefile 與 CI 入口。

Go ReleaseNote contract gate：在 repo root 執行 `node scripts/check-go-release-notes-contract.mjs`，固定 `scripts/generate-go-release-notes.mjs`、`ReleaseNote/`、`docs/ReleaseNote/`、Go 1.1-1.26 必要報告區塊、官方來源、支援狀態與 Go 1.26.5 / Go 1.25.12 patch 訊號。

Release version consistency contract gate：在 repo root 執行 `node scripts/check-release-version-consistency-contract.mjs`，固定 VERSION、CHANGELOG、README、API contract、OpenAPI、章節、整合視覺課程、docs/index、Makefile 與 CI 目前版本一致。

Release artifact chain contract gate：在 repo root 執行 `node scripts/check-release-artifact-chain-contract.mjs`，固定同 timestamp 的 `審查報告/`、`內容需要更新的部分/`、`更新資料/`、版本標記、CHANGELOG 與 docs/index 同步。

Release publish reconciliation contract gate：在 repo root 執行 `node scripts/check-release-publish-reconciliation-contract.mjs`，固定 remote-created / local-final-amended release 與 blocked-push recovery finalization 的 `HEAD`、`origin/main`、`tag^{}`、`force-with-lease`、recovery command 與成功推送輸出。

Dependency governance static gate：在 repo root 執行 `node scripts/check-dependency-governance-contract.mjs`，固定 root module 與 `production-api-worker` 都保留 `go mod tidy`、`go mod verify`、`go list -m -u all`、`govulncheck ./...`、離線限制說明、Makefile 與 CI 入口。

Supply chain artifact governance contract gate：在 repo root 執行 `node scripts/check-supply-chain-artifact-governance-contract.mjs`，或 `cd production-api-worker && make supply-chain-artifact-governance-check`，固定 SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner。

Platform promotion policy contract gate：在 repo root 執行 `node scripts/check-platform-promotion-policy-contract.mjs`，或 `cd production-api-worker && make platform-promotion-policy-check`，固定 platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner。

Deployment controller config contract gate：在 repo root 執行 `node scripts/check-deployment-controller-config-contract.mjs`，或 `cd production-api-worker && make deployment-controller-config-check`，固定 deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger 與 promotion evidence。

Release rollback drill contract：在 repo root 執行 `node scripts/check-release-rollback-drill-contract.mjs`，或 `cd production-api-worker && make release-rollback-drill-check`，固定 rollback decision、previous image restore、migration rollback boundary、health verification、metrics verification 與 postmortem evidence。

Docker build contract：在 repo root 執行 `node scripts/check-docker-build-contract.mjs`，或 `cd production-api-worker && make docker-build-check`，固定 Dockerfile、`CGO_ENABLED=0`、`api-worker` / `migrate` binaries、`distroless/static-debian12` runtime image、root CI 與 standalone workflow 的 build tags。

Compose runtime env contract：在 repo root 執行 `node scripts/check-compose-runtime-env-contract.mjs`，或 `cd production-api-worker && make compose-runtime-env-check`，固定 `docker-compose.yml` runtime env、migration dependency、OTEL endpoint、`API_KEY`、`REQUEST_BODY_LIMIT_BYTES`、`TRUSTED_PROXY_CIDRS`、`CORS_ALLOWED_ORIGINS` 與 Prometheus `monitoring` profile。

Idempotency key contract：在 repo root 執行 `node scripts/check-idempotency-key-contract.mjs`，固定 `POST /jobs` 的 `Idempotency-Key` retry-safe 行為、memory/Postgres repository lookup、migration unique index、OpenAPI、Makefile 與 CI 入口。

API latency metrics contract：在 repo root 執行 `node scripts/check-api-latency-metrics-contract.mjs`，固定 `api_request_duration_seconds` histogram、route / method / status labels、Go contract test、Makefile 與 CI 入口。

Service transaction boundary contract：在 repo root 執行 `node scripts/check-service-transaction-boundary-contract.mjs`，固定 `CreateJob` 的 `sql.TxOptions{Isolation: sql.LevelReadCommitted}`、commit 後 enqueue、queue-full failed 狀態回寫、`TestServiceTransactionBoundaryContract`、Makefile 與 CI 入口。

Trace shutdown contract：在 repo root 執行 `node scripts/check-trace-shutdown-contract.mjs`，固定 trace provider shutdown 的 3 秒 bounded context、`obs.Shutdown(context.Background())` exit hook、`TestTraceShutdownContract`、Makefile 與 CI 入口。

Prometheus config contract gate：在 repo root 執行 `node scripts/check-prometheus-config-contract.mjs`，固定 Prometheus scrape job、rule_files、alert rules、Compose monitoring profile、API key scrape auth 風險、Makefile 與 CI 入口。

Operational observability contract gate：在 repo root 執行 `node scripts/check-operational-observability-contract.mjs`，固定 runbook、Prometheus scrape config、alert rules、Compose monitoring profile、API key scrape auth 風險、Makefile 與 CI 入口。

Operational runbook scope freshness contract gate：在 repo root 執行 `node scripts/check-operational-runbook-scope-contract.mjs`，或 `cd production-api-worker && make operational-runbook-scope-check`，固定 runbook metadata、完整日期時間、API contract scope coverage、Docs publishing contract gate、Release artifact chain contract gate、Secret handling governance contract gate 與 Supply chain artifact governance contract gate。

```json
{
  "error": {
    "code": "invalid_input",
    "message": "invalid input"
  }
}
```

> 對外錯誤分支用穩定 code，不用自然語言 message 做 client 判斷。

> Request decoder 錯誤也屬於 API 合約：malformed JSON、unknown field、trailing JSON value 與空白必填欄位都應回 `400 invalid_input`，不能漂移成 `500 internal_error`。

> Request body limit 是 HTTP 邊界保護：`POST /jobs` 超過 `REQUEST_BODY_LIMIT_BYTES` 應回 `413 payload_too_large`，避免大型 payload 進入 JSON decoder 或 worker queue。

> HTTP server timeout 是連線生命週期保護：read header、read、write、idle、shutdown 與 queue drain timeout 都應集中設定並 fail fast，避免 slow client 或部署 drain 時間不可控。

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal error"
  }
}
```

> Panic recovery 是 HTTP 邊界保護：記錄 panic，但 client 只看到穩定 `internal_error`，並保留 `X-Request-ID` 方便排障。

> Request timeout 是 HTTP 合約保護：handler deadline exceeded 要回 `504 request_timeout`，讓 client 能把 timeout 與未知伺服器錯誤分開處理。

> Retry cancellation 是 service 邊界保護：deadlock backoff 要用 `select` 監聽 `ctx.Done()`，request 已取消後不得繼續重試 DB 或 enqueue job。

> Queue backpressure 是 overload 邊界保護：bounded queue 滿載時要回 `domain.ErrQueueFull`，HTTP API 對外回 `503 queue_full`，並用 `node scripts/check-queue-backpressure-contract.mjs` 固定 dropped metric 與 queue depth。

---

## 效能工具

```bash
# CPU profiling
go test -cpuprofile=cpu.out -bench=.
go tool pprof cpu.out

# Memory profiling
go test -memprofile=mem.out -bench=.
go tool pprof mem.out

# Trace
go test -trace=trace.out
go tool trace trace.out

# Race detector
go test -race ./...
go run -race .

# HTTP pprof（本機教學）
import _ "net/http/pprof"
go tool pprof http://localhost:6060/debug/pprof/heap

# production diagnostics：預設關閉，短期啟用時需 token
ENABLE_PPROF=true PPROF_TOKEN=debug-token go run ./cmd/api-worker
curl -H 'Authorization: Bearer debug-token' \
  'http://localhost:8080/debug/pprof/profile?seconds=30' -o profile.pb.gz
go tool pprof profile.pb.gz

# Benchmark A/B
go test -run='^$' -bench=. -benchmem -count=10 ./... > old.txt
go test -run='^$' -bench=. -benchmem -count=10 ./... > new.txt
benchstat old.txt new.txt
```

| 工具 | 用途 |
|---|---|
| `pprof` | CPU / memory / goroutine profiling |
| `trace` | 排程、GC、系統呼叫時間線 |
| `node scripts/check-otel-collector-contract.mjs` | 固定 OTLP collector receiver、debug exporter 與 Compose endpoint |
| `node scripts/check-otel-export-governance-contract.mjs` | OTLP export governance contract gate：固定 Tempo、Jaeger、OTLP backend 或雲端 APM 替換時的 backend owner、sampling rate、retention window、sensitive attribute redaction 與 trace data owner |
| `node scripts/check-alertmanager-routing-contract.mjs` | Alertmanager routing governance contract gate：固定 Alertmanager route、receiver owner、escalation owner、silence policy、notification evidence 與 Compose service |
| `node scripts/check-trace-shutdown-contract.mjs` | 固定 trace provider shutdown deadline、api-worker exit hook 與 `TestTraceShutdownContract` |
| `-race` | 偵測 data race |
| `goleak` | 偵測 goroutine leak |
| `benchstat` | 比較 benchmark 結果 |
| block profile | 找 channel / timer / cond 等同步等待 |
| mutex profile | 找 lock contention |
| `runtime/metrics` | 長期監控 GC、heap、scheduler、goroutine 指標 |

### Release Note 效能矩陣

| 檢查點 | 速查 |
|---|---|
| 官方效能數字 | Go 1.20 頁面需列 Runtime / GC 2%、PGO 3-4%、build speed 10%、ECDSA 5-30%、RSA decrypt 15-45%、RSA encrypt 約 20x slower |
| 成本與收益分開 | 改善項與安全成本都要列，不可只寫「新版更快」 |
| 本地證據 | 每個效能結論都要對應 benchmark、pprof、runtime metrics 或壓測 |
| 同步檢查 | `rg -n "效能比較|crypto/rsa encryption|runtime/metrics histogram" ReleaseNote/go1.20-release-note.html docs/ReleaseNote/go1.20-release-note.html` |

### 效能診斷選工具

| 症狀 | 第一工具 | 指令 / API |
|---|---|---|
| CPU 高 | CPU profile | `go tool pprof .../profile?seconds=30` |
| allocation 高 | heap / alloc profile | `go test -memprofile=mem.out -bench=.` |
| goroutine 變多 | goroutine profile / metrics | `/debug/pprof/goroutine`、`/sched/goroutines:goroutines` |
| lock 等待 | mutex profile | `runtime.SetMutexProfileFraction(5)` |
| channel / timer 阻塞 | block profile | `runtime.SetBlockProfileRate(1)` |
| 平行度不足 / syscall 等待 | execution trace | `go test -trace=trace.out` |
| GC 壓力 | runtime metrics / gctrace | `/gc/heap/live:bytes`、`GODEBUG=gctrace=1` |

> 正式效能結論要附修改前後資料；單次 benchmark 或只看平均值不足以支撐 release decision。
> `/debug/pprof/` 不應常態公開；`production-api-worker` 用 `ENABLE_PPROF`、`PPROF_TOKEN` 與 `TestPprofDiagnosticsContract` 固定 diagnostics 安全邊界。

---

## Module 管理速查

| 指令 | 用途 |
|---|---|
| `go mod init pkg` | 初始化 |
| `go mod tidy` | 清理 + 補齊 |
| `go mod vendor` | 建立 vendor |
| `go mod graph` | 依賴圖 |
| `go mod verify` | 驗證 hash |
| `go get pkg@v1.2.3` | 指定版本 |
| `go get pkg@latest` | 最新版 |
| `go get pkg@none` | 移除 |
| `go list -m all` | 列出所有依賴 |
| `go list -m -u all` | 檢查可更新版本 |
| `govulncheck ./...` | 掃描實際可達的已知漏洞 |
| `go get -tool pkg` | Go 1.24+ 管理專案工具依賴 |

### 依賴更新 Gate

```bash
go list -m -u all
go get example.com/pkg@v1.2.3
go mod tidy
go mod verify
go test ./...
govulncheck ./...
```

| 檢查 | release 判斷 |
|---|---|
| `go.mod` / `go.sum` diff | 必須是預期變更 |
| `go mod verify` | 失敗就停止 release |
| `govulncheck` | 有可達漏洞就升級或移除呼叫 |
| `go list -m -u all` | 高風險安全更新需有處理紀錄 |

---

## 常見陷阱速查

| 陷阱 | 說明 | 解法 |
|---|---|---|
| nil interface | `(*T)(nil)` 放進 interface ≠ nil | 回傳 `nil` 而非 typed nil |
| slice append | append 可能新建底層 array | 不要假設 append 後與原 slice 共享 |
| goroutine leak | 忘記 close channel 或 cancel context | 每個 goroutine 都要有退出路徑 |
| map 併發寫 | `fatal: concurrent map writes` | `sync.Mutex` 或 `sync.Map` |
| range copy | `for _, v := range structSlice` 的 v 是副本 | 用 index `s[i]` 或 pointer slice |
| defer 在 loop | defer 到函式結束才執行 | loop 內手動 close |
| string 是 byte | `len("台灣")` = 6，不是 2 | `[]rune` 或 `utf8.RuneCountInString` |
| time.After leak | loop 中 `time.After` 不被 GC | 用 `time.NewTimer` 並 `Reset` |
| 錯誤忽略 | `result, _ := fn()` | 至少 log 錯誤 |
| shadow 預宣告 | `len := 42` 覆蓋內建 | 避免用預宣告名稱當變數 |
| shadow err | if 內 `:=` 建立新 `err` | 注意用 `=` 而非 `:=` |

---

## 作用域速查

| 層級 | 範圍 | 範例 |
|---|---|---|
| Universe | 全域 | `int` `true` `nil` `len` `append` |
| Package | 同 package 所有檔案 | `var x = 1`（package 層級） |
| File | 單一檔案 | `import "fmt"` |
| Function | 函式體 | 參數、回傳值 |
| Block | `{}` 區塊 | `if x := 1; x > 0 { }` |

---

## panic / recover

```go
// panic 觸發不可恢復錯誤
panic("fatal error")

// recover 只能在 defer 中使用
defer func() {
    if r := recover(); r != nil {
        log.Printf("recovered: %v", r)
    }
}()
```

> 規則：library 不 panic，main/init 可以，HTTP handler 用 middleware recover。

---

## 可變參數 (Variadic)

```go
func sum(nums ...int) int { /* nums 是 []int */ }

sum(1, 2, 3)         // 多個值
sum(slice...)        // 展開 slice
fmt.Println(a ...any) // 標準庫用法
```

---

## `new` vs `make`

| | `new(T)` | `make(T, ...)` |
|---|---|---|
| 回傳 | `*T` | `T` |
| 用於 | 任何型別 | slice / map / channel |
| 初始化 | 零值 | 內部結構已初始化 |

---

## 運算子優先序（高 → 低）

| 優先序 | 運算子 |
|---|---|
| 5 | `*` `/` `%` `<<` `>>` `&` `&^` |
| 4 | `+` `-` `\|` `^` |
| 3 | `==` `!=` `<` `<=` `>` `>=` |
| 2 | `&&` |
| 1 | `\|\|` |

---

## HTTP Server 完整設定

```go
srv := &http.Server{
	Addr:           ":8080",
	Handler:        handler,
	ReadTimeout:    5 * time.Second,
	WriteTimeout:   10 * time.Second,
	IdleTimeout:    60 * time.Second,
	MaxHeaderBytes: 1 << 20,
}

// Graceful Shutdown
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
srv.Shutdown(ctx)
```

| 反模式 | 說明 |
|---|---|
| `http.ListenAndServe` 直接用 | 無法 Graceful Shutdown |
| 不設 Timeout | 易受 Slowloris / 資源耗盡 |
| 不加 Recovery MW | 任一 panic 整個服務崩潰 |

### Go 1.22 路由（原生）

```go
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
})
```

---

## `database/sql` 速查

```go
// 初始化（必設連線池）
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(5 * time.Minute)

// 多筆查詢
rows, err := db.QueryContext(ctx, "SELECT id, name FROM users WHERE active=$1", true)
defer rows.Close()
for rows.Next() { rows.Scan(&u.ID, &u.Name) }
rows.Err() // 必查

// 單筆查詢
err = db.QueryRowContext(ctx, "SELECT id FROM users WHERE id=$1", id).Scan(&u.ID)
errors.Is(err, sql.ErrNoRows) // 查無資料判斷

// Transaction 慣用模式
tx, err := db.BeginTx(ctx, nil)
defer tx.Rollback() // no-op if Commit succeeds
// ... execs ...
tx.Commit()
```

> ⚠️ **SQL Injection**：永遠使用 `$1`、`?` 佔位符，絕不拼接字串。

---

## `log/slog` 速查 (Go 1.21+)

```go
// 設定 JSON handler（生產環境）
slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
	Level: slog.LevelInfo,
})))

// 使用
slog.Info("started", "port", 8080)
slog.Error("failed", "err", err, "user_id", id)

// 帶固定欄位的 logger
logger := slog.Default().With("service", "api", "version", "v1.0")
```

| Level | 用途 |
|---|---|
| `Debug` | 開發追蹤（預設不輸出）|
| `Info` | 正常流程事件 |
| `Warn` | 非預期但可繼續 |
| `Error` | 需要處理的錯誤 |

---

## `time` 格式化（Reference Time）

```go
// Go 的 reference time：2006-01-02 15:04:05 MST
now.Format("2006-01-02")            // "2024-01-15"
now.Format("2006-01-02 15:04:05")   // "2024-01-15 10:00:00"
now.Format(time.RFC3339)            // "2024-01-15T10:00:00Z"
time.Parse("2006-01-02", "2024-01-15")
```

> ⚠️ 格式字串是 `2006-01-02`，不是 `YYYY-MM-DD`！

---

## 現代 Go API (Go 1.20-1.26) 速查

### 泛型集合 (`slices` / `maps`) (Go 1.21)

```go
// slices
slices.Contains(nums, 3)
slices.Sort(nums)
slices.Clone(nums)
nums = slices.Delete(nums, 1, 3)

// maps
m2 := maps.Clone(m1)
maps.DeleteFunc(m1, func(k string, v int) bool { return v < 0 })
```

### 錯誤合併 `errors.Join` (Go 1.20)

```go
var errs []error
errs = append(errs, err1, err2)
return errors.Join(errs...) // 合併多個 error，可用 errors.Is 逐一比對
```

### 進階 Context (Go 1.20/1.21)

```go
// context.Cause (Go 1.20)：附加並取得取消原因
ctx, cancel := context.WithCancelCause(context.Background())
cancel(errors.New("db timeout"))
err := context.Cause(ctx) // 取得具體錯誤

// context.WithoutCancel (Go 1.21)：剝離取消信號 (適合背景任務)
bgCtx := context.WithoutCancel(r.Context())
go writeLog(bgCtx) // r 結束時，bgCtx 不會被 cancel
```

### 全新亂數模組 `math/rand/v2` (Go 1.22)

```go
import "math/rand/v2"

// 全自動 Seed，不再需要 rand.Seed()
n := rand.IntN(100)
f := rand.Float64()
```

### Go 1.25/1.26 工具鏈與 runtime

| 功能 | 版本 | 用途 |
|---|---:|---|
| container-aware `GOMAXPROCS` | Go 1.25+ | Linux container 內預設會考慮 cgroup CPU limit，避免過度排程 |
| `testing/synctest` | Go 1.25+ | 用虛擬時間測併發與 timeout，減少 `time.Sleep` flaky test |
| `go fix` modernizers | Go 1.26+ | 用官方 analyzer 套用現代化 idiom 與標準庫 API 遷移 |
| Green Tea GC | Go 1.26+ | 預設 GC，改善小物件標記與掃描 locality |
| goroutine leak profile | Go 1.26+ experiment | 用 `GOEXPERIMENT=goroutineleakprofile` 偵測部分永久阻塞 goroutine |
| `T.ArtifactDir` / `B.ArtifactDir` / `F.ArtifactDir` | Go 1.26+ | 測試、benchmark、fuzz 產物輸出到固定 artifact 目錄 |

```bash
# Go 1.26+：把 ArtifactDir 產物保留到 CI 可收集的資料夾
go test -artifacts -outputdir ./test-artifacts ./...
```

```go
// Go 1.25+：併發測試不用靠 sleep 猜時間
synctest.Test(t, func(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()

    <-ctx.Done()
    if err := ctx.Err(); !errors.Is(err, context.DeadlineExceeded) {
        t.Fatalf("unexpected err: %v", err)
    }
})
```

---

## 效能報告證據清單

| 場景 | 指令 / 證據 | 注意事項 |
|---|---|---|
| Go benchmark | `go test -run='^$' -bench=. -benchmem -count=10 ./...` | 用 `benchstat` 比較，不用單次數字下結論 |
| 跨語言比較 | `cd examples/performance-comparison && clang -O2 c/bench.c -o /tmp/bench-c && /tmp/bench-c && go test -bench=. -benchmem -count=10 ./go && python3 python/bench.py` | 記錄 CPU、OS、compiler flags、Go/Python 版本與 raw output |
| 跨語言正式報告 | `./TestCode/performance-comparison/run-real-benchmark.sh` | 自動輸出 Markdown 報告與 `測試報告/raw/<timestamp>/`，不要提交產生的 benchmark binary |
| Assembly hot path | `go test ./internal/compute -bench=. -benchmem -count=10` + `go tool objdump -s 'score' ./bin/server` | 只在 pprof 證明 CPU hot path 時使用，且必須有 pure Go fallback |
| CI workflow | `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml")'` + GitHub Actions run | workflow 必須真的存在於 repo，並固定 root test、production contract、race/coverage、govulncheck、Docker build 與 Compose smoke |
| CI quality gate static gate | `node scripts/check-ci-quality-gate-contract.mjs && cd production-api-worker && make ci-quality-gate-check` | 固定 `go mod verify`、production contracts、`go test -race -cover`、`govulncheck ./...`、Docker build、Compose smoke、Makefile 與 CI 入口 |
| Idempotency key contract | `node scripts/check-idempotency-key-contract.mjs && cd production-api-worker && make idempotency-key-check` | 固定 `Idempotency-Key` 重試回同一 job、不重複 enqueue、Postgres unique index、OpenAPI、Makefile 與 CI 入口 |
| API latency metrics contract | `node scripts/check-api-latency-metrics-contract.mjs && cd production-api-worker && make api-latency-metrics-check` | 固定 `api_request_duration_seconds`、route / method / status labels、Go contract test、Makefile 與 CI 入口 |
| Service transaction boundary contract | `node scripts/check-service-transaction-boundary-contract.mjs && cd production-api-worker && make service-transaction-boundary-check` | 固定 LevelReadCommitted transaction、commit 後 enqueue、queue-full failed 回寫與 CI 入口 |
| Trace shutdown contract | `node scripts/check-trace-shutdown-contract.mjs && cd production-api-worker && make trace-shutdown-check` | 固定 trace provider shutdown 3 秒 bounded context、api-worker exit hook 與 CI 入口 |
| Worker shutdown contract | `node scripts/check-worker-shutdown-contract.mjs && cd production-api-worker && make worker-shutdown-check` | 固定 queue close/enqueue mutex、`ErrClosed`、shutdown tests、Makefile 與 CI 入口 |
| Prometheus config contract gate | `node scripts/check-prometheus-config-contract.mjs && cd production-api-worker && make prometheus-check` | 固定 Prometheus scrape job、rule_files、alert rules、Compose monitoring profile、API key scrape auth 風險與 CI 入口 |
| Operational observability contract gate | `node scripts/check-operational-observability-contract.mjs && cd production-api-worker && make operational-observability-check` | 固定 runbook、Prometheus scrape config、alert rules、Compose monitoring profile、API key scrape auth 風險、Makefile 與 CI 入口 |
| Operational runbook scope freshness contract gate | `node scripts/check-operational-runbook-scope-contract.mjs && cd production-api-worker && make operational-runbook-scope-check` | 固定 runbook metadata、API contract scope coverage、Docs publishing contract gate、Release artifact chain contract gate 與供應鏈治理 scope |
| Contract gate inventory | `node scripts/check-contract-gate-inventory-contract.mjs && cd production-api-worker && make contract-gate-inventory-check` | 固定 52 個 root contract checker 全部被 GitHub Actions 呼叫，並同步 Makefile、README、API contract、章節與整合視覺課程入口 |
| Docs publishing contract gate | `node scripts/check-docs-publishing-contract.mjs && cd production-api-worker && make docs-publishing-check` | 固定 `docs/index.html`、GitHub Pages link fix、HTML 主頁教程回鏈、Makefile 與 CI 入口 |
| Production workflow contract gate | `node scripts/check-production-workflow-contract.mjs && cd production-api-worker && make production-workflow-check` | 固定 standalone production workflow 的 contract、race/coverage、govulncheck、Docker build、Compose smoke、failure logs 與 cleanup |
| Syntax flow SVG contract gate | `node scripts/check-syntax-flow-svg-contract.mjs && cd production-api-worker && make syntax-flow-svg-check` | 固定語法流程圖補充頁的 25 個 flow、標準流程圖符號、SVG metadata、blueprint renderer、Makefile 與 CI 入口 |
| Go ReleaseNote contract gate | `node scripts/check-go-release-notes-contract.mjs && cd production-api-worker && make go-release-notes-check` | 固定 Go 1.1-1.26 專業報告、27 個 HTML、官方來源、支援狀態、最新 patch 訊號與 Pages 同步 |
| Go ReleaseNote freshness evidence | `node scripts/check-go-release-notes-freshness-contract.mjs && cd production-api-worker && make go-release-notes-freshness-check` | 固定 official Go Release History verified 時間、Go 1.26.5 / Go 1.25.12 baseline 與 ReleaseNote index 來源證據 |
| Release version consistency contract gate | `node scripts/check-release-version-consistency-contract.mjs && cd production-api-worker && make release-version-consistency-check` | 固定 VERSION、CHANGELOG、README、API contract、OpenAPI、章節、整合視覺課程、docs/index、Makefile 與 CI 目前版本一致 |
| Release artifact chain contract gate | `node scripts/check-release-artifact-chain-contract.mjs && cd production-api-worker && make release-artifact-chain-check` | 固定審查報告、內容需要更新的部分、更新資料、版本標記、CHANGELOG 與 docs/index 同步 |
| Release publish reconciliation contract gate | `node scripts/check-release-publish-reconciliation-contract.mjs && cd production-api-worker && make release-publish-reconciliation-check` | 固定 remote-created / local-final-amended release 與 blocked-push recovery finalization 的 `HEAD`、`origin/main`、`tag^{}`、`force-with-lease`、recovery command 與成功推送輸出 |
| Dependency governance static gate | `node scripts/check-dependency-governance-contract.mjs && cd production-api-worker && make dependency-governance-check` | 固定 `go mod verify`、`go list -m -u all`、`govulncheck ./...`、離線限制、Makefile 與 CI 入口 |
| Supply chain artifact governance contract gate | `node scripts/check-supply-chain-artifact-governance-contract.mjs && cd production-api-worker && make supply-chain-artifact-governance-check` | 固定 SBOM、image signing、provenance / attestation、artifact retention、promotion approval 與 release evidence owner |
| Platform promotion policy contract gate | `node scripts/check-platform-promotion-policy-contract.mjs && cd production-api-worker && make platform-promotion-policy-check` | 固定 platform promotion policy、environment approval、progressive rollout、platform-native signing、artifact verification 與 rollback owner |
| Deployment controller config contract gate | `node scripts/check-deployment-controller-config-contract.mjs && cd production-api-worker && make deployment-controller-config-check` | 固定 deployment controller、cloud environment template、environment manifest、progressive rollout controller、health gate、rollback trigger 與 promotion evidence |
| Performance benchmark governance contract | `node scripts/check-performance-benchmark-governance-contract.mjs && cd production-api-worker && make performance-benchmark-governance-check` | 固定 benchmark A/B、`benchstat old.txt new.txt`、pprof、metrics、Makefile 與 CI 入口 |
| Release rollback drill contract | `node scripts/check-release-rollback-drill-contract.mjs && cd production-api-worker && make release-rollback-drill-check` | 固定 rollback decision、previous image restore、migration rollback boundary、health verification、metrics verification 與 postmortem evidence |
| Docker build contract | `node scripts/check-docker-build-contract.mjs && cd production-api-worker && make docker-build-check` | 固定 Dockerfile、CGO_ENABLED=0、api-worker / migrate binaries、distroless/static-debian12、Makefile 與 CI build tags |
| Compose runtime env contract | `node scripts/check-compose-runtime-env-contract.mjs && cd production-api-worker && make compose-runtime-env-check` | 固定 Docker Compose runtime env、migration dependency、OTEL endpoint、API security env、request limit、trusted proxy、CORS 與 monitoring profile |
| Compose smoke static gate | `node scripts/check-compose-smoke-contract.mjs && cd production-api-worker && docker compose up -d --build && make compose-smoke && docker compose down -v` | 驗證 livez、readyz、job create/read、metrics、失敗 logs、Makefile 與 CI 入口，不只確認 image build 成功 |
| Pprof diagnostics | `ENABLE_PPROF=true PPROF_TOKEN=debug-token go run ./cmd/api-worker` + `curl -H 'Authorization: Bearer debug-token' .../debug/pprof/profile?seconds=30 -o profile.pb.gz` | 預設關閉，短期事故診斷後關閉，profile 檔案不要提交 repo |
| CPU 熱點 | `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30` | 本機教學用；適合 CPU-bound，不適合直接判斷 I/O wait |
| Runtime metrics | `/gc/*`、`/sched/*`、RSS、scrape payload | 升級 Go runtime / GC 前後要用同一組 dashboard threshold |
| 工業通訊效能 | polling interval、timeout、retry、設備回應時間、queue backlog | PLC / DDC / SCADA 場景常被 I/O wait 主導，不能只看語言層 CPU |
