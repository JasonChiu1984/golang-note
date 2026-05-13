# 11. 進階測試實務

測試不是只有 `go test`。在大型商業專案中，我們需要處理外部相依性（DB、API）、模擬異常狀況，甚至利用模糊測試抓出邊界條件的 Bug。

## Mocking 策略 (模擬依賴)

在 Go 裡面，Mock 最好的朋友是 Interface。

假設我們有一個依賴資料庫的業務邏輯：

```go
// 1. 定義行為介面（Dependency Inversion）
type UserRepository interface {
	GetUser(id string) (*User, error)
}

// 2. 業務邏輯依賴介面，而不是具體實作
type UserService struct {
	repo UserRepository
}

func (s *UserService) IsPremium(id string) (bool, error) {
	u, err := s.repo.GetUser(id)
	if err != nil {
		return false, err
	}
	return u.Tier == "Premium", nil
}
```

### 手動 Mock (推薦)

對於輕量級的專案，手動寫一個 Mock struct 最直觀：

```go
// 在 _test.go 中建立 Mock
type MockUserRepo struct {
	mockUser *User
	mockErr  error
}

func (m *MockUserRepo) GetUser(id string) (*User, error) {
	return m.mockUser, m.mockErr
}

// 測試案例
func TestIsPremium(t *testing.T) {
	// 注入 mock 行為
	mockRepo := &MockUserRepo{
		mockUser: &User{Tier: "Premium"},
	}
	svc := &UserService{repo: mockRepo}

	got, _ := svc.IsPremium("123")
	if got != true {
		t.Errorf("expected true, got %v", got)
	}
}
```

### 自動化 Mock 工具

當介面很大或專案很複雜時，可以使用 `gomock` (官方維護) 或 `testify/mock`。
* `gomock`：會讀取 Interface 並自動生成 mock 程式碼，嚴格檢查呼叫次數與參數。
* `testify/mock`：不需要生成程式碼，透過 `m.On("GetUser", "123").Return(...)` 設定預期行為。

## Fuzz Testing (模糊測試)

Go 1.18 引入了原生的模糊測試。它會自動生成隨機的輸入資料，幫你找出隱藏的邊界條件（例如導致 panic 的特殊字元）。

```go
// 檔名：parse_test.go
// 函式名稱必須以 Fuzz 開頭，參數是 *testing.F
func FuzzParseInt(f *testing.F) {
	// 1. 提供 Seed corpus (基準測資)
	f.Add("123")
	f.Add("-42")

	// 2. 定義 Fuzz target (第二個參數開始是隨機產生的輸入)
	f.Fuzz(func(t *testing.T, randomStr string) {
		// 執行你的邏輯
		_, err := ParseInt(randomStr)
		
		// Fuzzing 的重點不是判斷對錯，而是確保程式「不會 crash (panic)」
		// err != nil 是正常的，但如果你的 parse 邏輯寫不好導致 panic，
		// Fuzzing 引擎就會抓出來並將該筆資料存入 testdata。
	})
}
```

執行指令：`go test -fuzz=Fuzz` (會無限執行直到出錯或手動停止)。

## Integration Test (整合測試)

單元測試用 Mock，但我們終究需要真實測試資料庫的 SQL 是否正確。

### 使用 Testcontainers

