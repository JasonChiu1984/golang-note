# 10. 效能調優與記憶體管理

對於資深工程師而言，Go 不只是「寫起來很快」，更重要的是了解底層運作機制，寫出「跑起來很快且穩定」的程式碼。

## Escape Analysis (逃逸分析)

Go 會在編譯時期決定變數該放在 Stack（輕量、無 GC 壓力）還是 Heap（需 GC 回收）。這個過程稱為逃逸分析。

| 分配位置 | 說明 |
|---|---|
| **Stack (堆疊)** | 函式結束時自動釋放，零 GC 成本。 |
| **Heap (堆積)** | 生命週期超過函式範圍，由 Garbage Collector (GC) 負責回收。 |

### 如何查看逃逸分析結果

使用 `go build -gcflags="-m"`：

```go
package main

import "fmt"

func createStack() int {
	x := 42 // 分配在 stack
	return x
}

func createHeap() *int {
	x := 42 // x escapes to heap
	return &x
}

func main() {
	a := createStack()
	b := createHeap()
	fmt.Println(a, *b) // fmt.Println 的參數也會逃逸，因為它接受 any (interface{})
}
```

### 常見的逃逸情境

1. **回傳指標**：如上方的 `createHeap`。
2. **存入 Interface**：將具體型別存入 `interface{}`（如 `fmt.Println(x)`）通常會導致逃逸，因為底層需要動態分配。
3. **大小未知的 Slice**：`make([]int, n)` 如果 `n` 是變數，通常會逃逸；如果是常數 `make([]int, 10)` 則不一定。
4. **Closure 捕獲變數**：在 goroutine 中捕獲外部變數。

> **工程經驗**：不要盲目為了避免逃逸而把所有指標改成傳值（Pass by Value）。如果 struct 很大，傳值複製的成本可能高於 GC 成本。保持語意清晰（修改原物件用指標）才是首要原則。

## Memory Alignment (記憶體對齊)

Struct 的大小不僅取決於欄位，還取決於「宣告順序」。CPU 為了高效讀取，會要求資料對齊到特定的記憶體位址（Padding）。

```go
import "unsafe"

// 錯誤示範：大小為 24 bytes
type BadStruct struct {
	a bool   // 1 byte (+ 7 bytes padding)
	b int64  // 8 bytes
	c int32  // 4 bytes (+ 4 bytes padding)
}

// 最佳化：大小為 16 bytes
type GoodStruct struct {
	b int64  // 8 bytes
	c int32  // 4 bytes
	a bool   // 1 byte (+ 3 bytes padding)
}

// unsafe.Sizeof 可以看真實佔用大小
fmt.Println(unsafe.Sizeof(BadStruct{}))  // 24
fmt.Println(unsafe.Sizeof(GoodStruct{})) // 16
```

> **工程經驗**：對於記憶體敏感的高併發應用，宣告 Struct 時請將欄位「由大到小」排序。可使用工具如 `fieldalignment` 自動檢查。

## Garbage Collection (GC) 簡介

Go 使用 **Tricolor Mark-and-Sweep (三色標記清除法)**，並高度優化為「低延遲 (Low Latency)」。

1. **Mark Phase**：找出所有還在使用的物件（STW - Stop The World 極短，通常小於 1ms）。
2. **Sweep Phase**：回收未被標記的物件（與程式並發執行）。

**GC 觸發時機**：預設情況下，當 heap 成長到上一次的兩倍時（`GOGC=100`）會觸發。
**Go 1.19+ 新增 `GOMEMLIMIT`**：可以設定記憶體軟上限，避免 OOM (Out Of Memory)。

### Go 1.26：Green Tea GC

Go 1.26 起，Green Tea GC 已由實驗功能變成預設 GC。它改善小物件標記與掃描的 locality 與 CPU scalability，對大量小物件分配的服務通常更友善。

