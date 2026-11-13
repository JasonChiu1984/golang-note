# 12. Go 1.20–1.27 語法與語意變更查核

查核日期：2026-11-13。最新穩定工具鏈為 **Go 1.27.4**；本章區分語言版本與 patch。1.27.4 是修補版，不是另一套新語法。根教材仍用 `go 1.22` 相容基準；以下新版範例放在獨立的 [Go 1.27 module](../examples/go127/README.md)，不是要求 production module 一起升級。

## 語言變更矩陣

「語言」包括語法、型別規則與執行語意；不代表每一版都有新關鍵字。每列連到該版官方說明。

| 最低正式版本 | 語言／規範變更 | 注意事項 |
|---|---|---|
| [1.20](https://go.dev/doc/go1.20#language) | slice 可轉成 array 值；一般介面等可比較型別可滿足 `comparable` 約束；明確規定 struct／array 比較順序與短路 | `[2]int(s)` 會複製值，長度不足會 panic。`any` 滿足約束不保證其中的動態值能比較，slice 動態值仍可能 panic。`unsafe.String`／`SliceData`／`StringData` 是規範相關套件 API，不是新運算子。 |
| [1.21](https://go.dev/doc/go1.21#language) | 新 builtin `min`、`max`、`clear`；泛型函式與約束方法的型別推導改善；精確化 package 初始化順序；`panic(nil)` 預設產生非 nil 的 panic 值 | `clear(slice)` 清零但不改長度；`clear(map)` 刪除元素。`min`／`max` 不是可接收 `slice...` 的 variadic 函式。不要以 `recover()==nil` 判定 `panic(nil)`。 |
| [1.22](https://go.dev/doc/go1.22#language) | `for` 宣告的變數逐輪獨立；`range` 可走訪整數 | `for i := range 3` 產生 0、1、2；非正數執行零次。使用 `=` 重用外部變數仍共享，不自動消除 race。 |
| [1.23](https://go.dev/doc/go1.23#language) | `range` 正式接受 iterator function | 支援 yield 的 0、1、2 個值形式；yield 回傳 false 後 iterator 必須停止。`iter.Seq` 是標準庫命名型別；range 語法本身不啟動 goroutine。 |
| [1.24](https://go.dev/doc/go1.24#language) | 泛型 type alias 正式支援 | `type Table[K comparable,V any] = map[K]V` 保留型別身分；不是宣告另一個不同的 defined type。1.23 的實驗支援不等於正式最低版本。 |
| [1.25](https://go.dev/doc/go1.25#language) | **沒有影響 Go 程式的語言變更**；規範以明確條文取代 core type 概念 | `WaitGroup.Go`、`testing/synctest` 是標準庫；container-aware GOMAXPROCS 是 runtime；`go.mod ignore` 是工具設定，不能寫成新 Go 語法。 |
| [1.26](https://go.dev/doc/go1.26#language) | `new(expression)`；泛型型別的參數約束可自我參照 | `new(T)` 的零值配置仍有效；`new(x)` 以 x 的值初始化新變數，不是 `&x`。 |
| [1.27](https://go.dev/doc/go1.27#language) | 方法可宣告自身型別參數；struct literal 可指定合法的 promoted field；泛型函式在更多 assignment／conversion 情境可推導 | 三項都要檢查，不能只補泛型方法。介面方法與匿名函式不可自行宣告型別參數；型別推導仍須有足夠的目標型別資訊。 |

## Go 1.26：初始化與自我參照約束

```go
x := 3
p := new(x + 4) // *int，值為 7；不是 x 的位址
x = 8          // *p 仍然是 7
```

自我參照約束可以描述「以自身型別進行運算」的型別：

```go
type Summable[T Summable[T]] interface { Add(T) T }
type Amount int
func (a Amount) Add(b Amount) Amount { return a + b }
func AddValues[T Summable[T]](a, b T) T { return a.Add(b) }
```

這不是取消所有遞迴型別限制，也不是介面方法可以自行宣告型別參數。

## Go 1.27：三項語言變更

### 1. 泛型方法

```go
type Converter struct{}
func (Converter) Identity[T any](value T) T { return value }
// Converter{}.Identity(42)
```

接收者不必是泛型型別。這和 Go 1.18 起「泛型型別的方法沿用接收者型別參數」不同。泛型方法不能用來實作介面方法；`interface { Identity[T any](T) T }` 仍非法，`func[T any](x T) T { ... }` 匿名函式也非法。要相容 1.26 以前，可改用 package-level 泛型函式。

### 2. Struct literal 的 promoted field key

```go
type Inner struct { Value int }
type Outer struct { Inner }
a := Outer{Value: 7}                // Go 1.27+
b := Outer{Inner: Inner{Value: 7}}  // 舊版本也可用
```

`Value` 是經由嵌入欄位提升的欄位。不要把官方「field selector」用語誤寫成 `Outer{Inner.Value: 7}`；此 dotted key 在 Go 1.27.4 編譯器仍會被拒絕。

限制：不得經由嵌入的指標欄位指定內層欄位；不得重複指定同一欄位，也不得同時初始化嵌入 struct 與其中提升欄位。例如 `Outer{Inner: Inner{}, Value: 7}` 非法。欄位可見性、名稱歧義等原有規則仍適用。

### 3. 泛型函式型別推導擴大

```go
func Identity[T any](v T) T { return v }
// 下列放在函式內：
fs := []func(int) int{Identity}
f := (func(string) string)(Identity)
```

目標函式型別提供 T 的資訊。Go 1.21 已支援部分 assignment／return 推導，1.27 將規則推廣到更多 assignment 與 conversion 情境。**不是**任何型別參數都可省略：`f := Identity` 沒有可推導的目標型別仍非法；泛型型別的實例化也不能直接套用函式推導規則。

細節依據：[Language spec：Composite literals](https://go.dev/ref/spec#Composite_literals)、[Method declarations](https://go.dev/ref/spec#Method_declarations)、[Type inference](https://go.dev/ref/spec#Type_inference)。

## 不要混成「新語法」的更新

| 類別 | 例子 | 升級時驗證什麼 |
|---|---|---|
| 標準庫 | 1.25 `WaitGroup.Go`／`testing/synctest`；1.26 `errors.AsType`；1.27 JSON v2／`uuid` | API 最低版本、JSON 資料契約、錯誤與取消行為。 |
| Runtime | Green Tea GC、GOMAXPROCS、timer channel 行為、goroutine leak profile | 效能、排程與生命週期假設，不只是編譯。 |
| 工具鏈 | `go fix`、`go test` 的 vet 檢查、`go doc`、module directives | CI、`go.mod`、檔案 build tags、工具版本。 |
| 外部依賴 | `golang.org/x/sync/errgroup` | 版本獨立於 Go；檢查 `go.mod`／`go.sum`，不因換 compiler 自動升級。 |

## 可重現驗證

```sh
cd examples/go127
go version # 本次驗證：go1.27.4 linux/amd64
go mod verify
go test -race ./... -count=1 -timeout=60s
go vet ./...
```

`language_test.go` 包含 1.20–1.27 的行為測試與正反編譯 fixtures：新語法成功、部分 `-lang` 舊版本邊界拒絕、非法介面泛型方法、匿名泛型函式、嵌入指標與重疊欄位、缺少型別推導上下文。fixtures 使用正在執行測試的工具鏈，不下載舊 compiler；`-lang` 不等於完整重現舊工具鏈，不能把測試結果宣稱為所有歷史 compiler 的實測矩陣。

[版本報告](../ReleaseNote/index.html) · [Go 1.27 增補筆記](../康乃爾筆記法/A2-Go1.27更新補充.md)

安全 patch 與語法版分開追蹤：[2026 年 11 月安全修補](13-go-security-2026-11.md)。
