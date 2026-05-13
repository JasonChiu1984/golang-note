# Changelog

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
