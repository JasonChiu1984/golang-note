import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "ReleaseNote");
const GENERATED_AT = "2026-05-13 14:35:00 +0800";
const OFFICIAL_HISTORY = "https://go.dev/doc/devel/release";

const phases = [
  { name: "早期基礎期", range: [1, 5], summary: "Go 1 相容承諾後，語言、runtime、工具鏈與標準庫基礎能力逐步成熟。" },
  { name: "工具鏈成熟期", range: [6, 10], summary: "HTTP/2、context、SSA、build/test cache 與標準庫可維運性提升。" },
  { name: "Module/泛型期", range: [11, 18], summary: "module、errors wrapping、embed、workspaces、generics 與 fuzzing 成為主軸。" },
  { name: "Modern Toolchain and Standard Library Governance Era", range: [19, 26], summary: "runtime governance、PGO、toolchain management、standard-library modernization、testing 與 supply-chain governance 成為主軸。" },
];

const roadmapStages = [
  {
    phase: "早期基礎期",
    versions: [1, 2, 3, 4, 5],
    years: "2013 - 2015",
    title: "語言與 Runtime 基礎",
    summary: "以 Go 1 compatibility、Go 1.1 performance、race detector、slice capacity control、internal package、go generate 與 concurrent GC 建立大型專案基礎。",
    points: ["Go 1 相容承諾", "`-race` / Go 1.1 performance", "slice capacity control", "`internal` / `go generate`"],
  },
  {
    phase: "工具鏈成熟期",
    versions: [6, 7, 8, 9, 10],
    years: "2016 - 2018",
    title: "工具鏈與服務端維運成熟",
    summary: "vendor default、HTTP/2、context、SSA、subtests、build/test cache 讓服務端工程流程更可控。",
    points: ["HTTP/2 與 graceful shutdown", "`context` / subtests", "SSA compiler", "build cache / test cache"],
  },
  {
    phase: "Module/泛型期",
    versions: [11, 12, 13, 14, 15, 16, 17, 18],
    years: "2018 - 2022",
    title: "Module、供應鏈與泛型能力",
    summary: "Go modules、GOPROXY、errors wrapping、embed、workspace、generics、fuzzing 與 net/netip 成為現代專案升級主軸。",
    points: ["Go modules / GOPROXY", "errors wrapping", "`embed` / `io/fs`", "generics / fuzzing"],
  },
  {
    phase: "Modern Toolchain and Standard Library Governance Era",
    versions: [19, 20, 21, 22, 23, 24, 25, 26],
    years: "2022 - 2026",
    title: "現代工具鏈、Runtime 與標準庫治理",
    summary: "GOMEMLIMIT、PGO、toolchain management、standard-library modernization、testing/synctest、modernizers 與 Green Tea GC 形成升級治理路線。",
    points: ["runtime governance / PGO", "toolchain management", "stdlib modernization", "testing / GC / modernizers"],
  },
];

const supportStatus = {
  asOf: "2026-07-12",
  verifiedAt: "2026-07-12 06:03:15 CST +0800",
  latestPatch: "Go 1.26.5",
  latestPatchTokens: ["go1.26.5", "go1.25.12"],
  sourceEvidence: "official Go Release History verified; Go ReleaseNote freshness evidence keeps the Go 1.26.5 / Go 1.25.12 baseline current without inventing a new patch release.",
  supported: [25, 26],
  unsupportedRange: [1, 24],
  rule: "官方 Release Policy：每個 major release 支援到已有兩個更新 major release 為止。",
};

