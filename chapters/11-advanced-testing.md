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
| Production 專案 | `cd production-api-worker && TMPDIR=$PWD/.tmp GOCACHE=$PWD/.gocache GOMODCACHE=$PWD/.gomodcache go test ./...` | 第一次需要可下載依賴的網路 |

### 受限環境排錯

| 症狀 | 代表什麼 | 處理方向 |
|---|---|---|
| `operation not permitted` 指向系統 cache | `go test` 正在寫系統 `go-build` 或 module cache | 改用 repo-local `TMPDIR` / `GOCACHE` / `GOMODCACHE` |
| `lookup proxy.golang.org: no such host` | 當前環境不能連外抓 module | 改在有網路的環境先下載依賴，或改用 vendoring |
| `dyld ... missing LC_UUID load command` | 本機 test binary / linker 工具鏈異常，不一定是程式邏輯錯 | 先用 `go build` 或更換 toolchain / 測試環境驗證 |

## 小練習

1. 實作一個依賴 `WeatherAPI` 介面的函式，並手動寫一個 Mock 來測試各種天氣情境。
2. 寫一個自訂的字串反轉函式，並用 `Fuzz` 測試看看傳入包含 Emoji 或罕見字元的隨機字串時是否會 panic。
3. 將你的專案測試加上 `t.Cleanup` 取代原本的 `defer`。
4. 把你的測試指令改寫成可在 `TMPDIR/GOCACHE/GOMODCACHE` 受限環境重現的版本。
