# 13. 2026 年 11 月 Go 安全修補

查核日期：2026-11-13。這是 **2026-11-10 官方安全公告的 12 項修補**，不是 Go 1.27 新語法，也不是本倉庫 CI 先前回報的 13 個第三方相依漏洞。

## 先採取什麼動作

- 建置環境與 CI builder 使用 **Go 1.27.4** 或仍受支援的 **Go 1.26.11**。本教材 1.27 語法例子須用前者。
- 使用受影響 `net/http` 的程式須以修補後工具鏈**重新編譯並部署**。只更新開發機的 Go，或只編輯 `go.mod`，不會修補已部署的執行檔。
- 11 項涉及工具鏈處理惡意套件／連結輸入，另 1 項是有特定觸發條件的 HTTP/1 拒絕服務。不要概括成「所有 Go 服務都能被遠端執行程式碼」。

來源：[官方公告](https://groups.google.com/g/golang-announce/c/iY8TY0wWgbM/m/KsU1KfWgAQAJ)、[Release History](https://go.dev/doc/devel/release)。以下每列連到 Go 安全團隊的官方漏洞資料，沒有填入未確認的 CVSS、在野利用狀態或本專案可利用性。

## 影響版本的精確界線

12 筆官方報告皆列出兩段範圍：**Go <1.26.11**，以及 **Go >=1.27.0-0 且 <1.27.4**（包含 1.27 預發行版本）。第一段未提供更早的 introduced 版本，不能推測漏洞始於 1.26.0。

若只列目前支援分支，受影響穩定版是 **1.26.0–1.26.10、1.27.0–1.27.3**；修補版為 **1.26.11、1.27.4**。舊分支不因未發布相應 patch 就變安全；Go 1.25 已停止一般維護支援。

`go.mod` 的 `go 1.22` 是語言／最低工具鏈要求，不是實際執行編譯器版本。必須檢查 `go version`、CI builder 與部署執行檔的 build info。

## 12 項公告對照

| 官方 ID / CVE | 條件與影響 | 修補與查核重點 |
|---|---|---|
| [GO-2026-6859](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6859.yaml) / CVE-2026-97054 | HTTP/1 handler 使用 `MaxBytesReader` 或 `MaxBytesHandler`，body 超過限制，且並行讀取 body／寫 response header 時，可因 header race 而 runtime panic，造成服務中斷。 | 升級工具鏈後重建部署；盤點此類並行 handler。不是所有 `net/http` 使用都必然可觸發。 |
| [GO-2026-6858](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6858.yaml) / CVE-2026-97033 | 建置惡意 cgo 套件，sysroot、target、語言等 compiler/linker flags 可導向不可信工具或輸入，造成建置時程式碼執行。 | 更新 builder；修補收緊允許的旗標與輸入檢查。 |
| [GO-2026-6857](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6857.yaml) / CVE-2026-97034 | 使用 GCC 連結惡意 cgo 套件時，搜尋目錄內的不可信 GCC spec files 可導致任意命令執行。 | 更新 builder；盤點第三方套件與連結搜尋路徑。 |
| [GO-2026-6856](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6856.yaml) / CVE-2026-97035 | Clang/GCC 的 `-gen-*`、`-gnat*` 旗標被錯誤接受，可能造成建置時執行或任意檔案寫入。 | 修補禁止這些旗標；不要以放寬驗證方式解決升級後的建置錯誤。 |
| [GO-2026-6855](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6855.yaml) / CVE-2026-97036 | Darwin 使用 Apple linker 建置惡意 cgo 套件，特製 LDFLAGS 可載入任意 LTO plugin，於連結時執行程式碼。 | macOS builder 也要升級，不只 Linux 部署環境。 |
| [GO-2026-6854](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6854.yaml) / CVE-2026-97037 | 惡意 cgo linker flags、分割的 `-Wl,` 參數等可讓主機 linker 接受不可信 linker script，造成連結時程式碼執行。 | 修補收緊參數配對及 script 檔案檢查。 |
| [GO-2026-6853](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6853.yaml) / CVE-2026-97038 | 惡意 `.syso` 或 cgo linker input（object/library）可夾帶 linker options、script 或 LTO 資料，影響多個平台。 | 修補檢查輸入格式；盤點預編譯 object 與 library 來源。 |
| [GO-2026-6852](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6852.yaml) / CVE-2026-97039 | 惡意 `#cgo pkg-config:` 參數可載入不可信 `.pc` 檔，或注入未驗證 compiler/linker flags。 | 修補限制路徑與旗標；檢查 pkg-config 輸入的信任邊界。 |
| [GO-2026-6851](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6851.yaml) / CVE-2026-97040 | 偽裝為 Go object 的 `.syso` 可注入 cgo metadata／linker flags；未識別格式還可能使 pure-Go build 轉用 external linking。 | 修補拒絕不合法 host object。**不能以 `CGO_ENABLED=0` 一概宣稱免疫。** |
| [GO-2026-6850](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6850.yaml) / CVE-2026-97041 | ELF 平台的 `//go:cgo_*` compiler directives 可注入 external linker flags；其中某種形式也允許出現在 non-cgo Go source。 | 升級 compiler/linker；不能只搜尋 `import "C"` 就完成風險盤點。 |
| [GO-2026-6849](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6849.yaml) / CVE-2026-97042 | `//go:cgo_import_dynamic` 或 Windows 特製 PE object／DLL 名稱可把不安全 library arguments 傳給 external linker。 | 修補完整名稱與路徑驗證；檢查 Windows 建置供應鏈。 |
| [GO-2026-6848](https://go.googlesource.com/vulndb/+/refs/heads/master/data/reports/GO-2026-6848.yaml) / CVE-2026-97043 | `cgo_ldflag` 的跳脫引號解析不一致，可繞過驗證，造成建置時程式碼執行或 go command panic。 | 修補統一字串解碼及邊界檢查；更新所有 build runner。 |

所有列的工具鏈修補版本同為 **1.26.11／1.27.4**。這些是觸發條件摘要，不是漏洞重現或利用程式。

## 部署前檢查清單

1. **盤點實際工具鏈**：本機、CI、Docker builder、外部編譯服務與交叉編譯 job 都要檢查。保存 compiler 版本、來源／checksum、image digest 與建置日期。
2. **先修補，再處理不可信程式碼**：對外部 PR／套件的建置使用隔離、最小權限環境，不提供長期憑證。`go mod verify` 只證明快取內容符合 checksum，不代表套件無惡意，也不修補 compiler。
3. **重建部署成品**：標準庫會進入 Go 執行檔；更新機器上的 Go 不會修改舊 binary。重建容器／程式後確認 rollout 與實際執行版本，保留修補過的 rollback 成品。
4. **分 module 驗證**：根 module、`examples/go127`、`production-api-worker` 是不同範圍。分別執行測試、race、vet、漏洞掃描，保存日期、工具版本與結果；掃描失敗不能改寫成「已安全」。
5. **HTTP 行為回歸**：驗證 body limit、錯誤回應、並行讀寫、timeout 與 server shutdown；避免 handler 自行不安全地共用 header map。

```sh
go version
go env GOVERSION GOTOOLCHAIN GOOS GOARCH CGO_ENABLED
go version -m /path/to/deployed-binary # 換成實際部署成品，不是本機 go 執行檔

# 以下在每個受管 module 分別執行，先使用已修補工具鏈與可信任來源：
go mod verify
go test -race ./...
go vet ./...
govulncheck ./... # 須先安裝官方工具，記錄其版本與資料庫查核日期
```

以上是操作清單，**不表示這次筆記更新已替使用者升級 builder、重建正式程式、修補第三方依賴或完成部署**。本輪沒有修改 production 的 go.mod、go.sum、Dockerfile 或執行程式。

## 與本倉庫先前 13 個相依漏洞分開看

2026-11-13 的 [CI 掃描紀錄](https://github.com/JasonChiu1984/golang-note/actions/runs/43363819869/job/131683369290)在 `production-api-worker` 回報 13 個可達漏洞，涉及既有 `golang.org/x/net`、`x/text`、OpenTelemetry、gRPC、pgx 等相依。這是當次掃描快照，與本章 Go 工具鏈／標準庫的 12 項公告是不同清單，不能以升級 Go 1.27.4 宣稱全部消除。

第三方 module 需要獨立升級評估、相容性測試與重新掃描；本次未擴大處理。另外，漏洞資料庫在 11 月更新，不等於漏洞首次在 11 月公布，應區分公告日、修補日、資料庫修改日與本地掃描日。

[回主教材](../README.md) · [語法變更](12-go-language-changes.md) · [Go 1.27 報告](../ReleaseNote/go1.27-release-note.html)
