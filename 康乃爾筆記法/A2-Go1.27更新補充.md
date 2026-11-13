# A2. Go 1.27.4 更新補充 — 康乃爾筆記

> **查核日期**：2026-11-11 ｜ **最新穩定版**：Go 1.27.4（2026-11-10 發布）
>
> 這份增補涵蓋從舊教材閱讀現代 Go 時最容易混淆的差異，不取代完整 release notes。既有教材與 ReleaseNote HTML 保留各自的歷史基準；本次沒有宣稱全部章節、部署設定或 production module 已完成升級。

## 版本先分清楚

| 🔑 線索欄 | 📝 筆記欄 |
|:--|:--|
| **最新穩定版** | Go **1.27.4**。不是開發中的 tip，也不是 RC。 |
| **仍受支援的上一版** | Go **1.26.11**；依官方政策目前支援 1.27 與 1.26 系列。Go 1.25 已不在一般維護支援範圍。 |
| **Patch 與語言功能** | 1.27.4 是安全／錯誤修補；本頁的語言與 API 新能力主要來自 1.27.0。不要把 patch 更新寫成新增語法。 |
| **Compiler vs `go.mod`** | `go version` 是執行中的工具鏈版本；`go.mod` 的 `go` directive 決定最低 Go 要求與語言版本等。安裝新 compiler 不會把 `go 1.22` 變成 `go 1.27`。 |
| **本倉庫範例** | 根 module 繼續保留 `go 1.22`；[獨立新版範例](../examples/go127/README.md) 使用 `go 1.27.0`，以 Go 1.27.4 驗證。根目錄的 `go test ./...` 不會跨入這個巢狀 module。 |
| **外部 module** | `golang.org/x/sync/errgroup` 不隨 Go 標準庫一起發版。更新 Go 與更新依賴是兩件事，選定相容版本後保留 `go.mod`／`go.sum`。 |