| 重點 | 實務解讀 |
|---|---|
| 預設啟用 | 升級 Go 1.26 後不需要額外 flag 才會使用新版 GC |
| 仍需量測 | 不要只因新版 GC 就移除 pprof / metrics；升級前後要比較 latency、heap、GC pause |
| 可暫時關閉 | 若遇到明確回歸，可用 `GOEXPERIMENT=nogreenteagc` 建置並回報問題 |
| 與容器相關 | 搭配 `GOMEMLIMIT` 與 Go 1.25+ container-aware `GOMAXPROCS` 一起看，避免只調單一參數 |

## `sync.Pool` 重複利用物件

當你的服務每秒產生數萬個短命的物件（如 byte buffer），會對 GC 造成龐大壓力。`sync.Pool` 提供了一個物件池，讓你可以重複利用這些物件。

```go
var bufferPool = sync.Pool{
	New: func() any {
		// 只有當 Pool 裡面沒有可用的物件時，才會呼叫 New
		return new(bytes.Buffer)
	},
}

func handleRequest() {
	// 1. 從池中拿取
	buf := bufferPool.Get().(*bytes.Buffer)
	
	// 2. 使用完畢後，清空並放回池中
	defer func() {
		buf.Reset() // 非常重要：放回前一定要清空殘留資料
		bufferPool.Put(buf)
	}()

	buf.WriteString("hello performance")
}
```

> **注意**：`sync.Pool` 中的物件隨時可能被 GC 清除，不能用來存放像 DB 連線這種有狀態且不能隨便丟棄的資源（那應該用 connection pool）。

## 效能診斷決策流程

資深工程師調效能時，第一步不是改 code，而是先定義「慢在哪裡」。Go 官方 diagnostics 文件把診斷工具分成 profiling、tracing、debugging、runtime statistics/events；這些工具解的是不同問題，不能混用。

```mermaid
flowchart TD
  A["使用者感覺慢 / CPU 高 / 記憶體高"] --> B["先定義症狀與 SLO"]
  B --> C{問題類型}
  C -->|CPU 熱點| D["CPU profile: go tool pprof"]
  C -->|記憶體 / allocation| E["heap / alloc profile + runtime metrics"]
  C -->|goroutine 卡住| F["goroutine / block / mutex profile"]
  C -->|延遲分布跨多段| G["trace / OpenTelemetry span"]
  C -->|排程 / syscall / GC 時序| H["go tool trace / GODEBUG"]
  D --> I["提出假設"]
  E --> I
  F --> I
  G --> I
  H --> I
  I --> J["修改最小範圍"]
  J --> K["benchmark A/B 或 production 指標驗證"]
```

若效能問題已經進入 production 值班流程，請先對照 `production-api-worker/docs/operational-runbook.md`。runbook 會把 `api_requests_total`、`worker_queue_depth`、`worker_job_duration_seconds` 與 `X-Request-ID` 連到告警、分級、排障與復盤，避免只拿 pprof 或 log 單點猜測。

| 症狀 | 第一工具 | 不適合用 |
|---|---|---|
| 某段 CPU 飆高 | CPU profile | execution trace 不是 hot spot 工具 |
| heap 持續上升 | heap profile、`runtime/metrics` | 只看 `runtime.MemStats` 單一快照 |
| request latency 長尾 | trace / distributed trace | 只看平均 benchmark |
| goroutine 越跑越多 | goroutine profile、`runtime.NumGoroutine` | 只靠 log 猜測 |
| lock contention | mutex profile、block profile | 只加更多 goroutine |
| GC pause 或記憶體壓力 | `/gc/*` runtime metrics、gctrace、heap profile | 只調 `GOGC` 不量測 |

> **工程經驗**：效能 PR 應該附「修改前資料、修改後資料、判讀結論」。如果只有 `快很多` 這種描述，reviewer 無法判斷是否只是測試雜訊。

## Operational Runbook 與告警基線

效能診斷進入 production 後，第一層訊號應該是 SLI / SLO，而不是直接進程式碼。`production-api-worker` 目前提供教學用 runbook 與 Prometheus alert rules：

