# Changelog

## v1.0.21 - 2026-05-13

- 新增 2026-05-13 17:03 資深工程師審查報告，確認 Go 1.20 效能矩陣已補齊，但 Go 1.2-1.26 Release Note 仍需要把官方段落細節重寫成果正式發布並同步到 Pages。
- `scripts/generate-go-release-notes.mjs` 補強官方段落解析與細節重寫，讓非 Go 1.20 版本也有 `官方段落細節重寫摘要`，並把 Tools、Ports、minor changes、new package 與 Patch Revisions 轉成工程導入與驗證語言。
- `ReleaseNote/go1.2-release-note.html` 到 `ReleaseNote/go1.26-release-note.html` 重新產生，補齊 Go 1.21-Go 1.26 的 Tools / Ports / minor changes / 新 package rows，並統一 Go 1.19-Go 1.26 phase wording。
- `docs/ReleaseNote/` 已同步根目錄 ReleaseNote HTML，避免 GitHub Pages 版落後於本地正式報告。
- README 與 VERSION 更新到 `v1.0.21`，新增 Release Note 官方覆蓋驗證 gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並保留 GitHub Pages 可用的 `ReleaseNote/index.html` 連結。

## v1.0.20 - 2026-05-13

- 新增 2026-05-13 16:03 資深工程師審查報告，確認 production migration contract 已補齊，但 Go 1.20 Release Note 仍缺少可直接用於升級決策的效能比較矩陣。
- `scripts/generate-go-release-notes.mjs` 新增 Go 1.20 `performance` 資料結構，讓後續重新產生頁面時保留效能比較區塊。
- `ReleaseNote/go1.20-release-note.html` 新增「效能比較」區塊，整理 Runtime / GC、PGO、build speed、ECDSA、RSA decrypt/encrypt 與 runtime metrics histogram 的官方數字、成本與驗證方式。
- 擴充 Go 1.20 coverage / added / compatibility 表，補強 struct/array comparison order、XML validation、net/http、runtime/cgo、syscall cgroup、crypto/x509 ECDH key parsing 等細節。
- README、第 10 章、進階 Cheat Sheet 與康乃爾筆記補上 Release Note 效能矩陣的驗證 gate，避免升級說明只列功能而不列性能成本。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並修正 Release Notes 連結為 GitHub Pages 可用的 `ReleaseNote/index.html`。
- `docs/ReleaseNote/` 已同步 Go 1.20 效能比較內容，讓 Pages 版與根目錄 ReleaseNote 保持一致。

## v1.0.19 - 2026-05-13

- 新增 2026-05-13 15:03 資深工程師審查報告，確認 DB pool contract 已補齊，但 migration CLI 仍缺少 production migration contract。
- `production-api-worker/internal/config` 新增 `MigrationConfig`、`MIGRATIONS_DIR` 與 `MIGRATION_TIMEOUT` 驗證，migration 缺少 `DATABASE_URL` 時會 fail fast。
- 新增 `production-api-worker/internal/migration`，負責 SQL 檔排序、版本命名檢查、`schema_migrations` table、已套用版本略過與每檔 transaction 套用。
- `cmd/migrate` 改為只做設定載入、DB open/ping 與 migration runner wire-up，避免 CLI 入口堆疊 migration 業務邏輯。
- 新增 config / migration unit tests，固定 migration env、timeout、SQL 檔排序與版本解析規則。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 migration contract 與 release gate。
- `docs/index.html` 已重新由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，並保持 GitHub Pages 可用的 Release Notes 連結。
- 一併發布前序產生的 Go 1.2-1.26 專業 Release Note HTML 與 `scripts/generate-go-release-notes.mjs`，並同步到 `docs/ReleaseNote/`。

## v1.0.18 - 2026-05-13

- 新增 2026-05-13 14:02 資深工程師審查報告，確認教程已具備 startup configuration contract，但 Postgres connection pool 仍硬編碼在 repository 層。
- `production-api-worker/internal/config` 新增 `DATABASE_MAX_OPEN_CONNS`、`DATABASE_MAX_IDLE_CONNS` 與 `DATABASE_CONN_MAX_LIFETIME` 驗證。
- `production-api-worker/internal/repository` 新增 `PoolConfig` 與 `OpenPostgresWithPool`，讓 `cmd/api-worker` 由啟動設定注入 DB pool。
- 新增 config unit tests，固定 DB pool 預設值、合法 env、idle/open 關係與 duration 錯誤行為。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 DB pool contract 與 release gate。
- `docs/index.html` 已重新執行同步步驟，並保留 GitHub Pages 可用的 `ReleaseNote/index.html` 連結，避免回退前次 release-note 路徑修正。

