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

## Profiling (效能分析)

當程式變慢時，不要用猜的，用 `pprof` 來測量。

### 內建 HTTP pprof

在長時間執行的服務（如 Web API）中，引入 `net/http/pprof`：

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
| `go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30` | 擷取 30 秒的 **CPU 瓶頸** |
| `go tool pprof http://localhost:6060/debug/pprof/heap` | 查看目前 **記憶體用量** 與分配熱點 |
| `go tool pprof http://localhost:6060/debug/pprof/goroutine` | 查看目前的 **goroutine 數量與狀態** |

**常用 pprof 互動指令**：
- `top`：列出最耗資源的函式。
- `web`：在瀏覽器中開啟視覺化的呼叫圖 (Call Graph)，非常直觀（需安裝 Graphviz）。
- `list <func>`：看某個函式每一行程式碼的耗時。

## 常見陷阱

| 陷阱 | 說明 |
|---|---|
| 過早優化 | 不要一開始就用 `sync.Pool` 或斤斤計較逃逸分析。先求對，再求快。 |
| `fmt.Sprintf` 濫用 | 字串串接在迴圈中極度耗能。請改用 `strings.Builder`。 |
| Slice 容量未預分配 | 如果知道長度，務必 `make([]int, 0, capacity)`，減少 append 時的 array 搬移。 |
| 忘記 Reset | 把物件放回 `sync.Pool` 前忘記清空，導致下一次 Get() 拿到髒資料。 |

## 小練習

1. 寫一段字串串接程式，分別用 `+` 和 `strings.Builder`，並加上 `//go:noinline` 測試 `go build -gcflags="-m"` 的逃逸狀況。
2. 試著調整 struct 欄位順序，用 `unsafe.Sizeof` 觀察記憶體大小變化。
3. 在你的並發爬蟲專案中加上 pprof endpoint，用 `go tool pprof` 查看 CPU 熱點。