| Artifact | 用途 |
|---|---|
| `production-api-worker/docs/operational-runbook.md` | 定義 API 5xx、worker latency、queue depth、readiness、incident triage 與復盤流程 |
| `configs/prometheus/production-api-worker-alerts.yml` | 固定 warning / critical alert rule 範例與 runbook link |
| `configs/prometheus/prometheus.yml` | 固定本地 Prometheus scrape job、`/metrics` path 與 `rule_files` 載入 |
| `node scripts/check-operational-runbook.mjs` | 確認 runbook、alert rules、README 與 CI 入口沒有被移除 |
| `node scripts/check-prometheus-config.mjs` | 確認 Prometheus config、Compose monitoring profile、README、runbook 與 CI 入口一致 |
| `node scripts/check-pprof-contract.mjs` | 確認 pprof diagnostics 預設關閉、啟用時要求 token，並同步 README、runbook、測試與 CI |
| `node scripts/check-performance-benchmark-governance-contract.mjs` | Performance benchmark governance contract 固定 benchmark A/B、`benchstat old.txt new.txt`、pprof、metrics、Makefile 與 CI 入口 |

| 告警 | 初判方向 |
|---|---|
| 5xx rate 升高 | 先用 `route` / `method` / `status` 找出 API 合約是否回歸，再用 request id 查 log / trace |
| worker p95 latency 升高 | 檢查 DB pool、queue depth、CPU throttling 與 worker 數，不先盲目加 goroutine |
| queue depth 接近容量 | 判斷 downstream 慢、worker 卡住或 backpressure 策略不足 |
| metrics missing | 檢查 `/metrics` 認證、scrape config、readiness 與 deployment 狀態 |

本地可用 Compose monitoring profile 啟動教學用 Prometheus：

```bash
cd production-api-worker
docker compose --profile monitoring up -d --build
open http://localhost:9090
docker compose down -v
```

本地 trace pipeline 也要先通過 OTLP collector contract。`production-api-worker/otel-collector.yaml` 固定 OTLP gRPC receiver `0.0.0.0:4317`、`debug exporter` 與 traces pipeline；正式環境替換 exporter 前，至少要確認 receiver、endpoint 與 pipeline 名稱沒有漂移。

```bash
node scripts/check-otel-collector-contract.mjs
cd production-api-worker && make otel-check
```

## Benchmark A/B 與 `benchstat`

單次 benchmark 容易被 CPU 溫度、背景程式、電源狀態與測試快取影響。正式比較修改前後時，請重複多次並用 `benchstat` 看統計差異。

```bash
# 修改前
go test -run='^$' -bench=. -benchmem -count=10 ./... > old.txt

# 修改後
go test -run='^$' -bench=. -benchmem -count=10 ./... > new.txt

# 安裝並比較
go install golang.org/x/perf/cmd/benchstat@latest
benchstat old.txt new.txt
```

| 注意事項 | 原因 |
|---|---|
| 使用 `-run='^$'` | 避免 unit test 干擾 benchmark |
| 加 `-benchmem` | 同時觀察 `B/op` 與 `allocs/op` |
| 至少 `-count=10` | 降低雜訊，讓統計比較更有意義 |
| 固定環境 | 不要一邊跑 benchmark 一邊開高負載程式 |
| 沒顯著差異就不要硬說有變快 | `benchstat` 顯示 `~` 時代表沒有足夠證據 |

## Release Note 效能比較矩陣

版本升級不是只看新增 API。Go release note 只要明確提到效能數字、CPU 成本或 memory tradeoff，教材頁面就應該轉成可驗證的升級矩陣：升級前狀態、升級後變化、官方數字、受影響場景與本地驗證指令。

Go 1.20 的效能比較已整理在 `ReleaseNote/go1.20-release-note.html`，重點不是背數字，而是把數字轉成 release gate。