## v1.0.17 - 2026-05-13

- 新增 2026-05-13 13:02 資深工程師審查報告，確認教程已具備 API / timeout / shutdown / retry 合約，但啟動設定仍會 silent fallback。
- `production-api-worker` 新增 `internal/config`，集中讀取 `PORT`、`QUEUE_SIZE`、`WORKERS`、`DATABASE_URL` 與 `OTEL_EXPORTER_OTLP_ENDPOINT`。
- `cmd/api-worker` 啟動時會驗證 port 範圍與正整數容量設定；錯誤設定直接 fail fast，不再悄悄套用預設值。
- 新增 config unit tests，固定預設值、合法 env、非法 port、非法 queue size 與非法 worker count。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 startup configuration contract 與 release gate。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.16 - 2026-05-13

- 新增 2026-05-13 12:02 資深工程師審查報告，確認教程已補齊 retry cancellation，但 HTTP handler 對 `context.DeadlineExceeded` 尚未形成 timeout 合約。
- `production-api-worker/internal/api.Handler.writeError` 現在會把 request deadline exceeded 分類為 `504 Gateway Timeout` 與 `error.code=request_timeout`。
- 新增 `TestRequestTimeoutContract`，固定 request timeout path 保留 `X-Request-ID` 並回穩定 JSON envelope。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 request timeout contract 與 release gate。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.15 - 2026-05-13

- 新增 2026-05-13 11:51 資深工程師審查報告，確認教程已具備 API contract、lifecycle、panic recovery 與 queue shutdown safety，但 service deadlock retry 尚未固定 context cancellation 行為。
- `production-api-worker/internal/app.Service` 的 deadlock retry backoff 改為監聽 `ctx.Done()`，request timeout、client disconnect 或 shutdown context 取消後會立即停止重試。
- `app.Service` 改依賴小型 `Store` / `Observability` interface，讓 service 層取消語意可在無 Postgres / OpenTelemetry 下載的受限環境獨立測試。
- 新增 `TestCreateJobStopsDeadlockRetryWhenContextCanceled`，固定取消後不再呼叫下一次交易，也不 enqueue 背景 job。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 context-aware retry、cancellation gate 與驗證指令。
- `docs/index.html` 同步由 `圖解筆記3-4整合/golang-complete-visual-course.html` 複製產生，供 GitHub Pages / docs 入口使用。

## v1.0.14 - 2026-05-13

- 新增 2026-05-13 11:02 資深工程師審查報告，確認 production API 合約已補齊，但 worker queue shutdown 仍有 enqueue 與 close 競態風險。
- `production-api-worker/internal/worker` 移除對完整 observability package 的直接依賴，改用小型 `Observer` interface，讓 worker queue 可在離線/受限環境獨立測試。
- `Queue.Enqueue` 與 `Queue.ShutdownContext` 現在共用 mutex 保護 `closed` 狀態與 channel close/send 邊界，避免 shutdown 期間 `send on closed channel` panic。
- 新增 worker queue shutdown 回歸測試，固定 close 後 enqueue 回 `ErrClosed`，並覆蓋 concurrent enqueue + shutdown 不 panic 的情境。
- README、第 7 / 11 章、進階 Cheat Sheet、康乃爾筆記與 `production-api-worker` 文件補上 queue shutdown safety 與驗證 gate。

## v1.0.13 - 2026-05-13

- 新增 2026-05-13 10:02 資深工程師審查報告，確認教程已具備 API contract、request correlation、lifecycle 與 panic recovery，但 request decode 失敗仍會誤分類成 500。
- README 新增 strict request decoding 版本策略與驗證指令，將 `TestRequestDecodingContract` 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 request decoder gate：malformed JSON、unknown field、trailing JSON value 與空白 name 都需回 `400 invalid_input`。
- `production-api-worker` API handler 新增 `decodeJobInput`，使用 `DisallowUnknownFields`、單一 JSON value 檢查與 `domain.ErrInvalidInput` wrapping。
- `production-api-worker` contract tests 新增 request decoding 回歸檢查，避免 JSON parser 錯誤漂移為 `500 internal_error`。

## v1.0.12 - 2026-05-13

