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
| Request correlation contract gate | `X-Request-ID` 需同時固定 response header、request context、structured log `request_id`、trace attribute `request.id` 與 `node scripts/check-request-correlation-contract.mjs` |
| Request decoding contract gate | malformed JSON、unknown field、trailing JSON 與空白必填欄位都應固定為 `400 invalid_input`，並由 `node scripts/check-request-decoding-contract.mjs` 固定文件、OpenAPI、測試與 CI |
| Request body limit | oversized request body 應固定為 `413 payload_too_large`，避免大型 payload 進入 decoder / queue |
| Readiness lifecycle contract gate | `/livez=200`、`/readyz=200/503` 與 public probes 是部署系統依賴的操作合約，並由 `node scripts/check-readiness-contract.mjs` 固定文件、OpenAPI、測試與 CI |
| Worker shutdown | queue 關閉後 enqueue 應回穩定錯誤，concurrent enqueue + shutdown 不應 panic |
| Worker failure contract | worker processor 成功/失敗都需記錄 result metric 與 duration，並由 `node scripts/check-worker-failure-contract.mjs` 固定 |
| Queue backpressure contract | bounded queue 滿載時需回 `domain.ErrQueueFull`、API 回 `503 queue_full`、記錄 dropped metric，並由 `node scripts/check-queue-backpressure-contract.mjs` 固定 |
| Panic recovery contract gate | 未預期 panic 仍需回穩定 `500 internal_error` JSON，並由 `node scripts/check-panic-recovery-contract.mjs` 固定文件、OpenAPI、測試與 CI |
| Request timeout | handler deadline exceeded 應回 `504 request_timeout`，不可漂移成 `500 internal_error` |
| Retry cancellation contract | retry backoff 遇到 `ctx.Done()` 時應停止，不再重試交易或 enqueue，並由 `node scripts/check-retry-cancellation-contract.mjs` 固定 |
| Startup / DB pool config | 不合法 `PORT`、`QUEUE_SIZE`、`WORKERS`、DB pool size 或 DB pool duration 應 fail fast，不可 silent fallback |
| Migration contract gate | migration env、timeout、SQL 檔排序、version 命名與 `node scripts/check-migration-contract.mjs` 應固定，避免 release pipeline 漂移 |
| API security contract gate | `API_KEY` 啟用後 `/jobs`、`/metrics` 需 Bearer token；`/livez`、`/readyz` 不應被認證擋住，並由 `node scripts/check-api-security-contract.mjs` 固定文件、OpenAPI、測試與 CI |
| CORS allowlist | `CORS_ALLOWED_ORIGINS` 只接受 exact `http` / `https` origin；allowed preflight 回 `204`，blocked preflight 回 `403` |
| Pprof diagnostics | `ENABLE_PPROF` 預設關閉；啟用 `/debug/pprof/` 時必須要求 Bearer token，避免 debug endpoint 公開 |
| Rate limit | 每個 client IP 超過 `RATE_LIMIT_REQUESTS_PER_MINUTE` 時需回 `429 rate_limited`，且 health endpoint 不應被限速 |
| Trusted proxy client IP contract gate | `TRUSTED_PROXY_CIDRS` 命中時才採用 `X-Forwarded-For` 第一個 IP；未信任來源必須回到 `RemoteAddr`，並由 `node scripts/check-trusted-proxy-contract.mjs` 固定 |
| HTTP server timeout | `HTTP_READ_HEADER_TIMEOUT`、`HTTP_READ_TIMEOUT`、`HTTP_WRITE_TIMEOUT`、`HTTP_IDLE_TIMEOUT`、`HTTP_SHUTDOWN_TIMEOUT`、`QUEUE_DRAIN_TIMEOUT` 應由 config 套用並 fail fast |
| Shutdown signal | `api-worker` 必須同時監聽 `SIGINT` / `SIGTERM`，並由 `TestMonitoredSignalsContract` 固定，避免正式部署訊號繞過 graceful shutdown |
| Security headers | `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 應由 middleware 固定 |

對 `production-api-worker` 這類 service，建議把合約測試獨立命名，讓 release gate 可以聚焦執行：

```bash
cd production-api-worker
go test ./internal/api -run 'Test.*Contract' -count=1
node ../scripts/check-request-correlation-contract.mjs
node ../scripts/check-readiness-contract.mjs
node ../scripts/check-request-decoding-contract.mjs
node ../scripts/check-api-security-contract.mjs
node ../scripts/check-worker-failure-contract.mjs
node ../scripts/check-retry-cancellation-contract.mjs
go test ./internal/api -run 'TestAPIKeyAuthContract|TestSecurityHeadersContract' -count=1
go test ./internal/api -run 'TestRequestBodyLimitContract' -count=1
go test ./internal/api -run 'TestCORSAllowedOriginsContract' -count=1
go test ./internal/api -run 'TestPprofDiagnosticsContract' -count=1
go test ./internal/api -run 'TestRateLimitContract' -count=1
go test ./cmd/api-worker -run 'TestMonitoredSignalsContract|TestHTTPServerTimeoutContract' -count=1
```

> 合約測試不應過度綁定內部 struct；它要固定「外部看見的行為」，例如 JSON 欄位與錯誤 code，而不是 service 裡用了哪個 repository 實作。

### Shutdown signal contract test

`TestMonitoredSignalsContract` 固定 `api-worker` 的 signal set，避免日後重構時退化成只處理 local Ctrl+C 的 `os.Interrupt`。

```go
func TestMonitoredSignalsContract(t *testing.T) {
    signals := monitoredSignals()
    // must include os.Interrupt and syscall.SIGTERM
}
```

### API Security Contract Test

API security 的測試重點不是把 token 寫死在所有測試裡，而是固定安全邊界：業務 endpoint 與 metrics endpoint 在啟用 `API_KEY` 後需要 Bearer token；health endpoint 仍保持公開，避免 Kubernetes、Docker Compose 或 load balancer 探測被擋住。
這個邊界也需要 `node scripts/check-api-security-contract.mjs` 做靜態 gate，確保 OpenAPI `bearerAuth`、contract tests、章節、Makefile 與 CI workflow 不會在文件重整時掉線。

```go
func TestAPIKeyAuthContract(t *testing.T) {
    handler := NewHandler(service, obs, WithAuthToken("secret-token")).Routes()

    req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize"}`))
    rec := httptest.NewRecorder()
    handler.ServeHTTP(rec, req)
    if rec.Code != http.StatusUnauthorized {
        t.Fatalf("status = %d, want 401", rec.Code)
    }

    req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
    rec = httptest.NewRecorder()
    handler.ServeHTTP(rec, req)
    if rec.Code != http.StatusOK {
        t.Fatalf("readyz status = %d, want 200", rec.Code)
    }
}
```

安全標頭也適合放在合約測試中，因為它們應由 middleware 統一套用，不應依賴每個 handler 手動設定。

### Pprof Diagnostics Contract Test

pprof 是事故診斷工具，不是公開 API。測試要固定三個外部行為：預設不註冊 `/debug/pprof/`、啟用後未帶 token 回 `401 unauthorized`、合法 Bearer token 才能讀 profile index。

```go
func TestPprofDiagnosticsContract(t *testing.T) {
    disabled := NewHandler(service, obs).Routes()
    req := httptest.NewRequest(http.MethodGet, "/debug/pprof/", nil)
    rec := httptest.NewRecorder()
    disabled.ServeHTTP(rec, req)
    if rec.Code != http.StatusNotFound {
        t.Fatalf("status = %d, want 404", rec.Code)
    }

    enabled := NewHandler(service, obs, WithPprof(true, "debug-token")).Routes()
    req.Header.Set("Authorization", "Bearer debug-token")
    rec = httptest.NewRecorder()
    enabled.ServeHTTP(rec, req)
    if rec.Code != http.StatusOK {
        t.Fatalf("status = %d, want 200", rec.Code)
    }
}
```

設定測試也要擋住 `ENABLE_PPROF=true` 但未提供 `PPROF_TOKEN` / `API_KEY` 的部署錯誤，讓 diagnostics endpoint 不會因設定疏忽而裸露。

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
| Request body limit | `REQUEST_BODY_LIMIT_BYTES` 超限時應回 `413 payload_too_large`，不應偽裝成一般 JSON 格式錯誤 |
| HTTP server timeout | server read header、read、write、idle、shutdown 與 queue drain timeout 應有 contract test，避免重構時退回硬編碼或漏設 |

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
| Request timeout static gate | `node scripts/check-request-timeout-contract.mjs` 與 `make request-timeout-check` 防止文件、OpenAPI 或 CI 入口漂移 |

### Compose Smoke Static Gate

Compose smoke 測試是部署合約，不是單純 shell convenience。它必須固定 `docker compose up -d --build` 之後的 `/livez`、`/readyz`、`POST /jobs`、`GET /jobs/{id}` 與 `/metrics`，並在 CI 失敗時輸出 `docker compose logs --no-color`。

| 測試項 | 為什麼重要 |
|---|---|
| Host-side smoke script | runtime image 保持最小，不把 curl 塞進 container |
| `/readyz` | migration、DB 連線與 service lifecycle 可接流量 |
| job create/read | API、service、repository 與 worker queue 端到端可用 |
| `/metrics` | Prometheus endpoint 與 API security smoke 邊界可用 |
| Compose smoke static gate | `node scripts/check-compose-smoke-contract.mjs` 與 `make compose-smoke-check` 防止 script、runbook、Makefile 或 CI 入口漂移 |

### CI Quality Gate Contract

CI quality gate static gate 測的是 release pipeline 是否還完整，不是重新取代單元測試。它固定 `.github/workflows/ci.yml` 必須保留 root course、production contracts、`go mod verify`、`go test -race -cover`、`govulncheck ./...`、Docker build 與 Compose smoke，並用 `make ci-quality-gate-check` 讓本機與 CI 的 release 條款一致。

| 層級 | 驗證 |
|---|---|
| Dependency integrity | root 與 production module 都需保留 `go mod verify` |
| Contract tests | production job 需跑 config、migration、API、worker、lifecycle contract tests |
| Race / coverage | production job 需保留 `go test -race -cover ./... -count=1` |
| Vulnerability scan | root module 與 production module 都需跑 `govulncheck ./...` |
| Docker / smoke | image build 後需跑 Compose smoke，失敗時輸出 `docker compose logs --no-color` |
| Static gate | `node scripts/check-ci-quality-gate-contract.mjs` 與 `make ci-quality-gate-check` 固定 workflow、文件與 Makefile |

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

### Migration Contract Test

Migration 測試要固定兩類行為：一是設定合約，例如 `DATABASE_URL` 必填與 `MIGRATION_TIMEOUT` 必須是正數 duration；二是 migration 檔案規則，例如只收 `.sql`、依檔名排序、version 不可空白或含 whitespace。這些測試不需要先啟動 Postgres，就能保護 release pipeline 的前置規則。

`node scripts/check-migration-contract.mjs` 是這些 Go 測試之外的靜態 gate，會檢查 README、API contract、config loader、migration runner、`cmd/migrate`、Makefile、GitHub Actions 與整合教程是否仍保留 Migration contract gate。這讓教學文件、測試與 CI 入口不會各自漂移。

```go
func TestSQLFilesReturnsSortedSQLFilesOnly(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, "002_add_index.sql")
	writeFile(t, dir, "001_init.sql")
	writeFile(t, dir, "README.md")

	files, err := SQLFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(files[0]) != "001_init.sql" {
		t.Fatalf("first migration = %s", files[0])
	}
}
```

| 測試項 | 為什麼重要 |
|---|---|
| `DATABASE_URL` 必填 | migration 不應像 API memory mode 一樣允許空資料庫 |
| `MIGRATION_TIMEOUT` | 防止 migration job 因 DB lock 或網路問題無限等待 |
| SQL 檔排序 | release pipeline 必須用可預期順序套用 schema |
| Version 命名 | `schema_migrations.version` 要能被 release note、rollback 計畫與 incident review 引用 |

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
| Request decoding contract gate | `node scripts/check-request-decoding-contract.mjs` | 固定 strict decoder、Go test、OpenAPI、README、章節、Makefile 與 CI 入口 |
| Request ID 合約 | `cd production-api-worker && go test ./internal/api -run 'TestRequestIDContract|TestCreateJobContract' -count=1` | 固定 `X-Request-ID` 保留與自動產生行為 |
| Request correlation contract gate | `node scripts/check-request-correlation-contract.mjs` | 固定 `X-Request-ID`、request context、structured log、trace attribute、OpenAPI、章節與 CI 入口 |
| API security contract gate | `node scripts/check-api-security-contract.mjs` | 固定 `API_KEY`、Bearer auth、公開 health probes、安全標頭、Go tests、OpenAPI、章節與 CI 入口 |
| Worker failure contract gate | `node scripts/check-worker-failure-contract.mjs` | 固定 worker result metric、duration、Go tests、章節與 CI 入口 |
| Queue backpressure contract gate | `node scripts/check-queue-backpressure-contract.mjs` | 固定 bounded queue 滿載、`domain.ErrQueueFull`、`503 queue_full`、dropped metric、Go test、章節與 CI 入口 |
| Retry cancellation contract gate | `node scripts/check-retry-cancellation-contract.mjs` | 固定 deadlock retry backoff、context cancellation、Go test、章節與 CI 入口 |
| Readiness lifecycle contract gate | `cd production-api-worker && go test ./internal/api -run 'TestReadinessContract' -count=1 && node scripts/check-readiness-contract.mjs` | 固定 `/livez`、ready / draining 對 `/readyz` 的 status code、public probes、OpenAPI、章節與 CI 入口 |
| Worker shutdown 安全 | `cd production-api-worker && go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1` | 固定 queue close/enqueue 同步邊界，避免 shutdown race |
| Shutdown signal contract | `cd production-api-worker && go test ./cmd/api-worker -run 'TestMonitoredSignalsContract' -count=1` | 固定 Shutdown signal 入口，確認 SIGINT/SIGTERM 都會進入 graceful shutdown |
| Panic recovery 合約 | `cd production-api-worker && go test ./internal/api -run 'TestPanicRecoveryContract' -count=1` | 固定 panic path 的 `500 internal_error` JSON 與 request id |
| Panic recovery contract gate | `node scripts/check-panic-recovery-contract.mjs` | 固定 recover middleware、Go test、OpenAPI、README、章節、Makefile 與 CI 入口 |
| Request timeout 合約 | `cd production-api-worker && go test ./internal/api -run 'TestRequestTimeoutContract' -count=1 && node scripts/check-request-timeout-contract.mjs` | 固定 handler timeout 的 `504 request_timeout` JSON、request id、OpenAPI、Makefile 與 CI 入口 |
| Retry cancellation | `cd production-api-worker && go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1` | 固定 deadlock retry backoff 會尊重 context cancellation / deadline |
| Startup / DB pool config | `cd production-api-worker && go test ./internal/config -count=1` | 固定設定預設值、合法 env、DB pool 關係與錯誤設定 fail-fast 行為 |
| Startup config contract gate | `node scripts/check-startup-config-contract.mjs && cd production-api-worker && make startup-config-check` | 固定 `PORT`、`QUEUE_SIZE`、`WORKERS`、optional endpoint、config loader、Go tests、文件、Makefile 與 CI 入口 |
| DB pool contract gate | `node scripts/check-db-pool-contract.mjs` | 固定 DB pool env、repository pool 套用、`api-worker` wiring、文件、Makefile 與 CI 入口 |
| Migration contract gate | `cd production-api-worker && go test ./internal/config ./internal/migration -count=1 && node scripts/check-migration-contract.mjs` | 固定 migration env、timeout、SQL 檔排序、version 命名、靜態文件與 CI 入口 |
| OpenAPI contract gate | `node scripts/check-openapi-contract.mjs` | 固定 OpenAPI spec、endpoint、schema、error code、Bearer auth 與文件入口 |
| Trusted proxy client IP contract gate | `node scripts/check-trusted-proxy-contract.mjs` | 固定 `TRUSTED_PROXY_CIDRS`、`X-Forwarded-For`、untrusted `RemoteAddr` fallback、runbook、Makefile 與 CI 入口 |
| CORS allowlist gate | `node scripts/check-cors-contract.mjs` | 固定 `CORS_ALLOWED_ORIGINS`、allowlist middleware、preflight 測試與 CI 入口 |
| Compose smoke static gate | `node scripts/check-compose-smoke-contract.mjs && cd production-api-worker && docker compose up -d --build && make compose-smoke && docker compose down -v` | 固定 Docker Compose 啟動後 `/livez`、`/readyz`、job create/read、metrics、失敗 logs、Makefile 與 CI 入口 |
| CI quality gate static gate | `node scripts/check-ci-quality-gate-contract.mjs && cd production-api-worker && make ci-quality-gate-check` | 固定 root course、production contracts、race/coverage、govulncheck、Docker build 與 Compose smoke |
| CI contract parity gate | `node scripts/check-ci-contract-parity-contract.mjs && cd production-api-worker && make ci-contract-parity-check` | 固定 `make ci-contract` 與 GitHub Actions production contract job 的 API test selector，保留 `TestCORSAllowedOriginsContract` |
| Contract gate inventory | `node scripts/check-contract-gate-inventory-contract.mjs && cd production-api-worker && make contract-gate-inventory-check` | 固定 25 個 root contract checker 都被 GitHub Actions 呼叫，避免 checker 只存在於 repo 沒有進入 release gate |
| Operational runbook gate | `node scripts/check-operational-runbook.mjs` | 固定 runbook、Prometheus alert rules、README 與 CI 入口，避免 incident workflow 被文件更新移除 |
| Prometheus config gate | `node scripts/check-prometheus-config.mjs` | 固定 Prometheus scrape job、rule_files、Compose monitoring profile 與 API key 風險說明 |
| OTLP collector gate | `node scripts/check-otel-collector-contract.mjs` | 固定 collector receiver、debug exporter、Compose endpoint、runbook、README 與 CI gate |
| CI workflow syntax | `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml")'` | 固定 GitHub Actions workflow 至少可被 YAML parser 解析 |
| CI production gate | `cd production-api-worker && make ci-contract && go test -race -cover ./... -count=1` | 本機重跑與 CI 對齊的核心合約、race 與 coverage gate |
| CI contract parity gate | `node scripts/check-ci-contract-parity-contract.mjs` | 確認本機與 CI 的 API contract selector 一致，避免只在單一路徑跑到 CORS 合約 |
| Contract gate inventory | `node scripts/check-contract-gate-inventory-contract.mjs` | 確認 25 個 root contract checker 全部被 GitHub Actions 呼叫 |
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
5. 把 `go mod verify`、`govulncheck ./...`、contract tests、OpenAPI contract gate、`go test -race -cover ./...`、Docker build、Compose smoke gate、operational runbook gate 與 Prometheus config gate 加進 CI，並定義哪些結果要阻擋合併。
