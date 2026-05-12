# Changelog

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
