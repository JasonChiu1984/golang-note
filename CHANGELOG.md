# Changelog

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
