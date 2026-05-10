# Golang 核心知識心智圖 (Mind Map)

這是一份統整本專案所有精華的 Golang 知識心智圖。您可以直接在支援 Mermaid 的 Markdown 編輯器（如 GitHub、Obsidian、Notion）中預覽，或是將原始碼貼到 [Mermaid Live Editor](https://mermaid.live/) 查看。

```mermaid
mindmap
  root((Golang<br/>Go 1.22+))
    基礎語法與型別
      變數宣告
        `var` 零值宣告
        `:=` 短宣告
      核心型別
        `string` (Byte Sequence)
        `rune` (Unicode)
        `slice` (ptr, len, cap)
        `map` (注意 nil panic)
      流程控制
        唯一的迴圈 `for`
        免 `break` 的 `switch`
      函式特性
        多回傳值與 `error`
        `defer` (資源清理 / LIFO)
        First-Class Function
        閉包 (Closure)
    物件感抽象
      沒有 Class 與繼承
      Struct
        Memory Alignment
        組合 (Embedding)
      Method
        Value Receiver
        Pointer Receiver
      Interface
        隱式實作 (Duck Typing)
        消費者定義原則
        空介面 `any`
      泛型 (Generics)
        型別參數 `[T any]`
        `comparable` 約束
    併發哲學 (Concurrency)
      Goroutine
        輕量級 (2KB 起跳)
        M:N 調度器
        避免 Goroutine Leak
      Channel
        Share memory by communicating
        Buffered vs Unbuffered
        由 Sender 關閉
      select
        多路複用
        隨機選擇避免飢餓
      sync 套件
        `WaitGroup` (等待群組)
        `Mutex` / `RWMutex` (鎖)
        `Once` / `OnceValues`
        `Pool` (物件重用減輕 GC)
      context
        Timeout 控制
        Cancellation 信號傳遞
    後端實務 (Standard Lib)
      HTTP Server
        必設 Timeout (Read/Write/Idle)
        Go 1.22 原生路由 `/{id}`
        Middleware 模式 (Chain)
        Graceful Shutdown (`Shutdown(ctx)`)
      database/sql
        連線池調校 (MaxOpen/MaxIdle)
        `defer rows.Close()`
        Transaction (`defer tx.Rollback()`)
        防 SQL Injection (佔位符)
      log/slog
        Go 1.21+ 官方結構化日誌
        JSON Handler
        Context 請求追蹤
    工程化與架構
      專案結構
        `cmd/` (進入點)
        `internal/` (私有封裝)
        依賴反轉 (DI)
      套件管理
        `go.mod` / `go.sum`
        `go mod tidy`
        Go Workspace (`go work`)
      效能調優
        Escape Analysis (逃逸分析)
        `pprof` 效能剖析
        減少 Allocation
      測試實務
        Table-Driven Test
        `t.Cleanup()`
        Fuzzing (模糊測試)
        Testcontainers (整合測試)
      編譯與部署
        `CGO_ENABLED=0` (靜態編譯)
        Multi-stage Docker Build
        `-ldflags="-s -w"` (縮小體積)
```

## 如何使用此心智圖？

1. **全局觀覽**：在開始一個新專案或面試前，快速掃描所有節點，確認自己對每個名詞都有清晰的概念。
2. **知識索驥**：當遇到特定問題（例如不知道如何關閉 Server），可以從 `後端實務` -> `HTTP Server` 中找到對應的關鍵字 `Graceful Shutdown`，再回到 `康乃爾筆記法/05-實務標準庫.md` 查閱詳細實作。
3. **自我檢測**：試著看著心智圖的每個末端節點，自己講出它的 1~2 個地雷或實務慣例。