- 新增 2026-05-13 09:02 資深工程師審查報告，確認教程已具備 API contract、request correlation 與 lifecycle gate，但 HTTP panic recovery 尚未形成可測合約。
- README 新增 panic recovery 版本策略與驗證指令，將 `TestPanicRecoveryContract` 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 recover middleware 的 production 邊界：保留 `X-Request-ID`、回 `500 internal_error` JSON、記錄 structured log。
- `production-api-worker` API routes 新增 recover middleware，panic 會轉為穩定錯誤 envelope，並讓 metrics middleware 可記錄 500 結果。
- `production-api-worker` contract tests 新增 panic recovery 回歸檢查，避免 handler / queue 未預期 panic 破壞外部錯誤格式。

## v1.0.11 - 2026-05-13

- 新增 2026-05-13 08:03 資深工程師審查報告，確認教材已具備 production API / observability 深度，但服務生命週期仍需可測化。
- README 新增服務生命週期版本策略與 readiness / drain 驗證指令，將 `/readyz` draining contract 納入主教材入口。
- 第 7 / 11 章與進階 Cheat Sheet 補上 graceful shutdown 決策：先 readiness draining，再停止 HTTP intake，最後等待 worker queue drain。
- `production-api-worker` 新增 lifecycle readiness 狀態，`/readyz` 在 draining 時回 `503 Service Unavailable`。
- `production-api-worker` shutdown flow 改為獨立 worker context、HTTP shutdown deadline 與 queue drain deadline，並新增 readiness contract test。

## v1.0.10 - 2026-05-13

- 新增 2026-05-13 07:02 資深工程師審查報告，確認教材已具備專案深度，但 production observability correlation 仍需落到可測試合約。
- README 新增 Request ID 與觀測性關聯版本策略，將 `X-Request-ID` contract test 納入主教材入口。
- 第 7 / 11 章、進階 Cheat Sheet 與康乃爾筆記補上 request correlation gate：header、structured log 欄位、trace attribute 與 metrics label 需保持穩定。
- `production-api-worker` API middleware 新增 `X-Request-ID` 保留/產生、request-scoped logger、trace attributes，錯誤 log 會帶上 `request_id` 與 `error_code`。
- `production-api-worker` contract tests 新增 Request ID header 回傳與自動產生回歸檢查。

## v1.0.9 - 2026-05-13

- 新增 2026-05-13 06:03 資深工程師審查報告，確認教材已具備專案開發深度與廣度，但 production API 合約與相容性 gate 仍需補強。
- README 新增 API 合約版本策略與驗證指令，將 `production-api-worker` 的 contract test 納入主教材入口。
- 第 7 章補上 API 合約與相容性設計：request/response schema、錯誤格式、狀態碼、版本策略與 release gate。
- 第 11 章與進階 Cheat Sheet 補上 API contract test 檢查重點，避免 HTTP status、JSON shape 或 error code 意外破壞使用端。
- `production-api-worker` 新增 API 合約文件，並把錯誤回應改成穩定的 `error.code` / `error.message` envelope，附上合約回歸測試。

## v1.0.8 - 2026-05-13

- 新增 2026-05-13 05:04 資深工程師審查報告，確認教程已具備專案開發深度，但效能調優章仍缺少可重複的診斷決策流程。
- README 新增效能診斷版本策略與驗證指令，將 benchmark A/B、`benchstat`、pprof 與 execution trace 納入主教材入口。
- 第 10 章補上效能問題定位流程、benchmark 統計比較、runtime metrics、block/mutex profile、production profiling 安全邊界與 trace 使用時機。
- 康乃爾筆記與進階 Cheat Sheet 同步補上 runtime metrics、`benchstat`、block/mutex profile、GODEBUG 與 trace 決策表。
- `production-api-worker` README 新增效能驗證 gate，要求 API / worker 改動保留 benchmark、profile 或 metrics 證據。

## v1.0.7 - 2026-05-13

- 新增 2026-05-13 04:04 資深工程師審查報告，確認教程已具備專案開發主線，但依賴治理與供應鏈安全 gate 仍需明確化。
- README 新增依賴治理版本策略與驗證指令，將 `go mod tidy`、`go mod verify`、`go list -m -u all`、`govulncheck ./...` 納入主教材入口。
- 第 8 章補上依賴升級審核流程、`govulncheck` 使用方式、Go 1.24+ `tool` directive 管理開發工具，以及 private module 的供應鏈風險提醒。
- 第 9 / 11 章補上 release / CI gate，讓部署與測試不只跑單元測試，也檢查 module hash、可更新版本與已知漏洞。
- 康乃爾筆記、進階 Cheat Sheet 與 `production-api-worker` README 同步加入依賴安全速查與受限環境說明。