const releaseData = {
  1: {
    phase: "早期基礎期",
    positioning: "Go 1.1 是 Go 1 相容承諾後第一個大型版本，核心定位是效能、工具鏈可用性、race detector 與標準庫能力補強。",
    value: "適合用來理解 Go 1 compatibility 如何在不破壞大多數程式的前提下，推進語言細節、runtime、go command 與標準庫演進。",
    risk: "舊程式需注意 `int` / `uint` 在 64-bit 平台變為 64 bits、Unicode surrogate literals、`net` untagged composite literals、`ListenUnixgram` return type 與 `html/template` noescape 移除。",
    focus: "Go 1.1 performance 30%-40%、method values、terminating statement、`-race`、`go1.1` build tag、`bufio.Scanner`、`net` / `time` / `reflect` 大量標準庫更新。",
    performance: [
      ["gc tool suite", "Go 1.0 toolchain baseline。", "Go 1.1 gc tool suite 產生更好的 code，包含更多 inlining 與 runtime operation 最佳化。", "典型約 30%-40% 改善，部分程式更多、少數較少或沒有改善。", "一般 Go 程式重新編譯即可受益，但仍需以實際 workload benchmark 驗證。", "`go test -bench=. -benchmem ./...` 比對 Go 1.0 / Go 1.1。"],
      ["runtime / maps / GC", "Go 1.0 map / GC 成本較高。", "新 map implementation 降低 memory footprint 與 CPU time；GC 更 parallel 且更 precise。", "官方未列單一百分比；明確說明 memory footprint、CPU time 與 latency 方向改善。", "大量 map、GC pressure、32-bit heap footprint 場景需補壓測。", "觀察 alloc/op、heap size、latency 與 GC pause。"],
      ["network operations", "Go 1.0 runtime / network library coupling 較鬆，network operations context switches 較多。", "runtime 與 network libraries 更緊密。", "官方明列 fewer context switches。", "I/O 服務升級時應跑 socket smoke test 與延遲比對。", "以 loopback / staging traffic 驗證 timeout 與 throughput。"],
    ],
    added: [
      ["Language", "method values", "`w.Write` 形式可取得綁定 receiver 的 function value，與 method expressions 分工更清楚。", "教學中用 interface callback、handler adapter 舉例。", "補 method value / method expression 單元測試。"],
      ["Language", "terminating statement / return rule", "無條件 `for`、完整 return 的 if-else 等可讓函式不必再寫多餘 final return。", "清理舊程式中多餘 `panic` / `return`，但保持可讀性。", "`go vet` 檢查可簡化位置。"],
      ["Tools", "race detector / `-race`", "Go tool 內建資料競爭檢測，Go 1.1 時支援 64-bit x86 的 Linux、Mac OS X、Windows。", "並行教材與 CI 可加入 race profile，但需標註平台限制。", "`go test -race ./...`"],
      ["Tools", "`go1.1` build constraint", "新增預設 build tag，可用 `// +build go1.1` 區分 Go 1.1+ 程式碼。", "歷史教材說明 build tags 在版本過渡中的用途。", "以條件編譯 sample 驗證。"],
      ["Standard Library", "`bufio.Scanner`", "簡化 line / word scanning，適合一般文字輸入處理。", "教學時也說明 pathological long lines 仍需舊 interface。", "補 scanner.Err 測試。"],
      ["Standard Library", "`go/format`、`net/http/cookiejar`、`runtime/race`", "新增三個 package，分別支援 gofmt 能力、HTTP cookie jar 與 race detector internals。", "文件中標示 `runtime/race` 不作一般使用者 API。", "檢查 import 與使用範例。"],
      ["Standard Library", "`reflect.Select`、`Value.Convert`、`MakeFunc`、`ChanOf` / `MapOf` / `SliceOf`", "reflect 動態能力大幅擴充。", "只在框架、序列化、測試工具中採用，避免過度動態化。", "補 panic / conversion boundary tests。"],
      ["Standard Library", "`time.Round`、`Truncate`、`YearDay`、`Timer.Reset`、`ParseInLocation`", "time API 補齊精度處理、日期資訊、timer reset 與 location parsing。", "外部儲存仍需明確處理 microsecond / nanosecond precision。", "補 round-trip time serialization tests。"],
    ],
    compat: [
      ["Language", "integer division by constant zero", "compile-time error", "Go 1.0 的 runtime panic 改為非法程式，少數測試錯誤案例會停止編譯。", "修正測試或改成 runtime zero variable。"],
      ["Language / Unicode", "surrogate halves in rune / string literals", "安全收斂", "surrogate half 常數會被 compiler 拒絕；UTF-8 decode 會產生 `utf8.RuneError`。", "掃描 `\\ud800` 類 literal。"],
      ["Implementation", "`int` / `uint` on 64-bit platforms", "行為差異", "64-bit 平台上 `int` / `uint` 變 64 bits，假設 32-bit sign extension 的程式可能改變行為。", "用 `int32` / `uint32` 明確化轉型。"],
      ["Assembler", "gc assembler stack argument layout", "需修改", "手寫 assembly 需調整 frame pointer offsets。", "`go vet` 檢查 assembly 與 Go prototype 是否一致。"],
      ["Go command", "`go get` requires valid `GOPATH`", "流程收緊", "`GOPATH` 未設或等於 `GOROOT` 時 `go get` 失敗。", "CI 明確設定 GOPATH，歷史教材標明 module 尚未出現。"],
      ["Go fix", "pre-Go 1 fixes removed", "工具行為變更", "`go fix` 不再把 pre-Go 1 code 直接升到 Go 1 API。", "先用 Go 1.0 toolchain 轉到 Go 1.0，再升 Go 1.1。"],
      ["Standard Library / net", "`IPAddr` / `TCPAddr` / `UDPAddr` Zone field", "source compatibility risk", "untagged composite literals 會因新增 `Zone` field 破壞。", "改用 tagged literals；用 `go fix` / `go vet` 輔助。"],
      ["Standard Library / net", "`ListenUnixgram` returns `UnixConn`", "API 修正", "Go 1.0 回傳 `UDPConn` 的錯誤被修正。", "調整型別假設與測試。"],
      ["Standard Library / html/template", "undocumented `noescape` removed", "移除", "依賴未文件化 noescape 的程式會破壞。", "改用正式 escaping 行為並補安全測試。"],
    ],
    commands: [
      ["go test", "`-race`", "新增", "資料競爭檢測進入 Go tool 工作流。", "`go test -race ./...`"],
      ["go test", "`-blockprofile`", "新增", "可輸出 goroutine blocked profile，分析 channel / sync 等等待點。", "`go test -blockprofile block.out ./...`"],
      ["go test", "profiling leaves test binary", "行為變更", "使用 profiling 時自動保留測試 binary，方便後續分析。", "`go test -cpuprofile cpuprof.out mypackage`"],
      ["go get", "valid `GOPATH` required", "流程收緊", "不再把 `$GOROOT` 當下載目的地，`GOPATH=$GOROOT` 也會失敗。", "升級前檢查 shell / CI env。"],
      ["go fix", "pre-Go 1 fixes removed", "移除舊流程", "不再直接處理 pre-Go 1 到 Go 1 API 的轉換。", "先用 Go 1.0 toolchain。"],
      ["build constraints", "`go1.1` tag", "新增", "可用 `// +build go1.1` 管理 Go 1.1+ 檔案。", "用條件編譯測試不同 toolchain。"],
      ["cross compile", "`CGO_ENABLED=1`", "預設變更", "cross-compiling 時 `go` tool 預設停用 cgo；需明確啟用。", "跨平台 build matrix 記錄 CGO_ENABLED。"],
    ],
  },
  2: {
    phase: "早期基礎期",
    positioning: "Go 1.2 是 Go 1 穩定期早期的重要版本，重點在語言小幅擴充、runtime 穩定、測試與標準庫修正。",
    value: "適合用來理解 Go 1 相容承諾下，語言如何以小步、安全方式演進。",
    risk: "舊專案多半受 runtime、net、database/sql patch 修正影響，現代專案主要作歷史脈絡參考。",
    focus: "以 Go 1 compatibility、slice capacity control、早期 runtime/network patch revisions 作為教材重點。",
    added: [
      ["Language", "three-index slice expression", "可用 `a[low:high:max]` 控制結果 slice capacity，降低 accidental append 污染底層 array 的風險。", "教學時用 buffer/window 範例說明 aliasing 風險。", "測試 append 後原 slice 是否被修改。"],
      ["Runtime", "scheduler / stack / GC 持續改善", "官方 release note 對 runtime 穩定性與效能修正有多項描述。", "舊服務升級時重跑 long-running workload。", "用壓測與 race test 檢查 goroutine 行為。"],
      ["Standard Library", "`database/sql`、`net`、`runtime` patch 修正", "Go 1.2.x patch revisions 特別提到 runtime、net、database/sql。", "資料庫與網路程式應檢查 patch revision。", "跑連線池、timeout、driver smoke test。"],
    ],
    compat: [
      ["Compatibility", "維持 Go 1 相容承諾", "相容性承諾", "一般程式不應因 major upgrade 破壞。", "保留 regression tests。"],
      ["Runtime", "早期 runtime bug fixes", "修正", "長時間服務仍需驗證 goroutine、stack、GC 行為。", "以 soak test 補證據。"],
    ],
    commands: [
      ["go test", "早期測試工作流", "延續", "以 `go test ./...` 作為升級基本門檻。", "在現代 CI 中保留所有 package 測試。"],
      ["go command", "Go 1 compatibility era", "延續", "不引入 module/toolchain 管理；舊版專案仍偏 GOPATH。", "歷史教材需標明 module 尚未出現。"],
    ],
  },
  3: {
    phase: "早期基礎期",
    positioning: "Go 1.3 聚焦 runtime、stack 管理、GC 與標準庫效能，並引入對並行資源管理有長期影響的 API。",
    value: "可作為 Go runtime 演進與標準庫同步原語教材的早期案例。",
    risk: "主要風險在 cgo、runtime 與 crypto/tls patch 修正，舊部署需確認安全 patch。",
    focus: "用 `sync.Pool`、runtime stack/GC、cgo patch revisions 建立歷史脈絡。",
    added: [
      ["Standard Library / sync", "`sync.Pool`", "提供可由 GC 管理的臨時物件池，常用於 buffer reuse。", "只用於可丟棄 cache，不保存業務狀態。", "用 benchmark 驗證 alloc/op。"],
      ["Runtime", "stack / GC 改善", "runtime 對 goroutine stack 與 GC 進一步優化。", "高 goroutine 數服務可作歷史效能比較。", "壓測 goroutine fan-out。"],
      ["Security", "crypto/tls patch revisions", "Go 1.3.2 官方列出 crypto/tls security fixes。", "舊 TLS client/server 必須採最終 patch。", "檢查 binary 版本與 TLS smoke test。"],
    ],
    compat: [
      ["Cgo", "cgo bug fixes", "修正", "Go 1.3.2 / 1.3.3 官方均提及 cgo 修正。", "cgo 專案需重編並測試。"],
      ["Runtime", "nacl port / runtime 修正", "平台修正", "舊平台 port 可能受 patch 影響。", "只作歷史支援矩陣標記。"],
    ],
    commands: [
      ["go test", "benchmark + allocation comparison", "建議流程", "`sync.Pool` 類優化需用 benchmark 證明。", "`go test -bench=. -benchmem ./...`"],
    ],
  },
  4: {
    phase: "早期基礎期",
    positioning: "Go 1.4 是工具與套件邊界的重要版本，開始強化大型專案的可維護結構。",
    value: "適合放入專案結構教材，說明 `internal` package 與 `go generate` 的定位。",
    risk: "舊專案若依賴非公開套件路徑，需檢查 import boundary。",
    focus: "`internal` package、`go generate`、runtime/compiler/security patch。",
    added: [
      ["Project Structure", "`internal` package", "限制 internal 目錄外部 import，建立 repo 內私有邊界。", "用於 production 專案分層：cmd/internal/pkg。", "測試外部 package 無法 import internal。"],
      ["Go command", "`go generate`", "提供原始碼產生前置命令，常用於 mock、stringer、asset generation。", "把產生流程放在明確 directive，不混入 build。", "`go generate ./...` 加入文件化流程。"],
      ["Runtime / Compiler", "compiler、linker、runtime patch 修正", "Go 1.4.x patch revisions 多次提及 compiler/linker/runtime。", "升級時保留完整 build/test。", "`go test ./...` 與 smoke run。"],
    ],
    compat: [
      ["Package Boundary", "`internal` import 限制", "行為約束", "不正確跨邊界 import 會失敗。", "重構公開 API 或移動套件。"],
      ["Security", "net/http security fixes", "安全修正", "Go 1.4.3 官方提到 net/http security fixes。", "舊 HTTP service 必須採 patch。"],
    ],
    commands: [
      ["go generate", "新增產生流程", "新增", "用 command directive 固定 codegen。", "`go generate ./...`"],
      ["go test", "internal package boundary 驗證", "建議", "用測試確認公開 API 邊界。", "`go test ./...`"],
    ],
  },
  5: {
    phase: "早期基礎期",
    positioning: "Go 1.5 是 runtime 與工具鏈架構轉折點，包含 concurrent GC 與 Go 自舉工具鏈。",
    value: "適合說明 Go 從 C toolchain 轉向 Go-written toolchain，以及 GC latency 治理的起點。",
    risk: "GC 行為、vendor experiment、toolchain bootstrap 對大型專案升級有實務影響。",
    focus: "concurrent GC、toolchain in Go、vendor experiment、GO15VENDOREXPERIMENT。",
    added: [
      ["Runtime", "concurrent garbage collector", "GC 從停頓導向轉向低延遲治理，是後續 Go service latency 的基礎。", "用 latency / p99 觀察升級價值。", "比較 GC pause 與 throughput。"],
      ["Toolchain", "compiler/runtime toolchain written in Go", "工具鏈自舉模型改變，後續 bootstrap version 成為 release 管理重點。", "自建工具鏈需記錄 bootstrap Go。", "驗證 source build 流程。"],
      ["Dependency Layout", "vendor experiment", "早期 vendor 目錄實驗，為後續 dependency governance 奠基。", "歷史教材需標示 module 尚未出現。", "用 vendor/import path 範例說明。"],
    ],
    compat: [
      ["Runtime", "GC latency / throughput tradeoff", "行為異動", "低延遲 GC 可能改變效能 profile。", "用 production-like workload 量測。"],
      ["Toolchain", "bootstrap model changed", "建置要求", "source build 流程需更新。", "記錄 bootstrap toolchain。"],
    ],
    commands: [
      ["go build", "vendor experiment", "實驗", "以 `GO15VENDOREXPERIMENT` 啟用早期 vendor。", "只在歷史教材中保留。"],
      ["go test", "GC upgrade validation", "建議", "長時間服務要重跑壓測。", "`GODEBUG=gctrace=1` 觀察。"],
    ],
  },
  6: {
    phase: "工具鏈成熟期",
    positioning: "Go 1.6 把 vendor support 預設化，並使 HTTP/2 成為標準庫網路能力的一部分。",
    value: "適合說明依賴隔離、HTTP/2 server/client 與 cgo pointer rules。",
    risk: "cgo pointer rules 會揭露不安全記憶體傳遞；HTTP service 需重測 protocol 行為。",
    focus: "vendor default、HTTP/2、cgo pointer rules、template block。",
    added: [
      ["Dependency", "vendor support default", "vendor 目錄支援預設啟用，改善 GOPATH 時代依賴隔離。", "舊專案可用於重現依賴。", "檢查 vendor tree 與 import resolution。"],
      ["Networking", "HTTP/2 support", "標準庫加入 HTTP/2 支援，提升現代 HTTP service 能力。", "TLS service 需測 HTTP/1.1 與 HTTP/2。", "用 integration test 驗證 protocol。"],
      ["Template", "template block", "模板可定義可覆寫區塊，改善複雜頁面組合。", "Web app 可降低 template duplication。", "測試 default block 與 override。"],
    ],
    compat: [
      ["Cgo", "cgo pointer rules", "安全限制", "不安全 Go pointer 傳入 C 可能被檢查出來。", "清理 cgo boundary。"],
      ["Security", "net/http CGI security fixes", "安全修正", "Go 1.6.3 針對 CGI/HTTP security。", "採最終 patch。"],
    ],
    commands: [
      ["go build", "vendor resolution", "預設行為", "GOPATH 專案建置會考慮 vendor。", "檢查 build reproducibility。"],
      ["go test", "cgo pointer rule tests", "建議", "cgo 專案需測記憶體傳遞。", "`GODEBUG=cgocheck=1`"],
    ],
  },
  7: {
    phase: "工具鏈成熟期",
    positioning: "Go 1.7 是 service lifecycle 的關鍵版本，`context` 進入標準庫，compiler backend 也切換到 SSA。",
    value: "適合放入 API timeout、cancel propagation、compiler optimization 的專案教材。",
    risk: "Go 1.7.2 官方標示不應使用，版本治理必須避開問題 release。",
    focus: "`context`、SSA compiler、subtests、Go 1.7.2 避用。",
    added: [
      ["Standard Library / context", "`context` package", "把 request-scoped cancellation、deadline、values 標準化。", "HTTP、DB、worker 都應傳遞 context。", "測試 timeout/cancel path。"],
      ["Compiler", "SSA backend", "compiler 使用 SSA backend，改善最佳化能力。", "效能敏感專案需重跑 benchmark。", "`go test -bench=. ./...`"],
      ["Testing", "subtests / sub-benchmarks", "測試可用 `t.Run` / `b.Run` 組織情境。", "適合 table-driven tests。", "確認 subtest 命名與 parallel 邏輯。"],
    ],
    compat: [
      ["Release Governance", "go1.7.2 should not be used", "版本風險", "官方標記該版本不應使用。", "版本矩陣直接跳到 Go 1.7.3+。"],
      ["Runtime", "runtime / crypto / net/http patches", "修正", "多個 patch revision 涉及 runtime 與安全。", "採最後 patch 並記錄。"],
    ],
    commands: [
      ["go test", "subtest filtering", "新增測試工作流", "可針對 subtest 名稱執行。", "`go test -run TestName/Subcase`"],
      ["go test", "parallel table tests", "建議", "搭配 `t.Run` 管理案例。", "注意 loop variable capture。"],
    ],
  },
  8: {
    phase: "工具鏈成熟期",
    positioning: "Go 1.8 強化 HTTP service、database/sql 與 runtime，讓標準庫更適合後端服務。",
    value: "適合建立 graceful shutdown、sort helper、database context flow 教材。",
    risk: "plugin 與 database/sql 變更需注意平台與 driver 相容。",
    focus: "`http.Server.Shutdown`、`sort.Slice`、`plugin`、database/sql context。",
    added: [
      ["HTTP", "`http.Server.Shutdown`", "標準化 graceful shutdown，可配合 context 控制 drain deadline。", "production API 必須納入 lifecycle。", "測試 SIGTERM 與 in-flight request。"],
      ["Standard Library / sort", "`sort.Slice`", "以 closure 排序 slice，減少自訂 type boilerplate。", "適合教材中替代 Len/Less/Swap 寫法。", "測排序穩定性需求。"],
      ["Standard Library / plugin", "`plugin` package", "支援動態載入 Go plugin，平台限制明顯。", "只適合明確部署環境。", "測 ABI / OS support。"],
      ["database/sql", "context-aware database APIs", "DB operation 可接 context 控制 timeout/cancel。", "所有 DB call 應用 context 版本。", "測 query timeout。"],
    ],
    compat: [
      ["Platform", "plugin platform constraints", "限制", "plugin 不適合跨平台通用交付。", "文件化支援 OS/arch。"],
      ["Security", "crypto/tls / go get security patch", "安全修正", "Go 1.8.x 多個 patch 與安全同步。", "採最終 patch。"],
    ],
    commands: [
      ["go test", "shutdown integration tests", "建議", "HTTP service 應測 graceful shutdown。", "`httptest` + context timeout"],
      ["go test", "DB timeout tests", "建議", "driver 需支援 context。", "fake driver / integration DB。"],
    ],
  },
  9: {
    phase: "工具鏈成熟期",
    positioning: "Go 1.9 引入 type alias、`sync.Map` 與 monotonic time，是大型重構與時間處理的重要版本。",
    value: "適合說明相容重構、並行 map、時間測量與低階 bit operation。",
    risk: "time serialization/比較需理解 monotonic component；type alias 不應濫用。",
    focus: "type alias、`sync.Map`、`math/bits`、monotonic time。",
    added: [
      ["Language", "type aliases", "允許 `type T = OldT`，支援大型 API 遷移與相容重構。", "只用於跨 package 重構，不作一般命名捷徑。", "測 public API 相容。"],
      ["Standard Library / sync", "`sync.Map`", "提供 concurrent map 特定 workload 的 lock-free style API。", "適合 read-mostly cache / registry。", "race test 與 benchmark。"],
      ["Standard Library / time", "monotonic time", "time value 可包含 monotonic clock，用於 duration measurement 更安全。", "區分 wall time 與 elapsed time。", "測 serialization 後 monotonic component 行為。"],
      ["Standard Library / math/bits", "`math/bits`", "提供 bit counting / rotation / arithmetic primitives。", "適合 codec、hash、protocol parser。", "benchmark hot path。"],
    ],
    compat: [
      ["API Design", "type alias migration risk", "相容性工具", "alias 可能掩蓋邊界設計問題。", "只在遷移期使用。"],
      ["Time", "monotonic component", "行為差異", "格式化/序列化不保留 monotonic。", "明確測 elapsed vs timestamp。"],
    ],
    commands: [
      ["go test", "API alias compatibility", "建議", "重構時測舊 import path。", "`go test ./...`"],
      ["go test -race", "`sync.Map` concurrency", "建議", "並行 map 仍需工作負載驗證。", "`go test -race ./...`"],
    ],
  },
  10: {
    phase: "工具鏈成熟期",
    positioning: "Go 1.10 將 build/test cache 正式化，顯著改善大型專案日常開發效率。",
    value: "適合建立 CI cache、測試可重現性與字串建構最佳實務。",
    risk: "不穩定測試若依賴外部狀態，test cache 會暴露問題。",
    focus: "build cache、test cache、`strings.Builder`、vet/test workflow。",
    added: [
      ["Go command", "build cache", "go command 會快取 build results，加快重複 build。", "CI 應管理 `GOCACHE`。", "檢查 cache hit 與 clean build。"],
      ["Go command", "test cache", "package tests 可被快取，提升本機與 CI 速度。", "測試不可依賴未宣告外部狀態。", "必要時用 `-count=1`。"],
      ["Standard Library / strings", "`strings.Builder`", "提供高效字串累積 API。", "替代 bytes.Buffer + string conversion。", "benchmark allocation。"],
    ],
    compat: [
      ["Testing", "test cache can mask external dependency", "工作流異動", "測試若讀環境或外部檔案不明確，可能快取錯誤結果。", "使用 temp dir 與明確 inputs。"],
      ["CI", "cache invalidation", "流程風險", "CI cache 污染會造成誤判。", "保留 clean test job。"],
    ],
    commands: [
      ["go test", "test cache", "新增/強化", "重跑仍可能使用快取。", "`go test ./...`"],
      ["go test", "force rerun", "驗證", "release gate 建議強制重跑。", "`go test -count=1 ./...`"],
      ["go clean", "cache cleanup", "維護", "可清理 build/test cache。", "`go clean -cache -testcache`"],
    ],
  },
  11: {
    phase: "Module/泛型期",
    positioning: "Go 1.11 開始 module 時代，並支援 WebAssembly，是 Go 依賴治理的分水嶺。",
    value: "適合說明 `go.mod`、module cache、語義化版本與跨平台編譯。",
    risk: "module 在此版仍屬早期，舊 GOPATH 專案遷移需保守。",
    focus: "Go modules、WebAssembly、GOPATH 到 module migration。",
    added: [
      ["Modules", "`go.mod` experimental support", "引入 module-aware mode，開始脫離 GOPATH dependency model。", "新專案可建 module，舊專案先做遷移評估。", "`go mod init` / `go test ./...`。"],
      ["Platform", "WebAssembly port", "新增 `GOOS=js GOARCH=wasm`。", "適合 browser / JS interop 教材。", "wasm smoke run。"],
      ["Tooling", "module cache / versioned dependency", "開始以版本化 module 管理依賴。", "建立 dependency review。", "檢查 `go.sum`。"],
    ],
    compat: [
      ["Dependency", "early module behavior", "實驗期", "Go 1.11 module 行為與後續版本不同。", "歷史教材標明早期狀態。"],
      ["GOPATH", "mixed GOPATH/module workflow", "遷移風險", "舊工具可能尚未支援 module。", "分支化遷移。"],
    ],
    commands: [
      ["go mod init", "建立 module", "新增", "建立 `go.mod`。", "`go mod init example.com/app`"],
      ["GOOS=js GOARCH=wasm go build", "WASM build", "新增 target", "建置 WebAssembly。", "`GOOS=js GOARCH=wasm go build`"],
    ],
  },
  12: {
    phase: "Module/泛型期",
    positioning: "Go 1.12 延續 module adoption，改善 runtime、TLS 與工具行為。",
    value: "適合把 module 早期遷移、TLS 1.3 試用與 `go env -w` 放入教材。",
    risk: "TLS、module mode 與平台支援變更需納入升級測試。",
    focus: "module on by default outside GOPATH、TLS 1.3 opt-in、`go env -w`。",
    added: [
      ["Modules", "module mode improvement", "在 GOPATH 外更自然使用 modules。", "新專案不再依賴 GOPATH layout。", "檢查 `go env GOMOD`。"],
      ["Go command", "`go env -w`", "可持久寫入 Go environment setting。", "用於明確 CI / developer setup。", "列出 `go env` 變更。"],
      ["Security", "TLS 1.3 opt-in", "TLS 1.3 可透過 GODEBUG 試用。", "網路服務需測握手相容。", "TLS integration test。"],
    ],
    compat: [
      ["Security", "TLS 1.3 trial", "相容性風險", "部分舊 proxy / client 可能不相容。", "灰度開啟與回退。"],
      ["Environment", "`go env -w` persistent state", "配置風險", "本機持久設定可能污染測試。", "CI 明確覆寫。"],
    ],
    commands: [
      ["go env -w", "持久設定", "新增", "寫入 Go env。", "`go env -w GOPROXY=https://proxy.golang.org,direct`"],
      ["go env -u", "移除設定", "配套", "清除持久設定。", "`go env -u GOPROXY`"],
    ],
  },
  13: {
    phase: "Module/泛型期",
    positioning: "Go 1.13 是錯誤處理與 module 實務的重要版本，加入 error wrapping 與 numeric literal 改善。",
    value: "適合建立 domain error、API error contract、module proxy/checksum governance。",
    risk: "錯誤字串解析應改為 `errors.Is` / `errors.As`，module proxy policy 需明確。",
    focus: "errors wrapping、GOPROXY/GOSUMDB、numeric literals、TLS 1.3 default。",
    added: [
      ["Language", "numeric literal improvements", "支援 binary literal、digit separators、imaginary literal 改善。", "提升 bitmask / protocol constants 可讀性。", "語法範例測試。"],
      ["Errors", "`errors.Is` / `errors.As` / `%w`", "標準化錯誤包裝與查詢。", "API 不解析錯誤字串，使用 stable error code。", "錯誤鏈測試。"],
      ["Modules", "`GOPROXY` / checksum database", "module download 與驗證基礎設施成熟。", "企業需設定 private module policy。", "測 proxy / direct fallback。"],
      ["Security", "TLS 1.3 default", "TLS 1.3 成為預設支援。", "網路服務需測 handshake。", "TLS smoke test。"],
    ],
    compat: [
      ["Errors", "wrapped errors alter text", "API 風險", "client 不應依賴自然語言錯誤。", "使用 `errors.Is` 與 error code。"],
      ["Modules", "public checksum DB", "供應鏈風險", "private modules 需 `GONOSUMDB` / `GOPRIVATE`。", "建立私有 module 設定。"],
    ],
    commands: [
      ["go env -w GOPRIVATE", "private module policy", "建議", "設定私有 module 前綴。", "`go env -w GOPRIVATE=example.com/private/*`"],
      ["go test", "error wrapping tests", "建議", "驗證 `errors.Is` / `As`。", "`go test ./...`"],
    ],
  },
  14: {
    phase: "Module/泛型期",
    positioning: "Go 1.14 強化 runtime preemption、module production readiness 與 defer 效能，是現代 service 的重要基線。",
    value: "適合建立 cancellation、tail latency、module workflow 與 interface embedding 教材。",
    risk: "async preemption 可能揭露 unsafe/cgo assumptions；module workflow 需正式化。",
    focus: "module ready for production、async preemption、defer performance、interface embedding。",
    added: [
      ["Modules", "modules ready for production use", "module workflow 成熟到可作 production 依賴治理基線。", "新專案全面使用 module。", "檢查 `go.mod` / `go.sum`。"],
      ["Runtime", "asynchronous preemption", "runtime 可更積極 preempt goroutine，改善 scheduling latency。", "CPU-bound loop 更不易餓死其他 goroutine。", "壓測 tail latency。"],
      ["Runtime", "defer performance improvement", "`defer` 成本下降，可更放心用於資源釋放。", "保留清晰 cleanup，不過度手寫。", "benchmark hot path。"],
      ["Language", "overlapping embedded interfaces", "interface embedding 更彈性。", "大型 API interface 可更精簡。", "compile tests。"],
    ],
    compat: [
      ["Runtime", "async preemption and unsafe/cgo", "行為風險", "不安全假設可能被揭露。", "race/asan/cgo 測試。"],
      ["Modules", "vendor/module workflow", "流程變更", "依賴治理需決定 vendor 或 module cache。", "CI 文件化。"],
    ],
    commands: [
      ["go mod vendor", "vendor workflow", "正式化", "production 可選擇 vendor 交付。", "`go mod vendor`"],
      ["go test", "module-aware tests", "建議", "以 module root 執行全量測試。", "`go test ./...`"],
    ],
  },
  15: {
    phase: "Module/泛型期",
    positioning: "Go 1.15 聚焦 linker、runtime、testing 與標準庫細節，讓產物更小、測試更容易管理。",
    value: "適合導入 `testing.T.TempDir`、`time/tzdata` 與 linker artifact governance。",
    risk: "linker 改善可能影響 binary tooling；timezone data 交付方式需明確。",
    focus: "linker improvements、`testing.T.TempDir`、`time/tzdata`、module refinements。",
    added: [
      ["Testing", "`T.TempDir`", "測試可取得自動清理的 temporary directory。", "替代手動 temp cleanup。", "測 file-based code。"],
      ["Time", "`time/tzdata`", "可把 timezone database 打進 binary。", "適合 container / minimal image。", "測 timezone parsing。"],
      ["Linker", "linker resource improvements", "linker memory/time 與 binary size 有改善。", "大型 binary pipeline 可觀察。", "比較 build time / binary size。"],
    ],
    compat: [
      ["Binary Tooling", "linker output changes", "工具風險", "自製 binary parser 需重測。", "artifact scanner smoke test。"],
      ["Deployment", "timezone data source", "部署風險", "minimal image 可能缺 tzdata。", "決定 OS tzdata 或 embedded tzdata。"],
    ],
    commands: [
      ["go test", "`T.TempDir` tests", "建議", "移除手動 temp cleanup。", "`go test ./...`"],
      ["go build", "tzdata embed", "可選", "匯入 `time/tzdata` 或使用 build tag。", "`import _ \"time/tzdata\"`"],
    ],
  },
  16: {
    phase: "Module/泛型期",
    positioning: "Go 1.16 是 module default、embed 與 filesystem abstraction 的關鍵版本。",
    value: "適合建立單一 binary 靜態資源、`io/fs`、`go install pkg@version` 與 module-first workflow。",
    risk: "GOPATH workflow 退場壓力增加，工具安裝方式需改寫。",
    focus: "`embed`、`io/fs`、modules default、`go install pkg@version`。",
    added: [
      ["Language/Tooling", "`//go:embed`", "可把檔案嵌入 binary。", "適合靜態資源、migration、template。", "測 embedded file existence。"],
      ["Standard Library", "`io/fs`", "抽象 read-only filesystem interface。", "讓 embed、os dir、testing fs 共用 API。", "用 fstest 驗證。"],
      ["Modules", "module mode default", "module-aware mode 成為預設。", "新舊專案都應明確 module。", "檢查 `go env GO111MODULE`。"],
      ["Go command", "`go install pkg@version`", "工具安裝可 pin version。", "CI tool install 不污染 main module。", "鎖定工具版本。"],
    ],
    compat: [
      ["GOPATH", "module default", "流程變更", "舊 GOPATH 假設會逐步失效。", "轉 module。"],
      ["Tool Install", "`go get` no longer preferred for binaries", "行為遷移", "工具安裝需改 `go install @version`。", "更新 README/CI。"],
    ],
    commands: [
      ["go install pkg@version", "安裝工具", "新增/建議", "固定工具版本。", "`go install honnef.co/go/tools/cmd/staticcheck@vX.Y.Z`"],
      ["go test", "embed/fs tests", "建議", "驗證 embedded assets。", "`go test ./...`"],
    ],
  },
  17: {
    phase: "Module/泛型期",
    positioning: "Go 1.17 強化 compiler calling convention、module graph pruning 與 build constraint 語法。",
    value: "適合建立 module graph、`//go:build`、unsafe helper 與性能基線教材。",
    risk: "build tags 遷移與 module graph 行為會影響多平台專案。",
    focus: "register calling convention、lazy module loading、`//go:build`、unsafe helpers。",
    added: [
      ["Compiler", "register-based calling convention on amd64", "改善 function call performance。", "效能敏感專案重跑 benchmark。", "比較 Go 1.16/1.17 benchmark。"],
      ["Modules", "lazy module loading / graph pruning", "減少 module graph 載入成本。", "大型 mono repo 可改善。", "`go mod tidy` 後檢查 diff。"],
      ["Build Constraints", "`//go:build`", "新增可讀性更高的 build constraint syntax。", "新檔案應同時或改用 go:build。", "用 `gofmt` 同步舊 build tags。"],
      ["Unsafe", "`unsafe.Add` / `unsafe.Slice`", "低階程式更明確建構 pointer/slice。", "只放底層 package。", "bounds/race tests。"],
    ],
    compat: [
      ["Build Tags", "old/new build constraints", "遷移風險", "不一致會導致平台 build 差異。", "跑全 GOOS/GOARCH matrix。"],
      ["Modules", "`go mod tidy` diff", "依賴風險", "module graph pruning 可能改變 go.mod/go.sum。", "review dependency diff。"],
    ],
    commands: [
      ["gofmt", "sync build constraints", "工具支援", "同步 `//go:build` 與 `// +build`。", "`gofmt -w .`"],
      ["go mod tidy", "module graph cleanup", "建議", "清理 module graph。", "`go mod tidy`"],
    ],
  },
  18: {
    phase: "Module/泛型期",
    positioning: "Go 1.18 是語言層重大版本，引入 generics、fuzzing 與 workspace。",
    value: "適合建立泛型 API、fuzz testing、multi-module workspace 與 net/netip 教材。",
    risk: "泛型 API 設計容易過度抽象；fuzz/workspace 需要 CI 策略。",
    focus: "generics、fuzzing、workspaces、`net/netip`。",
    added: [
      ["Language", "generics", "新增 type parameters、constraints 與泛型函式/型別。", "只在能明顯減少重複或提升型別安全時使用。", "API review + compile tests。"],
      ["Testing", "fuzzing", "標準 `go test` 支援 fuzz tests。", "適合 parser、codec、protocol boundary。", "`go test -fuzz=FuzzName`。"],
      ["Modules", "workspaces", "`go work` 支援多 module 協作。", "mono repo / 多 module 開發更方便。", "測 workspace 與 release build 分離。"],
      ["Networking", "`net/netip`", "提供 allocation-friendly IP address type。", "新 networking code 優先評估。", "IP parse/compare tests。"],
    ],
    compat: [
      ["Language", "generic API overuse", "設計風險", "泛型可能讓 API 過度抽象。", "以具體 use case 驅動。"],
      ["CI", "fuzz corpus/runtime", "流程風險", "fuzz 不能無限制跑在一般 CI。", "分 smoke fuzz 與 nightly fuzz。"],
    ],
    commands: [
      ["go test -fuzz", "fuzz testing", "新增", "執行 fuzz target。", "`go test -fuzz=FuzzParse ./...`"],
      ["go work", "workspace", "新增", "管理多 module。", "`go work init ./service ./lib`"],
    ],
  },
  19: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.19 強化 memory governance、doc comment 與 memory model，是 production service runtime 調校的重要版本。",
    value: "適合導入 `GOMEMLIMIT`、runtime metrics、文件註解規範與 atomic/memory model 教材。",
    risk: "memory limit 設定錯誤會影響 throughput；atomic behavior 需按新 memory model 理解。",
    focus: "`GOMEMLIMIT`、revised memory model、doc comment、runtime metrics。",
    added: [
      ["Runtime", "soft memory limit / `GOMEMLIMIT`", "可設定 runtime soft memory limit，協助 container 環境控記憶體。", "Kubernetes / container service 需明確設定。", "壓測 memory/GC/latency。"],
      ["Language/Spec", "revised memory model", "更新 Go memory model 與 atomic 語意說明。", "並行程式應依 sync/atomic 與 happens-before 設計。", "race test。"],
      ["Docs", "doc comment formatting", "Go doc comment 格式與 link 支援改善。", "公共 API 文件可更可讀。", "`go doc` 檢查。"],
      ["Runtime", "runtime metrics improvements", "更適合 production observability。", "dashboard 加 runtime 指標。", "metrics scrape test。"],
    ],
    compat: [
      ["Runtime", "`GOMEMLIMIT` tuning", "操作風險", "過低限制會增加 GC 壓力。", "用 production-like workload 校準。"],
      ["Concurrency", "memory model assumptions", "設計風險", "資料競爭仍不是用 atomic 隨意修補。", "用 mutex/channel/atomic 明確建模。"],
    ],
    commands: [
      ["GOMEMLIMIT", "runtime memory limit", "新增/建議", "設定 soft memory limit。", "`GOMEMLIMIT=512MiB ./app`"],
      ["go doc", "doc comment verification", "建議", "檢查公開文件呈現。", "`go doc ./...`"],
    ],
  },
  20: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.20 以 toolchain、runtime/compiler、coverage、PGO preview 與標準庫 API 補強為主，是工程治理型版本。",
    value: "適合把 coverage 從 unit test 推進到 integration test，建立 PGO 評估流程，並補強錯誤聚合、context cancel cause、HTTP gateway 與 runtime observability。",
    risk: "`-i` 移除、舊 OS 支援線、cgo 預設行為、bootstrap toolchain、XML/template/archive 安全行為、GOPATH 舊流程與大量標準庫細節異動是主要風險。",
    focus: "program coverage、PGO preview、`runtime/coverage`、multi-error、`WithCancelCause`、`ResponseController`、ReverseProxy rewrite、cgo/bootstrap/linker/stdlib minor changes。",
    performance: [
      ["Runtime / GC", "Go 1.19 需以既有 GC CPU、heap overhead、tail latency 作 baseline。", "Go 1.20 重整 GC internal data structures，降低記憶體 overhead 並改善 overall CPU performance。", "最多約 `2%` CPU/記憶體 overhead 改善。", "API server、worker、長時間執行服務。", "`go test -bench=. -benchmem ./...`、pprof、runtime metrics、tail latency 壓測。"],
      ["Compiler / PGO", "Go 1.19 無正式 PGO build flow，hot call site 只能靠一般 compiler optimization。", "Go 1.20 preview PGO 以 pprof CPU profile 指導 aggressive inlining。", "代表性 benchmark 約 `3-4%` performance improvement。", "CPU-bound service、hot path 明確的 CLI / gateway。", "`go build -pgo=off` 對比 `go build -pgo=cpu.pprof`。"],
      ["Compiler / build speed", "Go 1.18 / 1.19 因 generics 支援導致 build speed regression。", "Go 1.20 改善 generics 後續成本，build speed 回到接近 Go 1.17 水準。", "build speed 最高約 `10%` 改善。", "大型 monorepo、CI cold build、泛型-heavy library。", "記錄 cold/warm build time，對比 `go test ./...` wall time。"],
      ["crypto/ecdsa", "舊版 ECDSA supported curves 並非全部使用新的 constant-time implementation。", "Go 1.20 supported curves 操作改為 constant time，提高安全性但增加 CPU time。", "CPU time 約增加 `5% and 30%`，主要影響 P-384、P-521。", "TLS、簽章服務、憑證驗證工具。", "`go test -bench` 針對 sign/verify，保留 `benchmem` 與 curve 維度。"],
      ["crypto/rsa decryption", "舊版 RSA backend 較快但安全模型較弱。", "Go 1.20 使用新的 safer constant-time backend，decryption CPU cost 上升。", "RSA-2048 on amd64 約 `15%` 增加；RSA-4096 on arm64 約 `45%` 增加，32-bit 架構可能更高。", "TLS termination、JWT / token signing、legacy RSA decrypt workload。", "分 key size / architecture 跑 decrypt benchmark。"],
      ["crypto/rsa encryption", "舊版 RSA encryption throughput 較高。", "Go 1.20 新 backend 下 encryption operations 明顯變慢，但仍比 decryption 快。", "encryption 約 `20x` slower than before，但仍約比 decryption 快 `5-10x`。", "高頻 RSA encrypt 的舊系統、相容性測試工具。", "分 encrypt/decrypt benchmark，記錄 ops/sec 與 CPU profile。"],
      ["runtime/metrics histogram", "Go 1.19 time-based histogram metrics 較精確但記憶體成本較高。", "Go 1.20 time-based histogram metrics 精度較低，但 memory footprint 大幅降低。", "官方未列百分比；明確 tradeoff 是 less precise、much less memory。", "observability dashboard、runtime metrics exporter。", "比較 metrics cardinality、scrape payload、process RSS 與 dashboard alert threshold。"],
    ],
    coverage: [
      ["Introduction to Go 1.20", "已補齊", "整理 Go 1 compatibility、toolchain/runtime/library 為主的版本定位。", "Executive Summary / 技術總覽", "中"],
      ["Changes to the language", "已補齊", "補 slice to array conversion、unsafe slice/string helpers、struct values / array values comparison order、`comparable` constraint。", "新增功能 / 相容性異動", "中高"],
      ["Ports / Windows", "已補齊", "補 Windows 7、8、Server 2008、Server 2012 為最後支援線。", "移除 / 棄用 / 相容性異動", "中高"],
      ["Ports / Darwin and iOS", "已補齊", "補 macOS 10.13 High Sierra、10.14 Mojave 為最後支援線。", "移除 / 棄用 / 相容性異動", "中高"],
      ["Ports / FreeBSD-RISC-V", "已補齊", "補 `GOOS=freebsd`、`GOARCH=riscv64` experimental support。", "新增功能列表", "中"],
      ["Tools / Go command", "已補齊", "補 `$GOROOT/pkg` archive 移除、`go test -json`、architecture feature tags、`-C`、`-skip`、`-pgo`、`-cover`、`go version -m`。", "Go 指令新增 / 移除功能", "高"],
      ["Tools / Cgo", "已補齊", "補 `CGO_ENABLED` default、stdlib cgo packages、macOS cgo rewrite、`-buildmode=c-archive` + `-lresolv`、race detector 需求。", "Go 指令 / 相容性異動", "高"],
      ["Tools / Cover", "已補齊", "補 application/integration coverage、`go build -cover`、`GOCOVERDIR`、`runtime/coverage` 連動。", "新增功能 / Go 指令", "中高"],
      ["Tools / Vet", "已補齊", "補 `T.Parallel` loop capture 與 `2006-02-01` 錯誤日期格式診斷。", "Go 指令 / 相容性異動", "中"],
      ["Runtime", "已補齊", "補 GC CPU/memory overhead、goroutine assists 穩定性、`runtime/coverage`。", "新增功能 / 相容性異動", "中高"],
      ["Compiler", "已補齊", "補 PGO preview、3-4% profile-guided inlining、generic front-end、anonymous interface cycles、build speed up to 10%。", "新增功能 / 相容性異動", "高"],
      ["Linker", "已補齊", "補 Linux glibc/musl dynamic interpreter、Windows LLVM C toolchain、`go:` / `type:` symbol prefix。", "相容性異動 / Go 指令", "高"],
      ["Bootstrap", "已補齊", "補 Go 1.17.13 bootstrap requirement、搜尋路徑與未來 Go 1.22 bootstrap 前移到 Go 1.20 final point release。", "相容性異動 / Go 指令", "高"],
      ["Standard library / major features", "已補齊", "補 `crypto/ecdh`、multi-error、`ResponseController`、ReverseProxy `Rewrite` / `SetURL` / `SetXForwarded`。", "新增功能列表", "中高"],
      ["Standard library / minor changes", "已補齊", "補 archive、bytes、context、crypto、debug、encoding、go tooling、html/template、io/fs、math/big、mime、net/http、os、reflect、runtime、sync、syscall、testing、time、unicode 等 minor changes。", "新增功能 / 相容性異動", "高"],
      ["Patch Revisions", "已整理", "Go 1.20.1 到 Go 1.20.14 由官方 Release History 擷取。", "Patch Revisions", "中"],
    ],
    added: [
      ["Language", "slice to array conversion", "可由 slice 直接轉成 array，例如把 `x` 轉成 `[4]byte(x)`，延續 Go 1.17 slice-to-array-pointer 能力。", "解析 binary frame、固定長度 header 時可減少 unsafe 寫法。", "補長度不足 panic 與正常轉換測試。"],
      ["Language / comparison", "struct values / array values comparison order", "spec 明確定義 struct values 依欄位順序、array values 依 index 遞增順序逐一比較，遇到第一個 mismatch 即停止。", "依賴比較可能 panic 的 interface/composite type 時，文件與測試要標出短路順序。", "測 struct field order、array element order 與 panic case。"],
      ["Language / unsafe", "`unsafe.SliceData`、`unsafe.String`、`unsafe.StringData`", "補齊 slice/string 建構與拆解 API，降低依賴內部 representation 的需求。", "只放在低階封裝層，禁止業務層散用 unsafe。", "用 race test 與 fuzz 測 boundary。"],
      ["Language / generics", "`comparable` constraint 語意放寬", "普通 interface 等 comparable type 可滿足 `comparable` constraint，但 runtime comparison 仍可能 panic。", "generic map key helper 需補 panic case 文件。", "對 interface-containing composite types 做測試。"],
      ["Ports", "FreeBSD on RISC-V experimental support", "新增 `GOOS=freebsd`、`GOARCH=riscv64` 實驗支援。", "只放入 experimental build matrix，不作 production SLA。", "`GOOS=freebsd GOARCH=riscv64 go build`。"],
      ["Tools / Cover", "program coverage / `GOCOVERDIR`", "application 與 integration test 可透過 instrumented binary 收集 coverage。", "把 smoke test、gateway e2e test 納入 coverage artifact。", "`go build -cover` 後用 `GOCOVERDIR` 收集。"],
      ["Runtime", "`runtime/coverage`", "長時間執行或 server 程式可在 runtime 寫出 coverage profile，不必依賴正常 process exit。", "API server、worker、gateway 可在測試 hook 觸發 coverage dump。", "整合測試驗證 profile 檔案生成。"],
      ["Compiler", "PGO preview", "支援以 pprof CPU profile 指導最佳化，Go 1.20 主要用於 hot call site aggressive inlining。", "只使用代表性 production-like profile，避免用錯 workload。", "比較 `-pgo=off` 與 profile build benchmark。"],
      ["Compiler", "generic front-end internal data change", "compiler front-end 改用新的 internal data handling，修正多項 generic type issue，並允許 generic function/method 內宣告 type。", "泛型-heavy library 升級後應補 build/test。", "`go test ./...` + generic API tests。"],
      ["Compiler", "build speed improvements", "Go 1.20 改善 Go 1.18/1.19 因 generics 導致的 build speed regression，最高約 10%。", "大型 monorepo 可量測 CI build time。", "記錄升級前後 cold/warm build 時間。"],
      ["Standard Library / crypto", "`crypto/ecdh`", "新增明確 ECDH package，支援 NIST curves 與 Curve25519。", "新程式優先用 `crypto/ecdh`，不要直接用低階 `crypto/elliptic` 做 ECDH。", "產生 key、derive shared secret 測試。"],
      ["Errors / fmt", "`errors.Join` and fmt.Errorf multiple %w", "支援一個 error 包裝多個 error；`fmt.Errorf` 可在單一 format string 中使用多個 `%w`，回傳可 unwrap 到所有 `%w` operands 的 error；`errors.Is` / `errors.As` 可走訪多錯誤樹。", "batch job、多設備輪詢、multi-stage validation 可保留完整錯誤原因。", "測 fmt.Errorf multiple %w、`errors.Is` / `errors.As` 對多錯誤命中。"],
      ["Context", "`context.WithCancelCause` / `context.Cause`", "context cancel 可保留原因，便於區分 timeout、client cancel、shutdown 與 upstream failure。", "API/worker shutdown、gateway timeout 應記錄 cancel cause。", "測 timeout/client cancel/shutdown 三種 cause。"],
      ["HTTP", "`net/http.ResponseController` / `SetReadDeadline` / `SetWriteDeadline`", "提供 discoverable per-request extended control，新增 `SetReadDeadline` 與 `SetWriteDeadline` 設定單一 request 的讀寫 deadline。", "streaming response、大檔案下載、長連線 handler 可更精準控制 timeout。", "用 `httptest` 驗證 read/write deadline 行為。"],
      ["HTTP ReverseProxy", "`httputil.ReverseProxy.Rewrite`", "新增 `Rewrite` hook，以 `ProxyRequest` 同時存取 inbound/outbound request，降低 header spoofing 風險。", "gateway/proxy 新實作優先用 `Rewrite` 取代 `Director`。", "測 inbound header 不會覆蓋安全 header。"],
      ["HTTP ReverseProxy", "`ProxyRequest.SetURL` / `SetXForwarded` / `User-Agent` behavior", "`SetURL` 取代 `NewSingleHostReverseProxy` 的常見用法；`SetXForwarded` 明確設定 forwarding headers；incoming request 沒有 `User-Agent` 時不再自動補上。", "反向代理需明確定義 Host、X-Forwarded-* 與 `User-Agent` policy。", "用 integration test 檢查 forwarded headers 與 `User-Agent`。"],
      ["Archive / Path Security", "`archive/tar` / `archive/zip` insecure path controls", "`GODEBUG=tarinsecurepath=0` 與 `zipinsecurepath=0` 可對不安全路徑回傳 `ErrInsecurePath`。", "處理外部 archive 前先加惡意路徑測試。", "測 absolute path、`..`、Windows reserved name。"],
      ["bytes / strings", "`CutPrefix` / `CutSuffix` and `bytes.Clone`", "bytes 與 strings 補 prefix/suffix cut helpers；`bytes.Clone` 可明確複製 slice。", "解析 protocol prefix/suffix 時可減少手寫判斷。", "測 trimmed 與 not-trimmed case。"],
      ["crypto/ecdsa", "`PrivateKey.ECDH`", "可把 ECDSA private key 轉成 ECDH private key。", "憑證與 key 轉換流程需補安全文件。", "測支援曲線與錯誤曲線。"],
      ["crypto/ed25519", "Ed25519ph / Ed25519ctx support", "`PrivateKey.Sign` 與 `VerifyWithOptions` 支援 pre-hashed 與 context variants。", "簽章協議需明確標示 HashFunc 與 Context。", "測 context mismatch verify fail。"],
      ["crypto/subtle", "`XORBytes`", "新增 byte slice XOR helper。", "低階 crypto/protocol helper 可改用標準 API。", "測不同長度與輸出長度。"],
      ["crypto/tls", "parsed certificates shared across active clients / memory savings", "TLS parsed certificates are now shared across active clients using that certificate；大量 concurrent clients 連到共用 certificate chain 的 server 時，可降低 certificate parsing 相關 memory usage。", "高併發 TLS client、proxy、gateway 與連多個共用憑證鏈的服務時，記憶體 profile 可能改善。", "用 TLS client 壓測比對 process RSS、heap profile 與 concurrent connection 數。"],
      ["crypto/tls / x509", "`CertificateVerificationError` / `SetFallbackRoots` / ECDH key parsing", "TLS verification failure 有具體 error type；x509 可設定 fallback roots；`ParsePKCS8PrivateKey`、`MarshalPKCS8PrivateKey`、`ParsePKIXPublicKey`、`MarshalPKIXPublicKey` 支援 `crypto/ecdh` keys。", "TLS client/server 排錯、embedded root bundle 與 ECDH key 管理可更明確。", "測 unknown authority、fallback roots 與 ECDH PKCS8/PKIX parse。"],
      ["debug/elf", "`SHT_NOBITS` / `R_LARCH_*` / `R_PPC64_*`", "`SHT_NOBITS` section 讀取改回錯誤；新增 LoongArch `R_LARCH_*` 與 PPC64 ELFv2 `R_PPC64_*` relocation constants。", "ELF 解析器與 binary audit tool 需補跨架構 fixture。", "用 Linux/LoongArch/PPC64 fixture 測 relocation。"],
      ["debug/gosym / debug/pe", "`debug/gosym` symbol prefix / `IMAGE_FILE_MACHINE_RISCV*`", "`debug/gosym` 可處理 Go 1.20 `go:` / `type:` symbol prefix；`debug/pe` 新增 `IMAGE_FILE_MACHINE_RISCV*` constants。", "Windows/RISC-V 與 Go binary symbol parser 需用新版 package。", "用 Go 1.19/1.20 binary fixture 測。"],
      ["encoding/binary / fmt", "`ReadVarint` / `ReadUvarint` / `fmt.FormatString`", "`ReadVarint` 與 `ReadUvarint` 在 partial value 時回 `io.ErrUnexpectedEOF`；Formatter 可用 `fmt.FormatString` 取回 format directive。", "parser 與 formatter library 應補錯誤分類測試。", "測 partial varint、partial uvarint 與 custom Formatter。"],
      ["encoding/xml", "`Encoder.Close` / namespace validation", "`Encoder.Close` 可檢查未關閉元素；decoder 拒絕 `<a:b:c>`、`xmlns:a=\"\"` empty namespace、opening/closing tag prefix mismatch。", "XML generator 與 legacy XML input 都要補驗證。", "測 unclosed element、empty namespace、closing tag prefix mismatch。"],
      ["Go tooling APIs", "`RangeStmt.Range`、`FileStart`、`FileEnd`、`FileSet.RemoveFile`、`go/types.Satisfies`", "AST 新增 `RangeStmt.Range`、`File.FileStart`、`File.FileEnd`；FileSet 可移除檔案釋放記憶體；types 可判斷 constraint satisfaction。", "長時間分析器、LSP、codegen 工具可導入。", "用大型 source tree 做 memory test。"],
      ["IO / Filesystem", "`io.OffsetWriter`、`io/fs.SkipAll`、`path/filepath.SkipAll`、`IsLocal`", "新增 offset writer、立即成功終止 walk、路徑 lexical local 判斷。", "檔案工具、archive extractor、安全路徑檢查應導入。", "測 path traversal 與 Walk early stop。"],
      ["Networking", "`net.LookupCNAME`、`FlagRunning`、`Dialer.ControlContext`、DNS `trust-ad` / `nsswitch.conf`", "CNAME lookup 行為更一致；interface flag 可區分 active link；dial control 可取得 context；resolver 支援 `trust-ad` 並會偵測 `/etc/nsswitch.conf` reload。", "工業網路 gateway 可用 `FlagRunning` 判斷 link 實際狀態，DNS 行為需有部署驗證。", "測 DNS、拔線/未連線介面、dial timeout、resolver reload。"],
      ["net/http", "1xx、`DisableGeneralOptionsHandler`、`OnProxyConnectResponse`、`StreamError`、`Cookie.Valid`", "ResponseWriter 可送 1xx；Server 可關閉 default `OPTIONS *`；Transport 可觀察 proxy CONNECT response；HTTP/2 stream errors 可用 `errors.As` 轉 `StreamError`；`Cookie.Valid` 只在 Expires 有值時檢查。", "HTTP gateway、安全 proxy、client transport 與 cookie parser 應補測。", "httptest + proxy fixture + HTTP/2 stream error case。"],
      ["net/netip", "`IPv6LinkLocalAllRouters` / `IPv6Loopback`", "新增 `net/netip` 版本的 IPv6 link-local all-routers 與 loopback helper。", "新網路程式可統一採 `netip.Addr`，減少 `net.IP` 混用。", "測 IPv6 helper 與既有 `net.IP` 對應。"],
      ["os/exec", "`Cmd.Cancel` / `WaitDelay`", "可定義 Context cancel 或 child process 持有 pipe 時的等待行為。", "CLI wrapper、supervisor、build runner 要避免 zombie 與永遠卡住。", "測 context cancel、child holding stdout/stderr。"],
      ["reflect", "`Value.Comparable`、`Equal`、`Grow`、`SetZero`", "reflection 補 equality、slice grow 與 zero assignment helper。", "generic-ish validation、serialization、diff 工具可減少 unsafe/手寫邏輯。", "測 unexported field 與不可比較型別。"],
      ["runtime/cgo", "`runtime/cgo.Incomplete`", "新增 `Incomplete` marker type，cgo 產生碼會用 `cgo.Incomplete` 標示 incomplete C type。", "檢查 cgo wrapper 與文件產生器是否處理 incomplete type。", "用含 opaque C struct 的 cgo fixture 測。"],
      ["Runtime observability", "`runtime/metrics` / `runtime/pprof` / `runtime/trace` updates", "新增 GOMAXPROCS、cgo calls、mutex wait、GC time 等 metrics；pprof mutex profile samples 預先 scaling；Windows symbolization 修正；trace 減少 GC sweeper noise。", "把 runtime metrics 納入 dashboard，升級後比對 profile。", "metrics scrape、mutex profile、Windows pprof、trace smoke test。"],
      ["sync", "`sync.Map.Swap`、`CompareAndSwap`、`CompareAndDelete`", "sync.Map 支援 atomic update/delete 操作。", "高併發 cache/state table 可減少外部鎖。", "race test + high-concurrency tests。"],
      ["syscall / testing / time / unicode", "`CgroupFD`、`UseCgroupFD`、`B.Elapsed`、`DateTime`、`DateOnly`、`TimeOnly`、`Time.Compare`、`utf16.AppendRune`", "Linux `SysProcAttr.CgroupFD` / `UseCgroupFD` 可把 child process 放進指定 cgroup；testing、time layout、time comparison、UTF-16 append API 補齊常見需求。", "benchmark metric、時間格式、encoding 工具與 Linux supervisor 可改用標準 API。", "測 cgroup launch、benchmark helper、JSON time、UTF-16 conversion。"],
    ],
    compat: [
      ["Go command", "`go build -i` / `go test -i` removed", "移除", "舊 CI、Makefile、Dockerfile 若仍帶 `-i` 會失敗。", "移除 `-i`，改依 build cache。"],
      ["Go command", "`$GOROOT/pkg` precompiled stdlib archive removed", "行為變更", "標準庫不再以發行版預帶 archive，會按需 build 並進 build cache。", "CI cache policy 應包含 Go build cache，不依賴 `$GOROOT/pkg`。"],
      ["Go command", "GOPATH package install target cleanup", "行為變更", "main module 位於 `GOPATH/src` 時，non-main package 不再安裝到 `GOPATH/pkg`，`go list` 不再回報 `Target`。", "清理舊 GOPATH workflow，改用 module/cache。"],
      ["Platform / Windows", "Windows 7、8、Server 2008、Server 2012 final support", "最後支援", "Go 1.21 起需 Windows 10 或 Server 2016 以上。", "升級到 Go 1.21 前先更新 OS support matrix。"],
      ["Platform / macOS", "macOS 10.13 / 10.14 final support", "最後支援", "Go 1.21 起需 macOS 10.15 Catalina 以上。", "CI runner 與開發機需升級。"],
      ["Cgo", "`CGO_ENABLED` default may become `0` without C toolchain", "預設行為變更", "minimal container 或 macOS 無 C compiler 時會自動走 pure Go build。", "Docker image 要明確設定 `CGO_ENABLED` 與 C toolchain policy。"],
      ["Cgo / stdlib", "`net`、`os/user`、`plugin` cgo package list", "建置行為", "官方明列標準庫使用 cgo 的 packages 為 `net`、`os/user`、`plugin`；macOS 的 `net` 與 `os/user` 已改寫為不依賴 cgo。", "容器、交叉編譯與 macOS build matrix 要分別驗證。"],
      ["Cgo / macOS", "`net` + `-buildmode=c-archive` needs `-lresolv`", "link 行為變更", "macOS 將 Go archive 連到 C program 時可能缺 resolver symbol。", "C link command 加上 `-lresolv`。"],
      ["Cgo / race detector", "macOS race detector no longer needs cgo/Xcode", "需求變更", "macOS 可降低 race test 環境要求；Linux/Unix/Windows 仍需 host C toolchain。", "CI 文件分平台標註。"],
      ["Vet", "`T.Parallel` loop variable capture diagnostic", "診斷加強", "舊 subtest 可能被 vet 報出 loop variable capture。", "改用每輪 shadow variable 或 table-driven safe pattern。"],
      ["Vet", "`2006-02-01` time format diagnostic", "診斷加強", "誤把 yyyy-dd-mm 當 ISO yyyy-mm-dd 的程式會被 vet 提醒。", "改成 `2006-01-02`。"],
      ["Runtime", "GC CPU/memory overhead up to 2%", "效能行為", "GC internal data structures 重整後，memory overhead 與 overall CPU performance 最多改善約 `2%`，goroutine assists 行為也較穩定。", "壓測時比對 GC CPU、heap overhead 與 tail latency。"],
      ["Compiler", "anonymous interface cycles rejected", "相容性異動", "極少數使用 embedded interface cycle 的程式會 compile fail。", "重構 interface graph，避免匿名循環。"],
      ["Linker", "Linux glibc/musl dynamic interpreter selected at link time", "link 行為變更", "container/base image 混用 glibc/musl 時需實際 smoke test。", "分 glibc/musl image 驗證 binary。"],
      ["Linker", "compiler-generated symbols use `go:` / `type:` prefix", "工具相容性", "自製 binary analysis / symbol parsing tool 可能依賴舊 `go.` / `type.`。", "改用 Go 1.20 `debug/gosym` 或更新 parser。"],
      ["Bootstrap", "source build requires Go 1.17.13 bootstrap", "建置要求", "自建 Go toolchain 若 bootstrap 太舊會失敗。", "安裝 Go 1.17.13，確認 `$HOME/go1.17.13` 或 `$HOME/sdk/go1.17.13`。"],
      ["Bootstrap", "future Go 1.22 bootstrap moves to Go 1.20 final point release", "未來要求", "官方預告 bootstrap toolchain 約每年往前移，Go 1.22 預期需要 Go 1.20 final point release。", "source build 文件需避免長期停在舊 bootstrap。"],
      ["archive/tar / archive/zip", "insecure path checks via GODEBUG", "安全收緊", "外部 archive 若含 absolute path、`..`、Windows reserved name，啟用後會回 `ErrInsecurePath`。", "修正 archive producer 或清洗路徑。"],
      ["archive/zip", "directory file containing data now errors", "行為收緊", "不合規 zip 讀取可能失敗。", "測 legacy zip corpus。"],
      ["encoding/xml", "`Encoder.Close` and stricter namespace/name validation", "安全/規格收緊", "`Encoder.Close` 可抓未關閉元素；多 colon name、`xmlns:a=\"\"` empty namespace、opening/closing tag prefix mismatch 會被拒絕。", "清理 legacy XML input，並在 XML encoder 收尾呼叫 `Encoder.Close`。"],
      ["html/template", "`GODEBUG=jstmpllitinterp=1` rollback toggle", "安全收緊", "Go 1.20.3 and later disallow actions in ECMAScript 6 template literals；短期可用 `GODEBUG=jstmpllitinterp=1` 恢復舊行為。", "修正 template action 位置，不把 rollback toggle 當長期策略。"],
      ["crypto/ecdsa / rsa", "constant-time backend CPU cost and `OAEPOptions.MGFHash`", "安全收緊", "ECDSA supported curves 改 constant time，CPU time 約增加 `5% and 30%`；RSA 新 constant-time backend 且 `OAEPOptions.MGFHash` 可獨立設定 MGF1 hash。", "對 TLS/signing/decryption 做 benchmark，並檢查 OAEP interoperability。"],
      ["crypto/rsa", "`PrecomputedValues` must not be manually modified", "安全要求", "手動修改或產生 RSA precomputed fields 可能破壞安全假設。", "改用標準 key generation/parsing。"],
      ["crypto/x509", "`ParsePKCS8PrivateKey` / `ParsePKIXPublicKey` support `crypto/ecdh` keys", "API 支援", "PKCS8/PKIX marshal/parse API 可處理 `*crypto/ecdh.PrivateKey` 與 `*crypto/ecdh.PublicKey`，NIST curve parsing 仍回 ECDSA key 後可用 `ECDH` 轉換。", "憑證與 key import/export tests 要補 ECDH case。"],
      ["math/rand", "global RNG auto seed and `Seed` deprecated", "預設行為變更/棄用", "依賴 deterministic global random sequence 的測試會漂移。", "測試改用 `rand.New(rand.NewSource(seed))`；必要時用 `GODEBUG=randautoseed=0`。"],
      ["math/rand", "`Read` deprecated", "棄用", "安全用途不應用 math/rand。", "改用 `crypto/rand.Read`。"],
      ["math/big", "not suited for attacker-controlled cryptography input", "安全說明", "`math/big` scope 很廣且 timing depends on input；不適合直接拿來處理 attacker-controlled cryptography input，標準庫 crypto packages 也避免對攻擊者可控輸入呼叫 non-trivial `Int` methods。", "密碼學程式使用標準 crypto package 或 constant-time implementation，不自行用 `math/big` 組協議。"],
      ["mime", "`ParseMediaType` duplicate parameter names", "解析行為變更", "`ParseMediaType` 允許重複 parameter name，只要對應值相同。", "HTTP header/MIME parser 測試需補 duplicate same-value 與 conflict cases。"],
      ["mime/multipart", "`Reader.NextPart` / `NextRawPart` error wrapping and limits", "安全限制 / 錯誤行為", "`Reader.NextPart`、`Reader.NextRawPart` 與 `Reader` methods 現在會 wrap underlying `io.Reader` errors；大型或異常 multipart input 可能被 header/part limits 拒絕。", "必要時調整 `GODEBUG=multipartmaxheaders` / `multipartmaxparts`，並讓錯誤判斷支援 wrapped errors。"],
      ["net/http", "HEAD request with body accepted", "行為變更", "舊測試若期待 server reject HEAD body 需要更新。", "以實際 API contract 重新定義。"],
      ["net/http", "`StreamError` / `Cookie.Valid` / cookie parsing behavior changed", "行為變更", "HTTP/2 stream errors 可用 `errors.As` 轉 `StreamError`；cookie name 會 trim spaces；empty Expires 的 `Cookie.Valid` 視為有效。", "補 HTTP/2 error 與 cookie parser regression tests。"],
      ["os / Windows", "`NUL` and directory file behavior changed", "平台行為變更", "Windows path/file tests 可能受影響。", "在 Windows runner 重跑 filesystem tests。"],
      ["reflect", "`Value.Equal` / `Value.Grow` / `Value.SetZero` and iterator field checks", "API / 行為修正", "`Value.Equal`、`Value.Grow`、`Value.SetZero` 成為標準反射工具；`SetIterKey` / `SetIterValue` 補上 unexported field check。", "修正對 unexported field 的操作，並用新 API 取代手寫反射邏輯。"],
      ["regexp/syntax", "`ErrLarge` replaces generic internal error for huge regex", "錯誤分類變更", "錯誤判斷若比對 `ErrInternalError` 需更新。", "改測 `syntax.ErrLarge`。"],
      ["syscall / FreeBSD", "FreeBSD 11 compatibility shims removed", "平台相容性", "舊 FreeBSD target 不應再列為支援。", "更新部署矩陣。"],
      ["syscall / Linux", "`CLONE_*` constants / `SysProcAttr.Cloneflags` / `CgroupFD` / `UseCgroupFD`", "平台 API", "Linux 新增可搭配 `SysProcAttr.Cloneflags` 使用的 `CLONE_*` constants；process launch 也可用 `CgroupFD` 與 `UseCgroupFD` 把 child process 放入指定 cgroup。", "container supervisor、namespace/cgroup launcher 或 job runner 需補 Linux-only tests。"],
      ["testing", "`T.Run` inside `T.Cleanup` panics", "行為收緊", "不明確的 cleanup 內建立 subtest 會 panic。", "調整測試 lifecycle。"],
      ["time", "`DateOnly` / `TimeOnly` / `time.Parse` sub-nanosecond precision / stricter RFC3339 JSON", "API / 格式行為", "新增 `DateTime`、`DateOnly`、`TimeOnly` layout constants；`time.Parse` now ignores sub-nanosecond precision instead of reporting those digits as an error；`Time.MarshalJSON` 對 RFC3339 更嚴格。", "時間格式統一改用命名 layout，補 Parse sub-nanosecond input 與 JSON time round-trip tests。"],
    ],
    commands: [
      ["go -C", "before-command chdir", "新增", "Go subcommands 可先切到指定目錄再執行，簡化 multi-module script。", "`go -C ./service test ./...`"],
      ["go build/test -i", "`-i` flag removed", "移除", "舊 CI 預先 install package archive 的流程會失敗。", "刪除 `-i`，讓 build cache 接管。"],
      ["go generate -skip", "skip generate directives", "新增", "可略過符合 pattern 的 `//go:generate` directive。", "`go generate -skip 'mock|assets' ./...`"],
      ["go test -skip", "skip tests/subtests/examples", "新增", "可略過符合 pattern 的測試、子測試或 example。", "`go test -skip 'Slow|External' ./...`"],
      ["go test -json", "start event and robust test2json flow", "變更", "輸出新增 `Action=start` event；直接呼叫 `go tool test2json` 時應使用 `-v=test2json`。", "`go test -json ./...`"],
      ["go build -pgo", "PGO profile path", "新增", "以 pprof CPU profile 指導 compiler optimization。", "`go build -pgo=cpu.pprof ./cmd/app`"],
      ["go build -pgo=auto", "auto default profile discovery", "新增", "若 main package 目錄有 `default.pgo` 可自動使用。", "`go build -pgo=auto ./cmd/app`"],
      ["go build -pgo=off", "disable PGO", "新增", "明確關閉 PGO，便於 benchmark baseline。", "`go build -pgo=off ./cmd/app`"],
      ["go build -cover", "program coverage instrumentation", "新增", "為 application/integration test 建立可收集 coverage 的 binary。", "`go build -cover -o app ./cmd/app`"],
      ["GOCOVERDIR", "coverage output directory", "新增工作流", "執行 instrumented binary 時指定 coverage profile 輸出目錄。", "`GOCOVERDIR=./coverage ./app`"],
      ["go version -m", "more binary formats", "增強", "可讀更多 Go binary metadata，包含 Windows c-shared DLL 與 Linux non-executable binary。", "`go version -m ./app`"],
      ["go help buildconstraint", "architecture feature build tags", "新增能力", "可用如 `amd64.v2` 的 feature build tags 選擇實作檔案。", "`//go:build amd64.v2`"],
      ["CGO_ENABLED", "defaults to 0 when no C toolchain", "預設行為變更", "未設定 `CGO_ENABLED` 且找不到 C compiler 時，go command 會停用 cgo。", "`CGO_ENABLED=1 go build ./...` 或明確採 pure Go。"],
      ["macOS c-archive", "`-buildmode=c-archive` may need `-lresolv`", "link 影響", "macOS 使用 `net` package 的 Go archive 連到 C program 時需 resolver library。", "`cc main.c libgo.a -lresolv`"],
      ["go vet", "`T.Parallel` loop capture and time format diagnostics", "診斷增強", "偵測 subtest loop variable capture 與常見錯誤日期 layout。", "`go vet ./...`"],
      ["GOROOT_BOOTSTRAP", "Go 1.17.13 bootstrap required", "建置要求", "從 source build Go 1.20 需要 Go 1.17.13 bootstrap toolchain。", "`GOROOT_BOOTSTRAP=$HOME/sdk/go1.17.13 ./make.bash`"],
    ],
  },
  21: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.21 是現代標準庫與 toolchain 管理的重要版本，加入 `log/slog`、`slices`、`maps`、`cmp` 與 toolchain switching。",
    value: "適合建立標準集合工具、結構化日誌、toolchain pinning 與 PGO 正式流程。",
    risk: "toolchain auto-switching、minimum version semantics 與 structured log 欄位治理需明確。",
    focus: "`slices`、`maps`、`cmp`、`log/slog`、toolchain management、PGO。",
    added: [
      ["Language", "`min` / `max` / `clear`", "新增內建函式，簡化常見集合操作。", "減少自寫 helper。", "語法與版本邊界測試。"],
      ["Stdlib", "`slices` / `maps` / `cmp`", "標準集合與比較工具。", "取代專案內部重複 helper。", "測 shallow copy 與 ordering。"],
      ["Standard library", "New maps package", "官方 `New maps package` 段落新增 map helper，涵蓋 clone、copy、delete、equal 類操作。", "專案內部 map helper 應盤點是否可改用標準 `maps`。", "測 nil map、empty map、aliasing 與 equality case。"],
      ["Standard library", "New cmp package", "官方 `New cmp package` 段落新增 ordered comparison helper 與 constraints，支援泛型排序與比較。", "排序、比較、min/max helper 可收斂到 `cmp`。", "測 ordered type、custom compare 與排序穩定性。"],
      ["Standard library", "Minor changes to the library", "整理 Go 1.21 官方 minor changes，避免只列主要新增 package 而漏掉行為修正。", "升級時掃描 stdlib package 變更與既有 wrapper/helper。", "以 package-level regression tests 驗證。"],
      ["Ports", "Darwin / ARM / WebAssembly / WebAssembly System Interface / ppc64/ppc64le / loong64", "補 Go 1.21 官方 ports 段落：Darwin、ARM、WebAssembly、WebAssembly System Interface（WASI）、ppc64/ppc64le、loong64。", "平台支援矩陣需列入 CI runner、交叉編譯與部署限制。", "跑目標平台 build matrix 與 smoke test。"],
      ["Logging", "`log/slog`", "標準結構化 logging。", "建立欄位命名與 redaction 規範。", "log contract tests。"],
      ["Toolchain", "toolchain management", "go command 可依 module toolchain 管理版本。", "CI pinning 必須明確。", "`go env GOTOOLCHAIN`。"],
    ],
    compat: [
      ["Toolchain", "auto toolchain switching", "流程風險", "CI 可能下載/切換 toolchain。", "固定 GOTOOLCHAIN policy。"],
      ["Logging", "structured log schema drift", "治理風險", "欄位不一致會影響 observability。", "建立 log schema。"],
      ["Ports", "Darwin/ARM/WebAssembly/WASI/ppc64/loong64 support drift", "平台支援", "平台段落可能影響 cross-compile、runner image、WebAssembly/WASI 執行環境。", "更新支援矩陣與 release checklist。"],
    ],
    commands: [
      ["go env GOTOOLCHAIN", "toolchain policy", "新增/重要", "控制 toolchain switching。", "`GOTOOLCHAIN=local go test ./...`"],
      ["go test", "stdlib helper migration", "建議", "替換 helper 後跑測試。", "`go test ./...`"],
    ],
  },
  22: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.22 帶來 loop variable 語意修正、integer range 與標準庫 ServeMux 大幅增強。",
    value: "適合重整 table-driven tests、標準庫 router 與 `math/rand/v2` 教材。",
    risk: "舊 closure workaround 可能變冗餘；ServeMux route pattern 成為外部 API contract。",
    focus: "loop variable per-iteration、range over integers、ServeMux patterns、`math/rand/v2`。",
    added: [
      ["Tools", "Tools", "補 Go 1.22 官方 `Tools` 段落，將 go command、vet、trace、toolchain 相關行為統一放進升級檢查。", "CI 與 developer workflow 不只檢查語言變更，也要檢查工具鏈行為。", "`go test ./...`、`go vet ./...`、腳本 smoke test。"],
      ["Language", "loop variables per iteration", "for loop variable 每次迭代有獨立實例，修正常見 closure bug。", "清理 table-driven tests。", "刪除不必要 shadow copy 後測試。"],
      ["Language", "range over integers", "可直接 `for i := range n`。", "簡化固定次數 loop。", "語法版本邊界測試。"],
      ["HTTP", "enhanced `ServeMux`", "支援 method pattern、wildcards 與 `Request.PathValue`。", "中小 API 可使用標準庫 router。", "route precedence tests。"],
      ["Random", "`math/rand/v2`", "新版 random API。", "新程式優先評估 v2。", "deterministic seed tests。"],
      ["Standard library", "Minor changes to the library", "補 Go 1.22 官方 `Minor changes to the library` 段落，整理小型 API/行為修正。", "逐 package 掃描專案 wrapper、測試 fixture 與相容性假設。", "package-level regression tests。"],
      ["Ports", "Ports / Darwin / ARM / Loong64 / OpenBSD", "補 Go 1.22 官方 ports 段落：Darwin、ARM、Loong64、OpenBSD。", "更新平台支援、交叉編譯、CI runner 與部署文件。", "跑 GOOS/GOARCH build matrix。"],
    ],
    compat: [
      ["Language", "loop closure behavior changed", "語意變更", "舊 workaround 可能仍可用但不必要。", "review table tests。"],
      ["HTTP", "ServeMux pattern conflicts", "API 風險", "路由 pattern 會影響外部 API。", "route contract tests。"],
    ],
    commands: [
      ["Tools", "Go 1.22 tool changes", "官方段落", "把官方 `Tools` 段落納入命令列與 CI 審查，不只列語言 loopvar。", "`go env`、`go test`、`go vet`、release script 檢查。"],
      ["go vet", "append/defer checks", "新增檢查", "抓常見無效 append / defer time.Since mistake。", "`go vet ./...`"],
      ["go test", "loopvar migration tests", "建議", "確認 closure 行為。", "`go test ./...`"],
    ],
  },
  23: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.23 引入 iterator/range-over-function、timer channel 行為變更與標準庫 API 版本檢查。",
    value: "適合建立 iterator pipeline、timer/ticker timeout 測試、API version linting。",
    risk: "timer behavior 改變可能影響 flaky timeout tests；iterator API 需避免過度抽象。",
    focus: "iterators、`iter` package、timer changes、`stdversion` vet、telemetry。",
    added: [
      ["Tools", "Tools", "補 Go 1.23 官方 `Tools` 段落，涵蓋 go command、telemetry、vet/stdversion 與工具鏈工作流。", "CI 應同時驗證 test、vet、telemetry policy 與 module go version。", "`go vet ./...`、`go env`、telemetry policy 檢查。"],
      ["Language", "range-over-function iterators", "可 range over iterator function。", "集合/stream API 可更標準化。", "測 early stop / cleanup。"],
      ["Stdlib", "`iter` package", "提供 iterator convention。", "搭配 `slices` / `maps` 新 API。", "iterator fixture tests。"],
      ["Standard library", "New structs package", "補 Go 1.23 官方 `New structs package` 段落，標記 struct layout/host-layout 類用途。", "低階資料結構、binary layout 或 cgo 邊界要明確標示可攜性。", "加 GOARCH matrix 與 layout fixture。"],
      ["Runtime", "timer/ticker GC and channel behavior", "timer/ticker 更容易被 GC，channel 行為更同步。", "重跑 timeout/flaky tests。", "time-sensitive tests。"],
      ["Vet", "`stdversion` analyzer", "檢查使用超過 module go version 的 API。", "CI 防止誤用太新 API。", "`go vet ./...`。"],
      ["Standard library", "Minor changes to the library", "補 Go 1.23 官方 `Minor changes to the library` 段落，集中追蹤 package-level 小改動。", "升級時把 minor changes 轉為 package regression checklist。", "跑受影響 package tests。"],
      ["Ports", "Darwin / Linux / OpenBSD / ARM64 / RISC-V / Wasm", "補 Go 1.23 官方 ports 段落：Darwin、Linux、OpenBSD、ARM64、RISC-V、Wasm。", "平台矩陣需記錄 kernel/OS/arch 差異與 wasm runner。", "跑 cross-compile、wasm smoke test 與平台 CI。"],
    ],
    compat: [
      ["Runtime", "timer behavior", "行為變更", "依賴舊 timer buffering 的測試可能失敗。", "重寫 deterministic tests。"],
      ["API", "too-new stdlib usage", "版本風險", "library 可能誤用高版本 API。", "使用 `stdversion`。"],
    ],
    commands: [
      ["Tools", "Go 1.23 tool changes", "官方段落", "把官方 `Tools` 段落納入升級驗收，尤其是 `stdversion`、telemetry 與 go command 行為。", "`go vet ./...`、`go env GOTELEMETRY`、CI script 檢查。"],
      ["go vet", "`stdversion`", "新增", "檢查 API 版本。", "`go vet ./...`"],
      ["go test", "timer tests", "建議", "重跑 timeout/retry 測試。", "`go test -count=100 ./...`"],
    ],
  },
  24: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.24 聚焦 tool directive、filesystem security、benchmark API 與供應鏈治理。",
    value: "適合建立工具依賴治理、目錄範圍 filesystem、benchmark loop 與 JSON/time/security 教材。",
    risk: "tool directive、GOAUTH、os.Root 導入需整理 CI 與安全政策。",
    focus: "`tool` directive、`os.Root`、`testing.B.Loop`、generic aliases、GOAUTH。",
    added: [
      ["Language", "generic type aliases", "泛型 alias 更完整。", "API 遷移可保留泛型型別相容。", "compile compatibility tests。"],
      ["Modules", "`tool` directive", "可在 go.mod 記錄 tool dependencies。", "把 mockgen/staticcheck 等工具納入治理。", "`go tool` workflow。"],
      ["Filesystem", "`os.Root`", "限制 filesystem operations 在指定 root 內。", "防 path traversal。", "malicious path tests。"],
      ["Testing", "New benchmark function / `B.Loop`", "補 Go 1.24 官方 `New benchmark function` 段落，`testing.B.Loop` 讓 benchmark loop 更不易寫錯。", "更新 benchmark pattern，避免手寫 `for i := 0; i < b.N; i++` 的錯誤。", "benchmark review 與 `go test -bench=. -benchmem`。"],
      ["Runtime", "Improved finalizers", "補 Go 1.24 官方 `Improved finalizers` 段落，聚焦 finalizer/cleanup 類生命週期管理改進。", "管理 native resource、file descriptor 或外部 handle 時要補生命週期測試。", "GC/finalizer smoke test 與 leak test。"],
      ["Standard library", "New weak package", "補 Go 1.24 官方 `New weak package` 段落，支援 weak pointer/cache 類模式。", "cache、memoization 與資源索引不可依賴 weak reference 作唯一正確性來源。", "測 GC 後 cache miss 與 race behavior。"],
      ["Crypto", "New crypto/mlkem package", "補 Go 1.24 官方 `New crypto/mlkem package` 段落，標記 post-quantum key encapsulation 相關能力。", "只在協議明確要求時導入，並保留互通性測試。", "KEM interop fixture 與 crypto tests。"],
      ["Crypto", "New crypto/hkdf, crypto/pbkdf2, and crypto/sha3 packages", "補官方 `New crypto/hkdf, crypto/pbkdf2, and crypto/sha3 packages` 段落，將常用 KDF/hash 能力納入標準庫。", "移除第三方 helper 前先確認 API/參數/輸出相容。", "用 RFC/test vector 驗證。"],
      ["Crypto", "FIPS 140-3 compliance", "補 Go 1.24 官方 `FIPS 140-3 compliance` 段落，標記合規建置與 crypto policy。", "合規環境要明確記錄 build mode、module 與 runtime policy。", "合規 build smoke test 與 crypto policy 文件。"],
      ["Testing", "New experimental testing/synctest package", "補 Go 1.24 官方 `New experimental testing/synctest package` 段落，適用 deterministic concurrency/time tests。", "只用於可隔離的同步測試，不取代整合測試。", "重寫 flaky timeout/retry tests。"],
      ["Ports", "Ports", "補 Go 1.24 官方 `Ports` 段落，包含 Linux、Darwin、WebAssembly、Windows 等平台更新。", "平台支援矩陣與 runner image 要同步更新。", "GOOS/GOARCH build matrix。"],
    ],
    compat: [
      ["Security", "`os.Root` adoption", "行為設計", "需明確定義 root boundary。", "path traversal tests。"],
      ["Tooling", "`tool` directive governance", "流程變更", "CI tool install 改走 module governance。", "更新 Makefile/CI。"],
      ["Ports", "Ports platform changes", "平台相容性", "Go 1.24 官方 ports 段落會影響 Linux、Darwin、WebAssembly、Windows deployment assumptions。", "分平台 smoke test 與部署文件更新。"],
    ],
    commands: [
      ["go get -tool", "tool dependency", "新增", "加入 tool directive。", "`go get -tool example.com/cmd/tool`"],
      ["go tool", "run managed tool", "新增/強化", "執行 module-managed tool。", "`go tool stringer`"],
    ],
  },
  25: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.25 強化 container-aware runtime、同步測試與 concurrency helper。",
    value: "適合 Kubernetes CPU limit、flaky concurrency tests、WaitGroup lifecycle 教材。",
    risk: "GOMAXPROCS 自動調整會改變效能基準；synctest 需明確適用範圍。",
    focus: "container-aware `GOMAXPROCS`、`testing/synctest`、`WaitGroup.Go`。",
    added: [
      ["Tools", "Tools", "補 Go 1.25 官方 `Tools` 段落，涵蓋 `go build -asan` leak detection、prebuilt tool policy、`ignore` directive、`go doc -http`、`go version -m -json`、workspace package pattern。", "CI scripts、tool install、doc workflow 與 module matching 都需檢查。", "`go env`、`go doc -http` smoke、`go version -m -json` fixture。"],
      ["Runtime", "container-aware `GOMAXPROCS`", "runtime 可依容器 CPU limit 調整預設 parallelism。", "Kubernetes service 需重定義 CPU/latency 基準。", "比較 pod CPU limit 下吞吐。"],
      ["Testing", "New testing/synctest package", "補 Go 1.25 官方 `New testing/synctest package` 段落；`testing/synctest` 從 Go 1.24 experiment 走向一般可用，用於同步與虛擬時間測試。", "用於 timeout/retry/flaky concurrency tests，但不要取代跨程序 integration tests。", "重寫 flaky tests 並保留 race test。"],
      ["JSON", "New experimental encoding/json/v2 package", "補 Go 1.25 官方 `New experimental encoding/json/v2 package` 段落；`GOEXPERIMENT=jsonv2` 啟用 `encoding/json/v2` 與 `encoding/json/jsontext`。", "JSON contract 嚴格的 API 需先隔離試用，不直接替換 production parser。", "golden JSON、error text、round-trip tests。"],
      ["Sync", "`WaitGroup.Go`", "簡化 goroutine 啟動與 WaitGroup bookkeeping。", "降低 Add/Done 錯誤。", "race test。"],
      ["Standard library", "Minor changes to the library", "補 Go 1.25 官方 `Minor changes to the library` 段落，追蹤 package-level 小改動。", "升級時把 stdlib minor changes 轉為受影響 package checklist。", "跑 package regression tests。"],
      ["Ports", "Darwin / Windows / AMD64 / Loong64 / RISC-V", "補 Go 1.25 官方 ports 段落：Darwin、Windows、AMD64、Loong64、RISC-V。", "更新 OS/arch support matrix、CI runner 與 cross-compile policy。", "平台 build matrix 與 smoke test。"],
    ],
    compat: [
      ["Runtime", "auto `GOMAXPROCS` changes throughput", "效能風險", "CPU limit 下結果與舊版不同。", "更新 benchmark baseline。"],
      ["Testing", "synctest scope", "測試設計", "不應取代所有 integration tests。", "限定用於 deterministic concurrency。"],
    ],
    commands: [
      ["Tools", "Go 1.25 tool changes", "官方段落", "補官方 `Tools` 段落到 Go 指令表，包含 ASAN leak detection、`ignore` directive、`go doc -http`、`go version -m -json`。", "CI script、tool policy、module pattern smoke test。"],
      ["GOMAXPROCS", "runtime default policy", "行為變更", "container 下需明確觀察。", "`GOMAXPROCS=2 go test ./...`"],
      ["go test", "synctest-based tests", "建議", "重構 flaky tests。", "`go test ./...`"],
    ],
  },
  26: {
    phase: "Modern Toolchain and Standard Library Governance Era",
    positioning: "Go 1.26 延續現代化工具鏈與 runtime 路線，重點在 modernizer、GC、測試 artifact 與語言小幅擴充。",
    value: "適合建立 automated modernization、GC metrics、test artifact collection 與 toolchain 升級治理。",
    risk: "modernizer 自動修改需 code review；GC/runtime 指標需重新校準。",
    focus: "`new(expression)`、modernizers、Green Tea GC、`testing.T.Attr` / `ArtifactDir`。",
    added: [
      ["Language", "`new(expression)`", "語言層小幅擴充，改善部分初始化表達能力。", "只在能提升可讀性時使用。", "compile tests。"],
      ["Tools", "Tools", "補 Go 1.26 官方 `Tools` 段落，涵蓋 go command、go fix/modernizers、toolchain 與測試 artifact workflow。", "所有自動化改寫必須在 branch 上 review，不直接套到 main。", "`go test ./...`、diff review、toolchain smoke test。"],
      ["Go command", "modernizers", "工具可協助把舊程式碼現代化。", "只在 reviewable branch 執行。", "檢查 diff 與 tests。"],
      ["Runtime", "Green Tea GC", "GC 實作更新，影響 runtime metrics 與效能觀察。", "重跑 latency / memory benchmark。", "pprof + runtime metrics。"],
      ["Testing", "`T.Attr` / `ArtifactDir`", "測試可標註 metadata 並保存 artifacts。", "適合 CI evidence collection。", "檢查 artifact 產物。"],
      ["SIMD", "New experimental simd/archsimd package", "補 Go 1.26 官方 `New experimental simd/archsimd package` 段落，標記 experimental SIMD / architecture-specific acceleration。", "僅在 hot path 且有 fallback 時試用，避免綁死平台。", "CPU feature matrix、fallback tests、benchmark。"],
      ["Runtime", "New experimental runtime/secret package", "補 Go 1.26 官方 `New experimental runtime/secret package` 段落，標記 secret handling experimental API。", "高敏感資料需先定義 threat model，不以 experimental API 作唯一防護。", "secret lifecycle tests 與 security review。"],
      ["Standard library", "Minor changes to the library", "補 Go 1.26 官方 `Minor changes to the library` 段落，追蹤各 package 小改動。", "升級時掃描受影響 package、wrapper 與 golden tests。", "package-level regression tests。"],
      ["Ports", "Darwin / FreeBSD / PowerPC / RISC-V / S390X / WebAssembly", "補 Go 1.26 官方 ports 段落：Darwin、FreeBSD、PowerPC、RISC-V、S390X、WebAssembly。", "更新平台支援矩陣、交叉編譯與部署 smoke test。", "GOOS/GOARCH build matrix。"],
    ],
    compat: [
      ["Tooling", "modernizer diff", "自動化風險", "自動修改不可直接進 main。", "逐 PR review。"],
      ["Runtime", "GC metrics baseline", "觀測風險", "dashboard threshold 需重校準。", "比較升級前後 metrics。"],
      ["Bootstrap", "Go 1.24.6+ bootstrap", "建置要求", "source build 需更新 bootstrap。", "檢查 builder。"],
    ],
    commands: [
      ["Tools", "Go 1.26 tool changes", "官方段落", "補官方 `Tools` 段落到 Go 指令表，包含 modernizer 與測試 artifact workflow。", "在 review branch 執行，保留 diff 與測試證據。"],
      ["go fix / modernizer", "modernization workflow", "新增/強化", "自動產生現代化 diff。", "先在分支執行。"],
      ["go test", "artifact collection", "新增/強化", "保存測試 artifact。", "檢查 ArtifactDir。"],
      ["go build", "bootstrap Go 1.24.6+", "要求", "自建 toolchain 需更新。", "builder smoke test。"],
    ],
  },
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Fetch failed ${res.statusCode}: ${url}`));
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseReleaseHistory(html) {
  const releases = new Map();
  const h2Regex = /<h2 id="go1\.(\d+)(?:\.0)?">([\s\S]*?)<\/h2>/g;
  const matches = [...html.matchAll(h2Regex)];
  for (let i = 0; i < matches.length; i++) {
    const minor = Number(matches[i][1]);
    if (minor < 1 || minor > 26) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const heading = stripTags(matches[i][2]);
    const date = heading.match(/released\s+([0-9-]+)/)?.[1] ?? "官方未列日期";
    const blockText = stripTags(html.slice(start, end));
    const patchRegex = new RegExp(`(go1\\.${minor}\\.\\d+\\s+(?:\\([^)]*\\)|should)[\\s\\S]*?)(?=\\s+go1\\.${minor}\\.\\d+\\s+(?:\\([^)]*\\)|should)|$)`, "g");
    const patches = [];
    for (const m of blockText.matchAll(patchRegex)) {
      const text = m[1].replace(/\s+/g, " ").trim();
      const version = text.match(new RegExp(`go1\\.${minor}\\.\\d+`))?.[0] ?? `go1.${minor}.x`;
      const patchDate = text.match(/released\s+([0-9-]+)/)?.[1] ?? (text.includes("should not be used") ? "未正式發佈" : "官方未列日期");
      patches.push({
        version,
        date: patchDate,
        summary: text.replace(/^go1\.\d+\.\d+\s+/, "").replace(/See the .+$/, "").trim(),
      });
    }
    releases.set(minor, { date, patches });
  }
  return releases;
}

function parseOfficialSections(html) {
  const matches = [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)];
  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const heading = stripTags(matches[i][2]);
    if (!heading || ["Overview", "Index"].includes(heading)) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const text = stripTags(html.slice(start, end));
    if (!text) continue;
    sections.push({ heading, text });
  }
  return sections.length
    ? sections
    : ["Introduction", "Language", "Tools", "Runtime", "Compiler", "Standard library"].map((heading) => ({ heading, text: "" }));
}

function shortText(text, max = 220) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "官方段落以該版本 release note 可得資訊為準，本頁轉寫為工程導入、風險與驗證觀點。";
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function topicTerms(heading, text) {
  const source = `${heading} ${text}`;
  const raw = [
    ...source.matchAll(/\b(?:GO[A-Z0-9_]+|GODEBUG|GOMAXPROCS|GOMEMLIMIT|GOTOOLCHAIN|GOROOT|GOPATH|GOOS|GOARCH|CGO_ENABLED)\b/g),
    ...source.matchAll(/\b(?:go\s+(?:build|test|vet|mod|env|install|list|work|run|generate|get|tool|fix)|gofmt|cgo|pprof)\b/gi),
    ...source.matchAll(/\b[a-z]+\/[a-z0-9_\/]+(?:\.[A-Za-z0-9_]+)?\b/g),
    ...source.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Z][A-Za-z0-9_]*)+\b/g),
    ...source.matchAll(/\b[A-Z][A-Za-z0-9_]{2,}\b/g),
  ].map((m) => m[0].replace(/\s+/g, " "));
  const unique = [];
  for (const term of raw) {
    if (term === "Go" || unique.includes(term)) continue;
    unique.push(term);
    if (unique.length >= 8) break;
  }
  return unique.length ? unique.join("、") : heading;
}

function engineeringLens(heading, text) {
  const lower = `${heading} ${text}`.toLowerCase();
  if (lower.includes("language") || lower.includes("memory model")) {
    return "以語言語意、編譯相容性與 API 設計規則重寫，導入前要補 compile tests 與範例。";
  }
  if (lower.includes("go command") || lower.includes("tools") || lower.includes("vet") || lower.includes("gofmt")) {
    return "以 CI、Makefile、toolchain policy 與開發者工作流重寫，導入前要跑全量 build/test/vet。";
  }
  if (lower.includes("runtime") || lower.includes("compiler") || lower.includes("linker") || lower.includes("pgo")) {
    return "以效能基線、binary artifact、pprof 與 production-like benchmark 重寫，避免只看編譯結果。";
  }
  if (lower.includes("ports") || lower.includes("windows") || lower.includes("darwin") || lower.includes("linux") || lower.includes("freebsd")) {
    return "以部署平台、GOOS/GOARCH、CI runner 與交叉編譯矩陣重寫，平台差異需實測。";
  }
  if (lower.includes("library") || lower.includes("standard") || lower.includes("crypto") || lower.includes("net/http")) {
    return "以 package API、相容性異動、安全收緊與 regression tests 重寫，避免只列新增名稱。";
  }
  return "以官方段落對應到專案升級 checklist、測試證據與文件更新項目重寫。";
}

function verificationLens(heading, text) {
  const lower = `${heading} ${text}`.toLowerCase();
  if (lower.includes("security") || lower.includes("crypto") || lower.includes("tls") || lower.includes("x509")) {
    return "補安全測試、TLS/crypto smoke test，並採用該 major 版本最後 patch。";
  }
  if (lower.includes("go command") || lower.includes("module") || lower.includes("toolchain")) {
    return "檢查 go.mod、go env、CI image、toolchain pinning 與 scripts diff。";
  }
  if (lower.includes("runtime") || lower.includes("compiler") || lower.includes("performance")) {
    return "保留升級前後 benchmark、pprof、runtime metrics 與 tail latency 比對。";
  }
  if (lower.includes("ports") || lower.includes("cgo") || lower.includes("linker") || lower.includes("bootstrap")) {
    return "跑平台矩陣、cgo/linker smoke test 與 source build/bootstrap 驗證。";
  }
  if (lower.includes("language")) {
    return "補語法範例、compile-time assertion、table tests 與文件化版本界線。";
  }
  return "以 `go test ./...`、重點 package regression tests 與 release-note checklist 驗收。";
}

function officialDetailRows(minor, sections) {
  const selected = sections
    .filter((section) => section.heading && section.text !== undefined)
    .slice(0, 12);
  const source = selected.length ? selected : [{ heading: `Go 1.${minor} official release note`, text: "" }];
  return rows(source.map((section) => [
    section.heading,
    `官方重點：${topicTerms(section.heading, section.text)}。${shortText(section.text, 180)}`,
    engineeringLens(section.heading, section.text),
    verificationLens(section.heading, section.text),
  ]), 4);
}

function phaseFor(minor) {
  return phases.find((p) => minor >= p.range[0] && minor <= p.range[1]) ?? phases.at(-1);
}

function rows(items, cells = 5) {
  return items.map((item) => {
    const padded = [...item, ...Array(Math.max(0, cells - item.length)).fill("官方資料摘要")].slice(0, cells);
    return `<tr>${padded.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`;
  }).join("\n");
}

function patchRows(patches) {
  if (!patches.length) {
    return `<tr><td>無 patch revision</td><td>官方未列</td><td>此 major release 在 Release History 中未列 patch revision。</td><td>仍以官方 release note 與最終 toolchain policy 為準。</td></tr>`;
  }
  return patches.map((patch) => `<tr><td>${esc(patch.version)}</td><td>${esc(patch.date)}</td><td>${esc(patch.summary)}</td><td>升級時優先採該 major 版本最後 patch，並檢查安全修正套件。</td></tr>`).join("\n");
}

function coverageRows(minor, headings) {
  if (releaseData[minor]?.coverage?.length) {
    return rows(releaseData[minor].coverage);
  }
  const normalized = headings;
  const base = normalized.map((heading) => [
    heading,
    "已重寫",
    `依官方 ${heading} 段落重寫為專業報告摘要，並補上工程導入與驗證觀點。`,
    "官方細節重寫 / 新增功能 / 相容性異動 / Go 指令區。",
    heading.toLowerCase().includes("security") || heading.toLowerCase().includes("runtime") ? "中高" : "中",
  ]);
  base.push(["Patch Revisions", "已重寫", `Go 1.${minor} patch revisions 由官方 Release History 擷取並改寫為採用建議。`, "列於 Patch Revisions 區，作為採用最終 patch 的依據。", "中"]);
  return rows(base);
}

function impactRows(data, release) {
  return rows([
    ["新增能力導入", "中", data.value, "過度導入不符合版本定位的功能。", data.focus],
    ["相容性與安全", "中高", data.risk, "舊程式可能依賴已修正或已棄用行為。", "先掃描相容性異動表，再補 regression tests。"],
    ["Go 指令 / CI", "中", `本頁列出 ${data.commands.length} 項指令或工作流變更。`, "Makefile、CI、Dockerfile 可能使用舊參數或舊流程。", "把 Go 指令表轉成 CI checklist。"],
    ["Patch revisions", "中", `官方 Release History 列出 ${release.patches.length} 個 patch revision。`, "停在早期 patch 可能漏掉安全或 runtime 修正。", "採用該 major version 的最後 patch 並記錄理由。"],
    ["部署與觀測", "中", "runtime、network、filesystem、toolchain 變更需要實際部署證據。", "只看編譯成功可能漏掉平台差異。", "執行 smoke test、benchmark 或 observability 比對。"],
  ]);
}

function pageHtml(minor, release, officialSections) {
  const data = releaseData[minor];
  const phase = phaseFor(minor);
  const title = `Go 1.${minor} Release Note 專業整理報告`;
  const officialUrl = `https://go.dev/doc/go1.${minor}`;
  const filename = `go1.${minor}-release-note.html`;
  const headings = officialSections.map((section) => section.heading);
  const performanceNav = data.performance?.length
    ? '      <a class="nav-link" href="#performance-comparison">效能比較</a>\n'
    : "\n";
  const officialDetailNav = minor === 20
    ? ""
    : '      <a class="nav-link" href="#official-detail">官方細節重寫</a>\n';
  const performanceSection = data.performance?.length
    ? `    <section id="performance-comparison">
      <div class="section-head"><h2>效能比較</h2><p>此表整理官方 release note 中明確提到的效能數字、成本變化與建議驗證方式。</p></div>
      <div class="table-wrap"><table><thead><tr><th>官方項目</th><th>升級前狀態 / 背景</th><th>Go 1.${minor} 變化</th><th>官方數字 / 描述</th><th>受影響場景</th><th>驗證指令 / 證據</th></tr></thead><tbody>${rows(data.performance, 6)}</tbody></table></div>
    </section>
`
    : "\n";
  const officialDetailSection = minor === 20
    ? ""
    : `    <section id="official-detail">
      <div class="section-head"><h2>官方段落細節重寫摘要</h2><p>此表把官方 release note 段落轉成專案導入、風險與驗證語言；Go 1.20 以既有完整專業報告為準，其他版本以此表補強深度。</p></div>
      <div class="table-wrap"><table><thead><tr><th>官方段落</th><th>官方重點整理</th><th>工程解讀</th><th>驗證 / 導入動作</th></tr></thead><tbody>${officialDetailRows(minor, officialSections)}</tbody></table></div>
    </section>
`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Golang 學習筆記</title>
  <style>
    :root { --bg:#f5f7fa; --paper:#fff; --ink:#172033; --muted:#5f6d7e; --line:#d7e0ea; --head:#eaf0f6; --accent:#0f766e; --blue:#1d4ed8; --warn:#b45309; --risk:#be123c; --ok:#15803d; --code:#eef2f7; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif; line-height:1.64; }
    a { color:var(--blue); text-decoration:none; } a:hover,a:focus-visible { text-decoration:underline; }
    header { border-bottom:1px solid var(--line); background:#fff; }
    .hero, main { width:min(1180px, calc(100% - 32px)); margin:0 auto; }
    .hero { padding:34px 0 26px; }
    .crumbs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; color:var(--muted); font-size:14px; }
    .report-kicker { margin:0 0 8px; color:var(--accent); font-size:13px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
    h1 { max-width:980px; margin:0; color:#1f2937; font-size:clamp(31px,4.8vw,52px); line-height:1.08; letter-spacing:0; }
    .lead { max-width:920px; margin:14px 0 0; color:var(--muted); font-size:18px; }
    .meta-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    .meta { display:inline-flex; align-items:center; min-height:30px; padding:4px 9px; border:1px solid var(--line); border-radius:6px; background:#f8fafc; color:#334155; font-size:13px; font-weight:800; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0 0; }
    .summary-card { min-height:130px; padding:14px; border:1px solid var(--line); border-radius:8px; background:#fff; }
    .summary-card h3 { margin:0 0 8px; color:#1f2937; font-size:15px; }
    .summary-card p { margin:0; color:var(--muted); font-size:14px; }
    .metric { display:block; margin-bottom:6px; color:var(--accent); font-size:26px; font-weight:900; line-height:1; }
    main { padding:24px 0 60px; }
    nav { position:sticky; top:0; z-index:3; display:flex; flex-wrap:wrap; gap:8px; padding:10px 0; background:rgba(245,247,250,.96); border-bottom:1px solid var(--line); backdrop-filter:blur(8px); }
    .nav-link { display:inline-flex; align-items:center; min-height:34px; padding:6px 10px; border:1px solid var(--line); border-radius:6px; background:#fff; color:#253244; font-size:14px; font-weight:800; text-decoration:none; }
    section { margin:24px 0; scroll-margin-top:72px; }
    .section-head { margin-bottom:12px; } .section-head h2 { margin:0; color:#1f2937; font-size:26px; } .section-head p { margin:5px 0 0; color:var(--muted); }
    .report-note { display:grid; grid-template-columns:minmax(240px,.42fr) minmax(0,1fr); gap:16px; align-items:stretch; margin-top:16px; }
    .panel { border:1px solid var(--line); border-radius:8px; background:var(--paper); overflow:hidden; } .panel-body { padding:18px; }
    .status-pill { display:inline-flex; align-items:center; justify-content:center; min-height:28px; padding:4px 9px; border-radius:999px; background:#e8f7ed; color:var(--ok); font-size:12px; font-weight:900; white-space:nowrap; }
    .table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; background:#fff; }
    table { width:100%; min-width:900px; border-collapse:collapse; background:#fff; }
    th,td { padding:11px 12px; border:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--head); color:#334155; font-size:13px; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
    td { color:#2f3a48; overflow-wrap:anywhere; word-break:break-word; }
    .summary-table { min-width:0; table-layout:fixed; } .summary-table th,.summary-table td { padding:12px 14px; font-size:15px; line-height:1.55; }
    .summary-table col:nth-child(1){width:18%;}.summary-table col:nth-child(2){width:47%;}.summary-table col:nth-child(3){width:35%;}
    .tag { display:inline-flex; align-items:center; min-height:24px; padding:2px 8px; border-radius:5px; background:#e6f3f1; color:var(--accent); font-size:12px; font-weight:800; white-space:nowrap; }
    .tag.blue{background:#e8f0ff;color:var(--blue)} .tag.warn{background:#fff3d9;color:var(--warn)} .tag.risk{background:#ffe6eb;color:var(--risk)} .tag.ok{background:#e8f7ed;color:var(--ok)}
    code { padding:1px 5px; border-radius:5px; background:var(--code); color:#111827; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.92em; }
    .footer { margin-top:28px; padding:14px 16px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--muted); }
    @media (max-width:820px){ .hero,main{width:min(100% - 24px,1180px)} .summary-grid{grid-template-columns:1fr 1fr} .report-note{grid-template-columns:1fr} table{min-width:760px} .summary-table{min-width:0} .summary-table th,.summary-table td{padding:10px 11px;font-size:14px} .lead{font-size:16px} }
    @media (max-width:560px){ .summary-grid{grid-template-columns:1fr} .summary-table col:nth-child(1){width:24%}.summary-table col:nth-child(2){width:38%}.summary-table col:nth-child(3){width:38%} }
  </style>
</head>
<body>
  <header>
    <div class="hero">
      <div class="crumbs"><a href="../docs/index.html">主頁教程</a><span>/</span><a href="index.html">ReleaseNote Index</a><span>/</span><span>Go 1.${minor}</span></div>
      <p class="report-kicker">Professional Technical Review Report</p>
      <h1>${title}</h1>
      <p class="lead">${esc(data.positioning)} 本頁把官方 release note 與 release history 轉成工程導入、風險與驗收清單。</p>
      <div class="meta-row">
        <span class="meta">報告版本：v2026.05.13</span>
        <span class="meta">生成時間：${GENERATED_AT}</span>
        <span class="meta">Major release：Go 1.${minor}（${esc(release.date)}）</span>
        <span class="meta">官方來源：${officialUrl}</span>
        <span class="meta">Patch revisions：${release.patches.length}</span>
      </div>
      <div class="summary-grid">
        <div class="summary-card"><span class="metric">${data.added.length}</span><h3>新增能力項目</h3><p>語言、工具鏈、runtime/compiler、stdlib 與平台能力摘要。</p></div>
        <div class="summary-card"><span class="metric">${data.compat.length}</span><h3>相容性風險</h3><p>升級時需檢查的破壞性、棄用、預設行為與安全變更。</p></div>
        <div class="summary-card"><span class="metric">${data.commands.length}</span><h3>Go 指令變更</h3><p>整理 build、test、vet、module、toolchain 或 bootstrap 工作流。</p></div>
        <div class="summary-card"><span class="metric">${release.patches.length}</span><h3>Patch Revisions</h3><p>由官方 Release History 擷取，作為採用最終 patch 的依據。</p></div>
      </div>
    </div>
  </header>
  <main>
    <nav aria-label="Go 1.${minor} Release Note Navigation">
      <a class="nav-link" href="../docs/index.html">主頁教程</a>
      <a class="nav-link" href="#executive-summary">摘要</a>
      <a class="nav-link" href="#overview">總覽</a>
      <a class="nav-link" href="#impact-matrix">影響矩陣</a>
${performanceNav}\
      <a class="nav-link" href="#official-coverage">官方覆蓋矩陣</a>
${officialDetailNav}\
      <a class="nav-link" href="#added">新增功能</a>
      <a class="nav-link" href="#removed">移除/棄用</a>
      <a class="nav-link" href="#commands">Go 指令</a>
      <a class="nav-link" href="#patch-revisions">Patch Revisions</a>
      <a class="nav-link" href="#migration-plan">導入計畫</a>
      <a class="nav-link" href="#verification">驗證</a>
      <a class="nav-link" href="#troubleshooting">排錯</a>
      <a class="nav-link" href="${officialUrl}">官方文件</a>
    </nav>
    <section id="executive-summary">
      <div class="section-head"><h2>Executive Summary</h2><p>本版本報告定位在工程導入與升級審查，不是官方逐字翻譯。</p></div>
      <div class="report-note">
        <div class="panel"><div class="panel-body"><span class="status-pill">建議用途：${esc(data.phase)}</span><strong>版本定位</strong><p>${esc(data.value)}</p></div></div>
        <div class="table-wrap">
          <table class="summary-table"><colgroup><col><col><col></colgroup><thead><tr><th>審查面向</th><th>結論</th><th>必要動作</th></tr></thead><tbody>
            <tr><td>專案價值</td><td>${esc(data.value)}</td><td>${esc(data.focus)}</td></tr>
            <tr><td>主要風險</td><td>${esc(data.risk)}</td><td>把風險項目轉成 CI、測試與部署 checklist。</td></tr>
            <tr><td>版本階段</td><td>${esc(phase.name)}：${esc(phase.summary)}</td><td>用分期脈絡判斷是否需要回補歷史教材。</td></tr>
            <tr><td>驗收標準</td><td>需通過 build、test、版本來源連結、patch revision 與本地 HTML 結構檢查。</td><td>在 release PR 或教學更新紀錄中列出證據。</td></tr>
          </tbody></table>
        </div>
      </div>
    </section>
    <section id="overview">
      <div class="section-head"><h2>技術總覽</h2><p>Go 1.${minor} 屬於 ${esc(data.phase)}，下列主題是本頁的工程導入重點。</p></div>
      <div class="table-wrap"><table><thead><tr><th>主題</th><th>重點</th><th>工程意義</th></tr></thead><tbody>
        <tr><td><span class="tag">Version</span></td><td>Go 1.${minor} released ${esc(release.date)}</td><td>以 major release note 為主，patch revisions 作為安全與 bugfix 補充。</td></tr>
        <tr><td><span class="tag blue">Phase</span></td><td>${esc(phase.name)}</td><td>${esc(phase.summary)}</td></tr>
        <tr><td><span class="tag warn">Adoption</span></td><td>${esc(data.focus)}</td><td>升級時應轉成測試、CI 與文件驗收項目。</td></tr>
      </tbody></table></div>
    </section>
    <section id="impact-matrix">
      <div class="section-head"><h2>升級影響矩陣</h2><p>此矩陣把版本重點轉成專案升級時的影響、風險與處置方式。</p></div>
      <div class="table-wrap"><table><thead><tr><th>影響領域</th><th>影響等級</th><th>主要價值</th><th>主要風險</th><th>建議處置</th></tr></thead><tbody>${impactRows(data, release)}</tbody></table></div>
    </section>
${performanceSection}\
    <section id="official-coverage">
      <div class="section-head"><h2>官方段落覆蓋矩陣</h2><p>此矩陣依官方 release note 段落標題與 Release History 補齊狀態整理。</p></div>
      <div class="table-wrap"><table><thead><tr><th>官方段落</th><th>本頁狀態</th><th>整理方式</th><th>落地區域</th><th>風險等級</th></tr></thead><tbody>${coverageRows(minor, headings)}</tbody></table></div>
    </section>
${officialDetailSection}\
    <section id="added">
      <div class="section-head"><h2>條列式表格分析：新增功能列表</h2><p>整理 Go 1.${minor} 值得納入教材與專案升級清單的新能力。</p></div>
      <div class="table-wrap"><table><thead><tr><th>分類</th><th>新增功能 / 行為</th><th>功能說明</th><th>工程導入建議</th><th>驗證方式</th></tr></thead><tbody>${rows(data.added)}</tbody></table></div>
    </section>
    <section id="removed">
      <div class="section-head"><h2>條列式表格分析：移除 / 棄用 / 相容性異動列表</h2><p>列出本版本升級時需要特別確認的相容性、預設行為、安全或平台風險。</p></div>
      <div class="table-wrap"><table><thead><tr><th>分類</th><th>項目</th><th>狀態</th><th>影響</th><th>替代方式 / 建議</th></tr></thead><tbody>${rows(data.compat)}</tbody></table></div>
    </section>
    <section id="commands">
      <div class="section-head"><h2>條列式表格分析：Go 指令新增 / 移除功能</h2><p>整理 Go command、build、test、vet、module、toolchain 或 bootstrap 相關變更。</p></div>
      <div class="table-wrap"><table><thead><tr><th>指令 / 範圍</th><th>新增 / 移除 / 變更</th><th>類型</th><th>用途 / 影響</th><th>範例 / 替代方式</th></tr></thead><tbody>${rows(data.commands)}</tbody></table></div>
    </section>
    <section id="patch-revisions">
      <div class="section-head"><h2>Patch Revisions</h2><p>以下由官方 Release History 擷取。實務採用時，通常應選該 major version 的最後 patch。</p></div>
      <div class="table-wrap"><table><thead><tr><th>Patch</th><th>日期</th><th>官方摘要</th><th>工程建議</th></tr></thead><tbody>${patchRows(release.patches)}</tbody></table></div>
    </section>
    <section id="migration-plan">
      <div class="section-head"><h2>專案導入計畫</h2><p>用四階段把版本資訊轉成可驗收的專案升級流程。</p></div>
      <div class="table-wrap"><table><thead><tr><th>階段</th><th>工作項目</th><th>驗收證據</th><th>風險處置</th></tr></thead><tbody>
        <tr><td>Phase 1：版本盤點</td><td>確認目前 toolchain、module go directive、CI image 與部署平台。</td><td><code>go version</code>、<code>go env</code>、CI 設定。</td><td>舊版環境先隔離驗證。</td></tr>
        <tr><td>Phase 2：功能導入</td><td>只導入本頁列出的高價值功能，不做無關重構。</td><td>對應測試與範例。</td><td>每個功能以小 PR 驗證。</td></tr>
        <tr><td>Phase 3：相容性清理</td><td>處理移除、棄用、安全收緊與指令變更。</td><td>CI 綠燈與風險清單。</td><td>保留 rollback branch。</td></tr>
        <tr><td>Phase 4：發布紀錄</td><td>記錄 major release 與 patch revisions 採用依據。</td><td>Release note、更新資料、測試輸出。</td><td>不以口頭結論取代證據。</td></tr>
      </tbody></table></div>
    </section>
    <section id="verification">
      <div class="section-head"><h2>Verification</h2><p>本頁生成後可用以下檢查確認內容完整。</p></div>
      <div class="table-wrap"><table><thead><tr><th>檢查項</th><th>指令</th><th>預期</th></tr></thead><tbody>
        <tr><td>本頁存在</td><td><code>test -s ReleaseNote/${filename}</code></td><td>檔案非空。</td></tr>
        <tr><td>必要區塊存在</td><td><code>rg -n "Executive Summary|官方段落覆蓋矩陣|新增功能列表|Patch Revisions" ReleaseNote/${filename}</code></td><td>所有報告區塊存在。</td></tr>
        <tr><td>官方來源存在</td><td><code>rg -n "${officialUrl}" ReleaseNote/${filename}</code></td><td>官方來源連結存在。</td></tr>
        <tr><td>格式檢查</td><td><code>git diff --check -- ReleaseNote/${filename}</code></td><td>無 trailing whitespace。</td></tr>
      </tbody></table></div>
    </section>
    <section id="troubleshooting">
      <div class="section-head"><h2>Troubleshooting</h2><p>升級 Go 1.${minor} 常見問題處理方式。</p></div>
      <div class="table-wrap"><table><thead><tr><th>症狀</th><th>可能原因</th><th>處理方式</th></tr></thead><tbody>
        <tr><td>升級後 CI 失敗</td><td>Go command、module、toolchain 或平台行為變更。</td><td>先比對本頁 Go 指令與相容性異動表。</td></tr>
        <tr><td>測試變 flaky</td><td>runtime、time、scheduler、network 或 filesystem 行為被修正。</td><td>重跑 <code>-count=1</code>、race test，並隔離外部依賴。</td></tr>
        <tr><td>部署環境無法啟動</td><td>OS、architecture、cgo、linker 或憑證環境差異。</td><td>建立平台 matrix 與最小 smoke test。</td></tr>
      </tbody></table></div>
    </section>
    <section id="best-practices">
      <div class="section-head"><h2>Best Practices</h2><p>把 release note 轉成可維護工程流程。</p></div>
      <div class="table-wrap"><table><thead><tr><th>建議</th><th>原因</th><th>落地方式</th></tr></thead><tbody>
        <tr><td>每次升級都保留官方來源</td><td>避免文件與官方事實漂移。</td><td>頁尾與索引保留 go.dev 連結。</td></tr>
        <tr><td>Patch revisions 不獨立成頁</td><td>major version 才是教學與升級主體。</td><td>patch 摘要收斂到本頁表格。</td></tr>
        <tr><td>以測試證據收斂風險</td><td>release note 不是成功升級的證據。</td><td>build、test、vet、smoke、benchmark 依版本風險選用。</td></tr>
      </tbody></table></div>
    </section>
    <p class="footer">資料來源：<a href="${officialUrl}">Go 1.${minor} Release Notes</a> 與 <a href="${OFFICIAL_HISTORY}">Go Release History</a>。本頁為 Traditional Chinese 工程整理報告，非官方逐字翻譯。</p>
  </main>
</body>
</html>
`;
}

function roadmapHtml() {
  return roadmapStages.map((stage, index) => {
    const versions = stage.versions.map((minor) => `<a href="#go1${minor}">Go 1.${minor}</a>`).join("");
    const points = stage.points.map((point) => `<li>${esc(point)}</li>`).join("");
    return `<article class="roadmap-stage">
          <div class="roadmap-top"><span class="roadmap-index">${String(index + 1).padStart(2, "0")}</span><span class="phase">${esc(stage.phase)}</span></div>
          <h3>${esc(stage.title)}</h3>
          <p class="roadmap-years">${esc(stage.years)} · ${stage.versions.length} 個 major release</p>
          <p>${esc(stage.summary)}</p>
          <div class="roadmap-versions">${versions}</div>
          <ul class="roadmap-points">${points}</ul>
        </article>`;
  }).join("\n");
}

function supportStatusHtml() {
  const versions = Array.from({ length: 26 }, (_, i) => i + 1);
  const supported = new Set(supportStatus.supported);
  const x0 = 58;
  const y = 222;
  const gap = 41;
  const w = 36;
  const h = 30;
  const supportedStartIndex = versions.indexOf(supportStatus.supported[0]);
  const supportedEndIndex = versions.indexOf(supportStatus.supported.at(-1));
  const supportedStartX = x0 + supportedStartIndex * gap + w / 2;
  const supportedEndX = x0 + supportedEndIndex * gap + w / 2;
  const supportWindowX = x0 + supportedStartIndex * gap;
  const supportWindowEndX = x0 + supportedEndIndex * gap + w;
  const nodes = versions.map((minor, index) => {
    const isSupported = supported.has(minor);
    const isCurrent = minor === supportStatus.supported.at(-1);
    const fill = isSupported ? (isCurrent ? "#0f766e" : "#16a34a") : "#fef2f2";
    const stroke = isSupported ? "#0f766e" : "#ef4444";
    const color = isSupported ? "#ffffff" : "#991b1b";
    const status = isSupported ? "目前支援" : "不支援";
    const x = x0 + index * gap;
    return `<a href="#go1${minor}" aria-label="Go 1.${minor} ${status}">
              <g id="support-go1-${minor}">
                <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" />
                <text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="800" fill="${color}">1.${minor}</text>
              </g>
            </a>`;
  }).join("\n");

  return `<section id="support-status">
      <h2>目前支援版本 SVG 圖表</h2>
      <p class="section-note">依官方 Go Release Policy 與 Release History 判定；狀態日期：${supportStatus.asOf}，完整查核時間：${supportStatus.verifiedAt}，最新 patch：${supportStatus.latestPatch}。Go ReleaseNote freshness evidence：${supportStatus.sourceEvidence}</p>
      <div class="support-svg-wrap">
        <svg id="support-status-chart" class="support-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" role="img" aria-labelledby="support-chart-title support-chart-desc">
          <title id="support-chart-title">Go 1.1 到 Go 1.26 支援狀態圖表</title>
          <desc id="support-chart-desc">Go 1.25 和 Go 1.26 為目前支援版本；Go 1.1 到 Go 1.24 為不支援版本。</desc>
          <g id="legend">
            <rect x="40" y="26" width="18" height="18" rx="4" fill="#16a34a" />
            <text x="66" y="40" font-size="14" font-weight="800" fill="#172033">目前支援：Go 1.25 - Go 1.26</text>
            <rect x="332" y="26" width="18" height="18" rx="4" fill="#fef2f2" stroke="#ef4444" />
            <text x="358" y="40" font-size="14" font-weight="800" fill="#991b1b">不支援：Go 1.1 - Go 1.24</text>
          </g>
          <g id="summary">
            <rect x="40" y="70" width="340" height="86" rx="8" fill="#ecfdf5" stroke="#bbf7d0" />
            <text x="62" y="100" font-size="20" font-weight="900" fill="#0f766e">目前支援版本</text>
            <text x="62" y="128" font-size="16" fill="#172033">Go 1.25、Go 1.26</text>
            <text x="62" y="148" font-size="12" fill="#526173">仍接收必要的 minor revision 與安全修正</text>
            <rect x="410" y="70" width="340" height="86" rx="8" fill="#fef2f2" stroke="#ef4444" />
            <text x="432" y="100" font-size="20" font-weight="900" fill="#991b1b">不支援版本</text>
            <text x="432" y="128" font-size="16" fill="#172033">Go 1.1 - Go 1.24</text>
            <text x="432" y="148" font-size="12" fill="#526173">升級評估時應規劃跳版與相容性測試</text>
            <rect x="780" y="70" width="380" height="86" rx="8" fill="#eff6ff" stroke="#bfdbfe" />
            <text x="802" y="100" font-size="20" font-weight="900" fill="#1d4ed8">判定規則</text>
            <text x="802" y="128" font-size="14" fill="#172033">major release 支援到已有兩個更新 major release 為止</text>
            <text x="802" y="148" font-size="12" fill="#526173">來源：go.dev/doc/devel/release</text>
          </g>
          <g id="timeline">
            <line x1="${x0 + w / 2}" y1="${y + h / 2}" x2="${x0 + (versions.length - 1) * gap + w / 2}" y2="${y + h / 2}" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
            <line x1="${supportedStartX}" y1="${y + h / 2}" x2="${supportedEndX}" y2="${y + h / 2}" stroke="#16a34a" stroke-width="6" stroke-linecap="round" />
            <text x="58" y="204" font-size="13" font-weight="900" fill="#991b1b">不支援版本</text>
            <text x="1038" y="204" font-size="13" font-weight="900" fill="#0f766e">支援窗口</text>
            <g id="version-nodes">
              ${nodes}
            </g>
            <path d="M ${supportWindowX} ${y + 58} L ${supportWindowEndX} ${y + 58}" stroke="#0f766e" stroke-width="3" stroke-linecap="round" />
            <text x="${supportWindowX - 10}" y="${y + 84}" font-size="13" font-weight="900" fill="#0f766e">目前安全修正窗口</text>
          </g>
          <g id="risk-note">
            <rect x="40" y="326" width="1120" height="36" rx="8" fill="#fff7ed" stroke="#fed7aa" />
            <text x="60" y="349" font-size="14" fill="#9a3412">工程建議：生產專案若仍在 Go 1.24 或更早版本，應優先規劃升級至 Go 1.25/1.26，並用 build、test、vet、benchmark 與 rollback 計畫收斂風險。</text>
          </g>
        </svg>
      </div>
      <div class="support-source">官方來源：<a href="${OFFICIAL_HISTORY}">Go Release History / Release Policy</a>。official Go Release History verified：${supportStatus.verifiedAt}；latest patch tokens：${supportStatus.latestPatchTokens.join(" / ")}。</div>
    </section>`;
}

function indexHtml(releases) {
  const versions = Array.from({ length: 26 }, (_, i) => i + 1);
  const cards = versions.map((minor) => {
    const data = releaseData[minor];
    const release = releases.get(minor) ?? { date: "官方未列日期", patches: [] };
    return `<article class="version-card" id="go1${minor}">
      <div><span class="phase">${esc(data.phase)}</span><h2>Go 1.${minor}</h2><p>${esc(data.positioning)}</p></div>
      <table><tbody>
        <tr><th>Release date</th><td>${esc(release.date)}</td></tr>
        <tr><th>Patch revisions</th><td>${release.patches.length}</td></tr>
        <tr><th>導入重點</th><td>${esc(data.focus)}</td></tr>
      </tbody></table>
      <div class="actions"><a href="go1.${minor}-release-note.html">本地專業報告</a><a href="https://go.dev/doc/go1.${minor}">官方文件</a></div>
    </article>`;
  }).join("\n");
  const nav = `<a href="../docs/index.html">主頁教程</a><a href="#roadmap">Roadmap</a><a href="#support-status">Support</a>` + versions.map((minor) => `<a href="#go1${minor}">Go 1.${minor}</a>`).join("");
  const matrix = versions.map((minor) => {
    const data = releaseData[minor];
    const release = releases.get(minor) ?? { date: "官方未列日期", patches: [] };
    return `<tr><td>Go 1.${minor}</td><td>${esc(release.date)}</td><td>${esc(data.phase)}</td><td>${esc(data.focus)}</td><td><a href="go1.${minor}-release-note.html">報告</a></td></tr>`;
  }).join("\n");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Go 1.1-1.26 Release Note 專業整理報告索引 | Golang 學習筆記</title>
  <style>
    :root{--bg:#f5f7fa;--paper:#fff;--ink:#172033;--muted:#5f6d7e;--line:#d7e0ea;--head:#eaf0f6;--accent:#0f766e;--blue:#1d4ed8}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif;line-height:1.62}
    a{color:var(--blue);text-decoration:none} a:hover{text-decoration:underline}
    header,main{width:min(1200px,calc(100% - 32px));margin:0 auto} header{padding:34px 0 20px}
    h1{margin:0;font-size:clamp(32px,5vw,56px);line-height:1.08}.lead{max-width:900px;color:var(--muted);font-size:18px}
    .meta-row,.nav{display:flex;flex-wrap:wrap;gap:8px}.meta,.nav a,.actions a{display:inline-flex;align-items:center;min-height:30px;padding:5px 10px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px;font-weight:800}
    .nav{position:sticky;top:0;z-index:2;padding:10px 0;background:rgba(245,247,250,.95);border-bottom:1px solid var(--line)}
    section{margin:24px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .section-note{max-width:900px;color:var(--muted)}
    .roadmap{overflow-x:auto;padding-bottom:4px}.roadmap-track{display:grid;grid-template-columns:repeat(4,minmax(250px,1fr));gap:12px;min-width:1040px}
    .roadmap-stage{position:relative;min-width:0;border:1px solid var(--line);border-radius:8px;background:#fff;padding:14px}.roadmap-stage:before{content:"";position:absolute;left:18px;right:18px;top:54px;height:4px;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--blue));opacity:.78}
    .roadmap-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.roadmap-index{display:inline-flex;align-items:center;justify-content:center;width:34px;height:28px;border-radius:999px;background:var(--ink);color:#fff;font-size:12px;font-weight:900;line-height:1}
    .roadmap-stage h3{margin:24px 0 4px;font-size:19px;line-height:1.25}.roadmap-stage p{margin:8px 0;color:var(--muted)}.roadmap-years{font-size:13px;font-weight:800;color:var(--ink)}
    .roadmap-versions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.roadmap-versions a{display:inline-flex;align-items:center;min-height:26px;padding:3px 8px;border:1px solid var(--line);border-radius:999px;background:#f8fafc;font-size:12px;font-weight:800}
    .roadmap-points{margin:12px 0 0;padding-left:18px;color:var(--muted)}.roadmap-points li{margin:4px 0;overflow-wrap:anywhere}
    .support-svg-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#fff;padding:10px}.support-svg{display:block;width:100%;min-width:1040px;height:auto}.support-source{margin-top:8px;color:var(--muted);font-size:13px}
    .version-card{min-width:0;border:1px solid var(--line);border-radius:8px;background:#fff;padding:16px}.version-card h2{margin:6px 0 8px}.version-card p{color:var(--muted)}
    .phase{display:inline-flex;max-width:100%;padding:3px 8px;border-radius:999px;background:#e6f3f1;color:var(--accent);font-size:12px;font-weight:900;line-height:1.35;white-space:normal;overflow-wrap:anywhere}
    .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    table{width:100%;border-collapse:collapse}.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#fff}.table-wrap table{min-width:860px}
    .version-card table{min-width:0;table-layout:fixed;margin-top:12px}.version-card th{width:152px}.version-card th,.version-card td{white-space:normal;word-break:break-word;overflow-wrap:anywhere}
    th,td{padding:10px 12px;border:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere} th{background:var(--head)}
    @media(max-width:760px){header,main{width:min(100% - 24px,1200px)}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <h1>Go 1.1-1.26 Release Note 專業整理報告索引</h1>
    <p class="lead">依官方 Go Release History 與各版本 Release Notes 建立 26 份 major-version 獨立專業整理報告。最新 major 版本為 Go 1.26，最新 patch 狀態記錄至 Go 1.26.5（2026-07-07）；Go ReleaseNote freshness evidence 已於 ${supportStatus.verifiedAt} 重新核對官方來源，確認 baseline 維持 ${supportStatus.latestPatchTokens.join(" / ")}。</p>
    <div class="meta-row"><span class="meta">範圍：Go 1.1 - Go 1.26</span><span class="meta">報告數：26</span><span class="meta">生成時間：${GENERATED_AT}</span><span class="meta">來源：go.dev 官方文件</span><span class="meta">official Go Release History verified：${supportStatus.verifiedAt}</span></div>
  </header>
  <main>
    <nav class="nav" aria-label="Release roadmap and versions">${nav}</nav>
    <section id="roadmap">
      <h2>Roadmap 圖表</h2>
      <p class="section-note">以 Go 1.1 到 Go 1.26 的 release note 主題分期呈現，協助判斷教材、專案升級與 CI/CD 驗證的演進路線。</p>
      <div class="roadmap"><div class="roadmap-track">${roadmapHtml()}</div></div>
    </section>
    ${supportStatusHtml()}
    <section>
      <h2>版本功能矩陣</h2>
      <div class="table-wrap"><table><thead><tr><th>版本</th><th>日期</th><th>階段</th><th>導入重點</th><th>本地頁</th></tr></thead><tbody>${matrix}</tbody></table></div>
    </section>
    <section>
      <h2>獨立版本報告</h2>
      <div class="grid">${cards}</div>
    </section>
    <section>
      <h2>分期說明</h2>
      <div class="table-wrap"><table><thead><tr><th>分期</th><th>版本範圍</th><th>工程意義</th></tr></thead><tbody>${phases.map((p) => `<tr><td>${esc(p.name)}</td><td>Go 1.${p.range[0]} - Go 1.${p.range[1]}</td><td>${esc(p.summary)}</td></tr>`).join("")}</tbody></table></div>
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const historyHtml = await fetchText(OFFICIAL_HISTORY);
  const releases = parseReleaseHistory(historyHtml);
  const officialSectionMap = new Map();
  const minors = Array.from({ length: 26 }, (_, i) => i + 1);
  for (const minor of minors) {
    const url = `https://go.dev/doc/go1.${minor}`;
    try {
      const html = await fetchText(url);
      officialSectionMap.set(minor, parseOfficialSections(html));
    } catch {
      officialSectionMap.set(minor, parseOfficialSections("<h2>Introduction</h2><p>官方文件暫時無法讀取，保留本地結構化專業報告。</p><h2>Major changes</h2><p>依本地 releaseData 與 Release History 整理。</p><h2>Tools</h2><p>工具鏈與命令列變更以官方 release note 為準。</p><h2>Standard library</h2><p>標準庫變更以官方 release note 為準。</p>"));
    }
  }
  for (const minor of minors) {
    const release = releases.get(minor) ?? { date: "官方未列日期", patches: [] };
    const html = pageHtml(minor, release, officialSectionMap.get(minor) ?? []);
    fs.writeFileSync(path.join(OUT_DIR, `go1.${minor}-release-note.html`), html);
  }
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexHtml(releases));
  console.log("generated release notes:", minors.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