| 官方項目 | 升級決策重點 | 驗證方式 |
|---|---|---|
| Runtime / GC | 官方提到最多約 2% CPU / memory overhead 改善，但仍要看自己的 heap、GC CPU 與 tail latency | `go test -bench=. -benchmem ./...`、pprof、runtime metrics、壓測 |
| Compiler / PGO | PGO preview 可帶來約 3-4% 代表性 benchmark 改善，但只對 hot path 明確的 workload 有意義 | `go build -pgo=off` 對比 `go build -pgo=cpu.pprof` |
| Build speed | generics 後續 build speed 回復，官方提到最高約 10% 改善 | 記錄 cold/warm `go test ./...` wall time |
| crypto/ecdsa | constant-time 實作提高安全性，但 CPU time 約增加 5-30% | 針對 sign / verify 分 curve benchmark |
| crypto/rsa | safer backend 讓 decrypt CPU cost 上升，encrypt 也可能明顯變慢 | 分 key size、architecture、encrypt/decrypt benchmark |
| runtime/metrics histogram | time-based histogram 精度降低但 memory footprint 大幅下降 | 比較 scrape payload、RSS、dashboard alert threshold |

```bash
rg -n "效能比較|crypto/rsa encryption|runtime/metrics histogram" \
  ReleaseNote/go1.20-release-note.html docs/ReleaseNote/go1.20-release-note.html
```

> **工程經驗**：Release Note 的官方效能數字只能當作升級假設，不是你的 production 結論。真正的結論要來自同一台機器、同一組 workload、同一套 benchmark/profile/metrics 證據。

## 跨語言效能比較範例與報告模板

C、Python、Go 的效能差異不能只用「語言快慢」描述。正式比較至少要控制 workload、資料量、compiler / interpreter 版本、build flags、OS、CPU 與原始輸出。教材提供一個可重跑的最小範例：

```bash
cd examples/performance-comparison

clang -O2 c/bench.c -o /tmp/bench-c
/tmp/bench-c

go test -bench=. -benchmem -count=10 ./go

python3 python/bench.py
```

若要產出可交付的正式 Markdown 報告，請從 repo root 使用固定 script：

```bash
./TestCode/performance-comparison/run-real-benchmark.sh
```

| 項目 | 必須記錄 | 風險 |
|---|---|---|
| CPU / OS | CPU 型號、核心數、OS 版本 | 不同 scheduler、cache、turbo policy 會改變結果 |
| C compiler flags | `clang -O2`、`gcc -O3`、是否 `-march=native` | debug build 與 optimized build 結論不可混用 |
| Go / Python 版本 | `go version`、`python3 --version` | runtime、GC、interpreter 差異會讓結果漂移 |
| 資料量 | iteration、payload size、連線數、檔案大小 | 小資料容易被啟動成本或 cache effect 主導 |
| 原始結果 | stdout、`go test -bench`、`time` / profiler output | 只寫平均倍率無法被 reviewer 追溯 |
| 報告產物 | `測試報告/<timestamp>-C-Python-Go-真實效能測試報告.md`、`測試報告/raw/<timestamp>/` | 沒有 raw output 就無法重建測試條件 |

> **工程經驗**：跨語言比較最常見的錯誤，是拿 C 的最佳化 build 對 Go/Python 的預設執行，或把 CPU-bound 結論套到 I/O-bound 工業通訊場景。若是 PLC / DDC / SCADA gateway，還要把 polling interval、timeout、retry、設備回應時間與 queue backlog 一起記錄。

## Assembly 微服務的效能邊界

`docs/golang-assembly-microservice.html` 是進階補充教材，不是一般服務設計的預設路線。Assembly 只適合明確可量測、可隔離、可回退的 CPU hot path；HTTP、JSON、DB、queue、OPC UA / Modbus / BACnet polling 都應留在 Go。

| 檢查點 | 必須成立 | 不成立時的決策 |
|---|---|---|
| Hot path 證據 | pprof 或 benchmark 顯示該 loop 是主要 CPU 成本 | 不導入 assembly |
| Fallback | 同一函式有 pure Go 版本與一致性測試 | 先補 fallback 再談最佳化 |
| Engine selection | `ENGINE=auto|asm|go` 由部署設定控制 | 不讓外部 request 任意切換 |
| Benchmark | `go test -bench=. -benchmem -count=10` 比較 asm / Go | 小於明確收益時保留 Go |
| Disassembly | `go tool objdump` 可確認 symbol 與 build tag | 無法驗證就不發布 |