## v1.0.6 - 2026-05-13

- 新增 2026-05-13 03:03 資深工程師審查報告，確認教程專案開發深度已足夠，但 Go 1.26 升級與部署決策面仍需補強。
- README 新增 Go 1.26 升級檢查項，將 bootstrap toolchain、OS/ARCH、Docker base image、CI 與 CGO 依賴納入版本策略。
- 第 1 章補上 Go 1.26 平台生命週期與 bootstrap 重點：Go 1.26 需 Go 1.24.6+ bootstrap、Go 1.27 將要求 macOS 13+、windows/arm 已移除、freebsd/riscv64 標記 broken。
- 第 9 章補上 Go 1.26 build/release gate，將 `go.mod`、Docker builder image、GitHub Actions `setup-go`、交叉編譯目標與 CGO 動態連結檢查放入 release checklist。
- 康乃爾筆記第 1 / 9 章同步補上平台支援、Docker `golang:1.26-alpine` 與靜態連結限制，避免學習摘要保留舊版部署訊號。

## v1.0.5 - 2026-05-13

- 新增 2026-05-13 02:05 資深工程師審查報告，確認 Go 1.26.3 仍是目前官方最新穩定版本，但教材內有新版 API 範例需校正。
- 修正進階 Cheat Sheet 的 `errors.AsType` 範例，改為官方簽名 `func AsType[E error](err error) (E, bool)` 對應的 `value, ok` 寫法。
- 修正 README 與第 11 章的 Go 1.26 test artifact 指令，明確使用 `go test -artifacts -outputdir ./test-artifacts ./...`。
- 康乃爾筆記第 4 章補充 `errors.AsType` 回傳 `(E, bool)`，避免讀者誤以為可用單一回傳值判斷 nil。
- 本輪未變更 `go.mod` 的 `go 1.22` 相容層，也未新增外部依賴。

## v1.0.4 - 2026-05-13

- 新增 2026-05-13 01:03 資深工程師審查報告，確認主章節已現代化，但輔助教材仍有 Go 1.22/1.21-1.22 版本訊號不一致。
- 康乃爾筆記索引與各章版本基準同步到 Go 1.26.3。
- 康乃爾筆記補上 Go 1.26 `errors.AsType`、`new(expression)`、Green Tea GC 與 Go 1.25 `testing/synctest` / container-aware `GOMAXPROCS` 摘要。
- 進階 Cheat Sheet 將「現代 Go API」延伸到 Go 1.26，修正 `cmp.Ordered`、補上 `go fix` modernizers、`testing/synctest`、`T.ArtifactDir`、Green Tea GC 與 goroutine leak profile。
- 圖解筆記4與圖解筆記3-4整合頁更新 production 補強篇的版本定位，避免首頁仍顯示只涵蓋 Go 1.21/1.22。

## v1.0.3 - 2026-05-13

- 新增 2026-05-13 資深工程師審查報告，確認教材深度足夠但 Go 版本基準需現代化。
- README 升級教材版本資訊到 `v1.0.3`，以 Go 1.26.3 作為 2026-05 教材講解基準。
- 第 1 章補上 Go 1.26.3 基準與教材版本策略，區分教學基準與範例 module 相容層。
- 第 6 章更新 Go 1.25+ container-aware `GOMAXPROCS` 行為。
- 第 10 章新增 Go 1.26 Green Tea GC 說明。
- 第 11 章新增 `testing/synctest` 與 `T.ArtifactDir` 現代測試補充。
- 第 4 章與 A1 附錄補上 Go 1.26 `errors.AsType`、`new(expression)` 與泛型自我參照約束。

## v1.0.2 - 2026-05-12

- 新增資深工程師審查報告、內容更新清單與時間戳更新紀錄。
- README 補齊雙專案學習路線，將 `production-api-worker` 納入主教材入口。
- 第 7 章新增第二階段 production 專案導讀，讓大型專案教學不只停在 crawler。
- 第 11 章新增實務驗證指令矩陣與受限環境排錯說明。
- `.gitignore` 補上 `.gomodcache/`，避免本地 module cache 被誤提交。
