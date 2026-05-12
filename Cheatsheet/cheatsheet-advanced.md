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

# HTTP pprof（生產環境）
import _ "net/http/pprof"
go tool pprof http://localhost:6060/debug/pprof/heap
```

| 工具 | 用途 |
|---|---|
| `pprof` | CPU / memory / goroutine profiling |
| `trace` | 排程、GC、系統呼叫時間線 |
| `-race` | 偵測 data race |
| `goleak` | 偵測 goroutine leak |
| `benchstat` | 比較 benchmark 結果 |

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