> **工程經驗**：Assembly 的維護成本來自 ABI、GOARCH、build tag、debug 與 onboarding。若 benchmark 只快 1% 到 3%，通常不值得讓團隊承擔跨平台與長期維護成本。

## Profiling (效能分析)

當程式變慢時，不要用猜的，用 `pprof` 來測量。

### 內建 HTTP pprof

在長時間執行的服務（如 Web API）中，引入 `net/http/pprof`。本機教學可以用獨立 debug port；production service 則應像 `production-api-worker` 一樣預設關閉，只有 `ENABLE_PPROF=true` 且有 `PPROF_TOKEN` / `API_KEY` 時才註冊 `/debug/pprof/`。

```go
import _ "net/http/pprof"

func main() {
	// 啟動 pprof server
	go func() {
		log.Println(http.ListenAndServe("localhost:6060", nil))
	}()
	// ... 你的主程式
}
```

### 如何分析

在終端機使用 `go tool pprof` 抓取資料：

| 指令 | 用途 |
|---|---|
| `curl -H 'Authorization: Bearer debug-token' 'http://localhost:8080/debug/pprof/profile?seconds=30' -o profile.pb.gz && go tool pprof profile.pb.gz` | 受控 production diagnostics：帶 Bearer token 擷取 30 秒 CPU profile |
| `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30` | 擷取 30 秒的 **CPU 瓶頸** |
| `go tool pprof http://localhost:6060/debug/pprof/heap` | 查看目前 **記憶體用量** 與分配熱點 |
| `go tool pprof http://localhost:6060/debug/pprof/goroutine` | 查看目前的 **goroutine 數量與狀態** |
| `go tool pprof http://localhost:6060/debug/pprof/block` | 查看 goroutine 卡在 channel、mutex、timer 等同步點的位置 |
| `go tool pprof http://localhost:6060/debug/pprof/mutex` | 查看 mutex contention 熱點 |

**常用 pprof 互動指令**：
- `top`：列出最耗資源的函式。
- `web`：在瀏覽器中開啟視覺化的呼叫圖 (Call Graph)，非常直觀（需安裝 Graphviz）。
- `list <func>`：看某個函式每一行程式碼的耗時。

### Block / Mutex Profile

block profile 與 mutex profile 預設不是完整啟用，因為它們會增加執行成本。只在需要診斷同步阻塞時打開。

```go
func enableContentionProfiles() {
	// 每次 block 都取樣，適合短時間診斷；長時間 production 可調大。
	runtime.SetBlockProfileRate(1)

	// 大約每 5 次 mutex contention 取樣一次。
	runtime.SetMutexProfileFraction(5)
}
```

| Profile | 看到什麼 | 常見修正 |
|---|---|---|
| block | goroutine 等 channel send/receive、select、cond、timer 的位置 | 加 buffer、調整 fan-in/out、讓 cancel path 可退出 |
| mutex | 哪些 lock 等待最久 | 縮小 critical section、分片鎖、改資料所有權 |
| goroutine | 目前所有 goroutine stack | 找 leak、deadlock、卡住的 I/O |

## `runtime/metrics` 與 GODEBUG

`runtime/metrics` 提供比 `runtime.ReadMemStats` 更一般化、可演進的 runtime 指標介面。做服務監控時，不要只在問題發生後抓 pprof；平常就應該看 GC、heap、goroutine、scheduler 類指標的趨勢。

```go
samples := []metrics.Sample{
	{Name: "/gc/heap/live:bytes"},
	{Name: "/gc/heap/goal:bytes"},
	{Name: "/sched/goroutines:goroutines"},
}
metrics.Read(samples)
for _, sample := range samples {
	fmt.Println(sample.Name, sample.Value)
}
```

