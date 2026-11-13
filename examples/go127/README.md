# Go 1.27 筆記的可執行範例

這是獨立 module，避免把根教材 `go 1.22` 的相容基準改掉。使用 Go 1.27.4 工具鏈，語言最低版本為 Go 1.27.0；`golang.org/x/sync` 固定 v0.25.0，這是本範例的測試版本，不宣稱它永遠是最新依賴。

## 執行

```sh
cd examples/go127
go version
go mod download
go mod verify
go test -race ./... -count=1 -timeout=60s
go vet ./...
```

根目錄 `go test ./...` 不會進入這個巢狀 module，因此另有 `.github/workflows/go127-notes.yml` 執行新版範例。測試使用記憶體內的 HTTP transport，不對外發送 HTTP 請求，也不以實際 sleep 等待排程。

## 範例內容

- `FetchAll`：有界 HTTP 併發、首錯傳遞、合作式取消、request error／HTTP status 處理與 body 關閉。呼叫端應設定 context timeout。本例只驗證狀態，不下載 body。
- `CollectAll`：`WaitGroup.Go` 搭配每筆任務的 error slot 與 `errors.Join`，保留全部錯誤。此小批次範例未限制併發。
- `language_test.go`：1.20 slice-to-array、1.21 builtin、1.22 loop 變數、1.23 range function、1.24 generic alias、1.26 new／自我參照約束、1.27 promoted field／函式推導的行為測試；另有正反 compiler fixtures 驗證最低語言版本與非法用法。
- `Converter.Map`：Go 1.27 的方法型別參數，不是介面方法型別參數。
- 測試涵蓋：首錯不是全部錯誤、取消後 `Wait` 仍等待所有任務、成功後衍生 context 仍取消、父取消不自動決定 `Wait` error、`TryGo` 額滿、timeout 的 `synctest` 虛擬時間、body 關閉與 malformed URL。

## 最小呼叫片段

在呼叫端匯入 `context`、`net/http`、`time` 及本範例 package 後：

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()
err := modern.FetchAll(ctx, http.DefaultClient, urls, 4)
// 處理 err；不要忽略錯誤或假設取消已強制終止任何任意工作。
```

對照：[併發筆記](../../康乃爾筆記法/06-併發程式設計.md)、[Go 1.27.4 增補](../../康乃爾筆記法/A2-Go1.27更新補充.md)。

語法矩陣與限制見 [第 12 章](../../chapters/12-go-language-changes.md)。Compiler fixtures 使用目前 Go 工具鏈的 `go tool compile -lang`；它只檢查語言規則，不等同執行歷史工具鏈。測試產物只寫到 `t.TempDir()`。