來源：[官方下載頁](https://go.dev/dl/)、[Release History 與支援政策](https://go.dev/doc/devel/release)、[Go Modules Reference](https://go.dev/ref/mod#go-mod-file-go)。

## 從舊筆記補到現代 Go

| 最低版本 | 重點 | 讀筆記時要修正的心智模型 |
|---|---|---|
| Go 1.20 | `errors.Join`、`context.WithCancelCause` | 多錯誤合併與取消原因是不同概念；errgroup 不會自動 Join。 |
| Go 1.21 | `OnceValues`、`WithoutCancel`、deadline／timeout cause | Once 失敗不自動重試；切斷取消後要自己負責背景工作期限。 |
| Go 1.22 | 逐次獨立的迴圈變數、對整數 `range` | 新 loop 語意針對宣告的變數，不會修正 `=` 重用外部變數的 race。 |
| Go 1.23 | range-over-function、`iter` | iterator 是遍歷協定，不會自動啟動 goroutine 或平行執行。 |
| Go 1.24 | 泛型 type alias、`os.Root`、`testing.B.Loop` | `os.Root` 提供限制在目錄內的檔案存取；benchmark 可用 `for b.Loop()`，不要與舊 `b.N` 迴圈混寫。 |
| Go 1.25 | `WaitGroup.Go`、正式 `testing/synctest`、container-aware `GOMAXPROCS` | 減少計數樣板、可控時間測試、注意 module 版本與 GODEBUG 相容設定。 |
| Go 1.26 | `new(expression)`、`errors.AsType`、泛型自我參照約束、預設 Green Tea GC | `new` 可直接以運算式初始化指標；`errors.AsType[E]` 回傳 `(E, bool)`。GC 改變不代表所有 workload 都更快。 |
| Go 1.27 | 泛型方法、JSON v2、標準 `uuid`、正式 goroutine leak profile、timer 舊模式移除 | 方法可宣告自身型別參數，但介面方法仍不可；新 JSON 預設要另外做相容性測試。 |

各版官方依據：[1.20](https://go.dev/doc/go1.20)、[1.21](https://go.dev/doc/go1.21)、[1.22](https://go.dev/doc/go1.22)、[1.23](https://go.dev/doc/go1.23)、[1.24](https://go.dev/doc/go1.24)、[1.25](https://go.dev/doc/go1.25)、[1.26](https://go.dev/doc/go1.26)、[1.27](https://go.dev/doc/go1.27)。

## Go 1.27：特別值得更新的四個觀念

### 1. 方法現在可以有自身型別參數

Go 1.27 以前「方法不能自行宣告型別參數」的限制，不能再不加版本地使用。

```go
// Go 1.27+
type Converter struct{}

func (Converter) Map[T, U any](in []T, f func(T) U) []U {
    out := make([]U, len(in))
    for i, value := range in {
        out[i] = f(value)
    }
    return out
}
```

仍有限制：介面方法不能宣告型別參數，也不能由這種泛型方法實作介面方法。若要支援 Go 1.26 以前，繼續用 package-level 泛型函式。

### 2. JSON v2 正式可用，但不是無條件替換 import

- `encoding/json/v2` 是高階 marshal／unmarshal API，`encoding/json/jsontext` 提供較底層的 JSON 語法處理。
- v2 預設拒絕無效 UTF-8 與重複 object member name，遷移時要測試資料契約。
- 舊 `encoding/json` API 仍受支援，1.27 內部改用 v2 實作並保留舊 API 語意，但錯誤訊息文字可能不同。測試應盡量比對錯誤種類與行為，而不是整段字串。
- 先前實驗版的選項、tag 與 API 有變動，不能把舊實驗教學直接當成 1.27 正式 API。

### 3. 標準 `uuid` 與實驗 SIMD 要分開

Go 1.27 新增標準庫 `uuid`。已有第三方 UUID 型別時，不要只替換 import：先確認資料庫 Scanner／Valuer、JSON 表示與既有公開 API 的型別契約。

`simd` 與 `simd/archsimd` 則仍屬 `GOEXPERIMENT=simd` 控制的實驗能力，不列為本教材一般應用的穩定 API 基準。

### 4. 併發與工具鏈升級檢查

- `time` 的 timer channel 永遠同步，不能再靠 `asynctimerchan` 回復舊模式。舊的排空 channel 寫法與測試假設要重新檢查。
- `goroutineleak` profile 正式可用，不再需要 `GOEXPERIMENT=goroutineleakprofile`；但它不是完整的 leak 證明工具。
- `go test` 預設加入 `stdversion` vet 檢查。新 API 的使用必須與 module／檔案的最低版本宣告一致。

以上 Go 1.27 差異依據：[Go 1.27 Release Notes](https://go.dev/doc/go1.27)。併發細節與可測試範例見 [第 06 頁](06-併發程式設計.md)。

## 升級與驗證清單

1. 安裝受支援 patch，確認 `go version`、CI、Docker base image、開發機工具鏈。
2. 分別決定「工具鏈升級」與「最低語言／API 版本升級」，不要為了新 compiler 就盲改所有 `go.mod`。
3. 更新依賴後執行 `go mod tidy`、`go mod verify`；審閱 module diff。
4. 執行 `go test ./...`、`go test -race ./...`、`go vet ./...`、`govulncheck ./...`。每個巢狀 module 都要各自執行。
5. 覆蓋 JSON 相容性、timer、取消、HTTP／DB timeout、容器 CPU limit 與既有效能基準。
6. `go fix` 的現代化修改應在乾淨分支執行並審閱 diff；它不代表所有行為與依賴已驗證。

## 🗒️ 摘要

> 最新版本以帶日期的官方查核為準。教材功能基準、module 最低版本、實際工具鏈與外部依賴版本要分開記錄；升級完成要靠測試與部署驗證，不能只改版本號。