[Testcontainers-go](https://golang.testcontainers.org/) 可以讓你在 Go 測試碼裡面用 Docker 啟動一個臨時的 PostgreSQL / Redis，測試完自動刪除。

```go
func TestDatabaseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	// 啟動一個臨時的 Postgres Docker container
	ctx := context.Background()
	postgresContainer, err := postgres.RunContainer(ctx, ...)
	if err != nil {
		t.Fatal(err)
	}

	// 確保測試結束時清理 container
	t.Cleanup(func() {
		postgresContainer.Terminate(ctx)
	})

	// 取得連線字串並進行真實 DB 測試
	dbURL, _ := postgresContainer.ConnectionString(ctx)
	db, _ := sql.Open("postgres", dbURL)
	
	// ... 執行真實的 INSERT / SELECT 測試 ...
}
```

### `t.Cleanup` 的重要性

過去我們習慣用 `defer` 關閉測試資源。但在 Table-driven test 搭配 `t.Run` 的並行測試中，`defer` 可能會在子測試還沒跑完就執行了。
**最佳實踐**：一律使用 `t.Cleanup()` 來釋放測試資源。

```go
func setupDB(t *testing.T) *sql.DB {
	db := connect()
	t.Cleanup(func() {
		db.Close() // 會在當前 t.Run 結束後才執行
	})
	return db
}
```

## Go 1.25+：`testing/synctest`

併發測試最難的是「時間」：`time.Sleep` 會讓測試慢又 flaky。Go 1.25 的 `testing/synctest` 可在隔離 bubble 中測試 goroutine，並讓時間在所有 goroutine blocked 時快速前進。

```go
func TestTimeoutPath(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()

		done := make(chan struct{})
		go func() {
			<-ctx.Done()
			close(done)
		}()

		synctest.Wait()
		<-done
	})
}
```

| 適合場景 | 說明 |
|---|---|
| timeout / retry | 不必真的 sleep 幾秒 |
| goroutine leak 測試 | 等待 goroutine 進入 blocked 狀態後再斷言 |
| channel 協調 | 比任意 sleep 更穩定 |

> 若你的 module 仍是 Go 1.22，這段只能作為新版 Go 補充；要實際執行需切到 Go 1.25+。

## Go 1.26：測試 Artifact 目錄

Go 1.26 的 `T.ArtifactDir`、`B.ArtifactDir`、`F.ArtifactDir` 可讓測試輸出檔案有固定位置，適合保留 golden diff、截圖、profile、fuzz repro 資料。

```go
func TestRenderGolden(t *testing.T) {
	dir := t.ArtifactDir()
	path := filepath.Join(dir, "render-output.json")
	if err := os.WriteFile(path, []byte(`{"ok":true}`), 0o644); err != nil {
		t.Fatal(err)
	}
}
```

| 過去做法 | Go 1.26 做法 |
|---|---|
| 手刻 temp dir 命名規則 | 使用 `t.ArtifactDir()` |
| CI artifact 路徑分散 | 集中收集 testing artifact |
| golden/debug 輸出易污染 repo | 輸出到測試框架管理的位置 |

## API Contract Test

單元測試驗證內部邏輯，合約測試驗證外部使用者看到的 HTTP 行為。對 production API 來說，handler 重構後仍通過單元測試，不代表 client 不會壞；status code、JSON 欄位、錯誤 code、header 都是合約的一部分。

```go
func TestCreateJobContract(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want 202", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type = %q, want application/json", ct)
	}
}
```

| 合約測試項 | 為什麼重要 |
|---|---|
| HTTP method / path | 防止路由重構破壞 client |
| Status code | client 常用 status 決定 retry、顯示或告警 |
| Response JSON shape | 防止 rename / nesting 造成 decode 失敗 |
| Error code | 比自然語言 message 更適合穩定分支 |
| Header | `Content-Type`、cache、request id 都可能是 client 依賴 |
| Request decoding | malformed JSON、unknown field、trailing JSON 與空白必填欄位都應固定為 `400 invalid_input` |
| Readiness | draining 時 `/readyz=503` 是部署系統依賴的操作合約 |
| Worker shutdown | queue 關閉後 enqueue 應回穩定錯誤，concurrent enqueue + shutdown 不應 panic |
| Panic recovery | 未預期 panic 仍需回穩定 `500 internal_error` JSON |
| Request timeout | handler deadline exceeded 應回 `504 request_timeout`，不可漂移成 `500 internal_error` |
| Retry cancellation | retry backoff 遇到 `ctx.Done()` 時應停止，不再重試交易或 enqueue |
| Startup / DB pool config | 不合法 `PORT`、`QUEUE_SIZE`、`WORKERS`、DB pool size 或 DB pool duration 應 fail fast，不可 silent fallback |

對 `production-api-worker` 這類 service，建議把合約測試獨立命名，讓 release gate 可以聚焦執行：

```bash
cd production-api-worker
go test ./internal/api -run 'Test.*Contract' -count=1
```

> 合約測試不應過度綁定內部 struct；它要固定「外部看見的行為」，例如 JSON 欄位與錯誤 code，而不是 service 裡用了哪個 repository 實作。

### Request Decoding Contract

Request decoder 的錯誤分類很容易被忽略：`json.Decoder` 回傳的格式錯誤若直接丟到統一錯誤轉換層，可能被當成未分類伺服器錯誤而回 `500`。Production API 應該把 decoder 錯誤視為 client input problem，並固定成 `400 invalid_input`。

```go
func TestRequestDecodingContract(t *testing.T) {
    cases := []string{
        `{"name":`,
        `{"name":"resize","priority":"high"}`,
        `{"name":"resize"} {"name":"extra"}`,
        `{"name":"   "}`,
    }
    for _, body := range cases {
        req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(body))
        rec := httptest.NewRecorder()

        handler.ServeHTTP(rec, req)

        if rec.Code != http.StatusBadRequest {
            t.Fatalf("status = %d, want 400", rec.Code)
        }
    }
}
```

| 測試項 | 為什麼重要 |
|---|---|
| Malformed JSON | client request 格式錯誤，不應被誤報為 server fault |
| Unknown field | 防止 client typo 被靜默忽略 |
| Trailing JSON value | 防止只 decode 第一個 object 後放過多餘資料 |
| 空白必填欄位 | `name` 只有空白時仍屬於缺少有效業務輸入 |

### Panic Recovery Contract

HTTP handler 的 recover middleware 是 production 邊界測試，不是用來掩蓋 bug。測試目標是固定「panic 發生時 client 看到什麼」：status code、JSON envelope、request id header 與 log correlation。

```go
func TestPanicRecoveryContract(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize"}`))
	req.Header.Set("X-Request-ID", "panic-request")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if got := rec.Header().Get("X-Request-ID"); got != "panic-request" {
		t.Fatalf("request id = %q", got)
	}
}
```

| 測試項 | 為什麼重要 |
|---|---|
| `500 Internal Server Error` | client 可用穩定 status 做 retry / 告警 |
| `error.code=internal_error` | 不暴露 panic 細節，也不讓錯誤格式漂移 |
| `X-Request-ID` | panic path 仍能對照 log、trace 與 metrics |
| Contract test | 防止 middleware 順序調整時破壞 recovery 行為 |

### Request Timeout Contract

Timeout contract 測試要固定 handler deadline exceeded 時 client 看到的外部行為。這不是測 `time.Sleep`，而是測錯誤分類：`context.DeadlineExceeded` 不能被統一錯誤處理層誤判為 `500 internal_error`。

```go
func TestRequestTimeoutContract(t *testing.T) {
	original := contextWithTimeout
	t.Cleanup(func() { contextWithTimeout = original })
	contextWithTimeout = func(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
		return context.WithDeadline(parent, time.Now().Add(-time.Second))
	}

	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize"}`))
	req.Header.Set("X-Request-ID", "timeout-request")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want 504", rec.Code)
	}
}
```

| 測試項 | 為什麼重要 |
|---|---|
| `504 Gateway Timeout` | client 可把 timeout 與 unknown server fault 分開處理 |
| `error.code=request_timeout` | release 後仍能用穩定 code 做 retry / 告警分支 |
| `X-Request-ID` | timeout path 仍可對照 log、trace 與 metrics |

### Retry Cancellation Test

重試測試不能只檢查「最後成功」。Production service 也要測取消路徑：request timeout、client disconnect 或 shutdown context 觸發後，deadlock backoff 應立即停止，避免已取消的 request 繼續消耗 DB connection 或把 job 排入 queue。

```go
func TestCreateJobStopsDeadlockRetryWhenContextCanceled(t *testing.T) {
	obs := newTestObs(t)
	ctx, cancel := context.WithCancel(context.Background())
	store := &cancelingDeadlockStore{cancel: cancel}
	queue := &fakeQueue{}
	service := NewService(store, queue, obs, func() string { return "job-1" })

	_, err := service.CreateJob(ctx, domain.JobInput{Name: "resize"})

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("want context canceled, got %v", err)
	}
}
```

| 測試項 | 為什麼重要 |
|---|---|
| 取消後只呼叫一次交易 | 防止 request 已取消後仍重試 DB |
| 回傳 `context.Canceled` / deadline | 讓上層可正確分類 timeout / shutdown |
| Queue 沒收到 task | 防止被取消的 request 仍產生背景副作用 |

### Configuration Contract Test

啟動設定也需要測試。Production 問題常常不是 handler 寫錯，而是部署時 `PORT`、queue size、worker count 或 endpoint 設錯。若 loader 遇到錯誤值直接 fallback，服務可能看似正常啟動，實際容量卻和部署宣告不一致。

```go
func TestLoadFromLookupRejectsInvalidRequiredConfig(t *testing.T) {
	_, err := LoadFromLookup(mapLookup(map[string]string{"QUEUE_SIZE": "0"}))
	if err == nil {
		t.Fatal("want config error")
	}
}
```

| 測試項 | 為什麼重要 |
|---|---|
| 預設值 | local memory mode 可不帶 env 啟動 |
| 合法 env | staging / production 可明確覆寫 port、queue、workers |
| 不合法 port | 避免 `PORT=http` 延後到 listen 階段才失敗 |
| 不合法 queue / workers | 避免容量設定錯誤被 silent fallback 掩蓋 |

## 常見陷阱

| 陷阱 | 說明 | 解決方案 |
|---|---|---|
| 過度 Mock | 連標準庫或沒有 side-effect 的邏輯都 Mock，導致測試跟實作綁死。 | 只 Mock 邊界 (I/O、外部 API、DB、時間)。 |
| 忽視 Race Condition | 本機跑測試都過，上 CI/CD 偶爾掛掉 (Flaky tests)。 | 永遠加上 `go test -race` 執行測試。 |
| 共用全域狀態 | 測試之間共用資料庫同一個 table 導致互相干擾。 | 使用 transaction rollback，或為每個測試產生 UUID 的 table/key。 |

## 實務驗證指令矩陣

| 場景 | 建議指令 | 補充 |
|---|---|---|
| 快速單元測試 | `go test ./...` | 本機日常迭代 |
| 排除快取權限問題 | `TMPDIR=$PWD/.tmp GOCACHE=$PWD/.gocache GOMODCACHE=$PWD/.gomodcache go test ./...` | 適合 sandbox、CI、受限目錄 |
| 競態檢查 | `go test -race ./...` | 併發程式改動後必跑 |
| 單一封包 | `go test ./project-concurrent-crawler/crawler -run TestCrawlerRetriesThenSucceeds -count=1` | 聚焦單點回歸 |
| Go 1.25+ 併發時間測試 | `go test ./... -run Synctest` | 驗證 `testing/synctest` 類型案例 |
| Go 1.26 artifact 測試 | `go test -artifacts -outputdir ./test-artifacts ./...` | 搭配 CI 收集 `T.ArtifactDir` 產物 |
| API 合約測試 | `cd production-api-worker && go test ./internal/api -run 'Test.*Contract' -count=1` | 固定 status、JSON schema、錯誤 code 與 header |
| Request decoding 合約 | `cd production-api-worker && go test ./internal/api -run 'TestRequestDecodingContract' -count=1` | 固定 malformed JSON、unknown field、trailing JSON 與空白 name 的 `400 invalid_input` |
| Request ID 合約 | `cd production-api-worker && go test ./internal/api -run 'TestRequestIDContract|TestCreateJobContract' -count=1` | 固定 `X-Request-ID` 保留與自動產生行為 |
| Readiness 合約 | `cd production-api-worker && go test ./internal/api -run 'TestReadinessContract' -count=1` | 固定 ready / draining 對 `/readyz` 的 status code |
| Worker shutdown 安全 | `cd production-api-worker && go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1` | 固定 queue close/enqueue 同步邊界，避免 shutdown race |
| Panic recovery 合約 | `cd production-api-worker && go test ./internal/api -run 'TestPanicRecoveryContract' -count=1` | 固定 panic path 的 `500 internal_error` JSON 與 request id |
| Request timeout 合約 | `cd production-api-worker && go test ./internal/api -run 'TestRequestTimeoutContract' -count=1` | 固定 handler timeout 的 `504 request_timeout` JSON 與 request id |
| Retry cancellation | `cd production-api-worker && go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1` | 固定 deadlock retry backoff 會尊重 context cancellation / deadline |
| Startup / DB pool config | `cd production-api-worker && go test ./internal/config -count=1` | 固定設定預設值、合法 env、DB pool 關係與錯誤設定 fail-fast 行為 |
| Module checksum | `go mod verify` | 確認 module cache 未被竄改 |
| Dependency updates | `go list -m -u all` | 發現可更新版本，作為維護 PR 依據 |
| Vulnerability scan | `govulncheck ./...` | 掃描實際可達的 Go 已知漏洞 |
| Production 專案 | `cd production-api-worker && TMPDIR=$PWD/.tmp GOCACHE=$PWD/.gocache GOMODCACHE=$PWD/.gomodcache go test ./...` | 第一次需要可下載依賴的網路 |

### 受限環境排錯

| 症狀 | 代表什麼 | 處理方向 |
|---|---|---|
| `operation not permitted` 指向系統 cache | `go test` 正在寫系統 `go-build` 或 module cache | 改用 repo-local `TMPDIR` / `GOCACHE` / `GOMODCACHE` |
| `lookup proxy.golang.org: no such host` | 當前環境不能連外抓 module | 改在有網路的環境先下載依賴，或改用 vendoring |
| `govulncheck` 無法連線 | 不能讀取漏洞資料庫或下載工具 | 記錄為待補掃描，不要標成已通過 |
| `dyld ... missing LC_UUID load command` | 本機 test binary / linker 工具鏈異常，不一定是程式邏輯錯 | 先用 `go build` 或更換 toolchain / 測試環境驗證 |

## 小練習

1. 實作一個依賴 `WeatherAPI` 介面的函式，並手動寫一個 Mock 來測試各種天氣情境。
2. 寫一個自訂的字串反轉函式，並用 `Fuzz` 測試看看傳入包含 Emoji 或罕見字元的隨機字串時是否會 panic。
3. 將你的專案測試加上 `t.Cleanup` 取代原本的 `defer`。
4. 把你的測試指令改寫成可在 `TMPDIR/GOCACHE/GOMODCACHE` 受限環境重現的版本。
5. 把 `go mod verify` 與 `govulncheck ./...` 加進 CI，並定義哪些結果要阻擋合併。