| 指標 / 開關 | 用途 |
|---|---|
| `/gc/heap/live:bytes` | 上次 GC 後仍存活的 heap，觀察長期記憶體壓力 |
| `/gc/heap/goal:bytes` | 下一輪 GC 目標，搭配 `GOGC` / `GOMEMLIMIT` 判讀 |
| `/sched/goroutines:goroutines` | goroutine 數量，快速偵測 leak 趨勢 |
| `GODEBUG=gctrace=1` | 印出 GC 事件，短時間定位 GC 壓力 |
| `GODEBUG=schedtrace=1000` | 每秒印出 scheduler 狀態，診斷排程與 runnable goroutine 壓力 |

## Execution Trace

`go tool trace` 看的是時間線：goroutine 何時 runnable、何時執行、何時被 syscall 或 GC 影響。它適合回答「為什麼 CPU 沒有吃滿」、「哪段流程被序列化」、「timer / network / syscall 是否拖慢整體」。

```bash
go test -trace=trace.out ./...
go tool trace trace.out
```

| 適合用 trace | 先不要用 trace |
|---|---|
| 查平行度不足、scheduler 延遲、syscall 等待 | 找 CPU hot function |
| 查 goroutine 在時間線上的互相等待 | 找 allocation 熱點 |
| 查 GC、network、timer 對 request 的時序影響 | 取代 distributed tracing |

## Production Profiling 安全邊界

pprof 可以在 production 使用，但要有邊界。CPU profile、block profile、mutex profile 都可能帶來額外成本；正式服務建議只開在內網管理端口、加上存取控制，並一次只收集一種 profile。

| 做法 | 原因 |
|---|---|
| 預設關閉 `/debug/pprof/` | 避免 heap、goroutine、cmdline、trace 資訊常態暴露 |
| 啟用時要求 Bearer token | 讓 diagnostics endpoint 也有明確存取合約 |
| pprof 綁 `localhost` 或管理網段 | 避免公開 debug endpoint |
| 隨機挑單一 replica 取樣 | 避免整個服務同時承受 profiling 成本 |
| CPU profile 設短時間窗口 | 降低對 latency 的影響 |
| 不同 profile 分開收集 | profiling 工具可能互相干擾 |
| 保存 profile 檔案與 commit SHA | 讓效能結論可追溯 |
| 診斷完成後關閉 `ENABLE_PPROF` | 避免短期事故設定變成永久攻擊面 |

## 常見陷阱

| 陷阱 | 說明 |
|---|---|
| 過早優化 | 不要一開始就用 `sync.Pool` 或斤斤計較逃逸分析。先求對，再求快。 |
| `fmt.Sprintf` 濫用 | 字串串接在迴圈中極度耗能。請改用 `strings.Builder`。 |
| Slice 容量未預分配 | 如果知道長度，務必 `make([]int, 0, capacity)`，減少 append 時的 array 搬移。 |
| 忘記 Reset | 把物件放回 `sync.Pool` 前忘記清空，導致下一次 Get() 拿到髒資料。 |
| 看錯工具 | 用 trace 找 CPU hot spot、用 CPU profile 判斷長尾延遲，都容易得出錯誤結論。 |
| benchmark 次數太少 | 單次 `go test -bench` 只能當煙霧測試，不能當正式效能結論。 |

## 小練習

1. 寫一段字串串接程式，分別用 `+` 和 `strings.Builder`，並加上 `//go:noinline` 測試 `go build -gcflags="-m"` 的逃逸狀況。
2. 試著調整 struct 欄位順序，用 `unsafe.Sizeof` 觀察記憶體大小變化。
3. 在你的並發爬蟲專案中加上 pprof endpoint，用 `go tool pprof` 查看 CPU 熱點。
4. 對同一個 benchmark 跑 `-count=10`，用 `benchstat` 比較修改前後結果。
5. 在短時間測試環境啟用 block / mutex profile，觀察 worker pool 是否有 lock 或 channel contention。
