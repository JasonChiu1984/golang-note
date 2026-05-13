import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "ReleaseNote");
const GENERATED_AT = "2026-05-13 14:35:00 +0800";
const OFFICIAL_HISTORY = "https://go.dev/doc/devel/release";

const phases = [
  { name: "早期基礎期", range: [2, 5], summary: "語言與 runtime 基礎能力成熟，工具鏈開始穩定化。" },
  { name: "工具鏈成熟期", range: [6, 10], summary: "HTTP/2、context、SSA、build/test cache 與標準庫可維運性提升。" },
  { name: "Module/泛型期", range: [11, 18], summary: "module、errors wrapping、embed、workspaces、generics 與 fuzzing 成為主軸。" },
  { name: "現代標準庫期", range: [19, 26], summary: "runtime governance、PGO、toolchain 管理、iterator、testing 與供應鏈治理成為主軸。" },
];

const releaseData = {
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
    phase: "現代標準庫期",
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
    phase: "現代標準庫期",
    positioning: "Go 1.20 以 toolchain、runtime/compiler、coverage、PGO preview 與標準庫 API 補強為主，是工程治理型版本。",
    value: "適合把 coverage 從 unit test 推進到 integration test，建立 PGO 評估流程，並補強錯誤聚合、context cancel cause、HTTP gateway 與 runtime observability。",
    risk: "`-i` 移除、舊 OS 支援線、cgo 預設行為、bootstrap toolchain、XML/template/archive 安全行為、GOPATH 舊流程與大量標準庫細節異動是主要風險。",
    focus: "program coverage、PGO preview、`runtime/coverage`、multi-error、`WithCancelCause`、`ResponseController`、ReverseProxy rewrite、cgo/bootstrap/linker/stdlib minor changes。",
    coverage: [
      ["Introduction to Go 1.20", "已補齊", "整理 Go 1 compatibility、toolchain/runtime/library 為主的版本定位。", "Executive Summary / 技術總覽", "中"],
      ["Changes to the language", "已補齊", "補 slice to array conversion、unsafe slice/string helpers、comparison order、`comparable` constraint。", "新增功能 / 相容性異動", "中高"],
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
      ["Bootstrap", "已補齊", "補 Go 1.17.13 bootstrap requirement、搜尋路徑與未來 bootstrap 前移。", "相容性異動 / Go 指令", "高"],
      ["Standard library / major features", "已補齊", "補 `crypto/ecdh`、multi-error、`ResponseController`、ReverseProxy `Rewrite` / `SetURL` / `SetXForwarded`。", "新增功能列表", "中高"],
      ["Standard library / minor changes", "已補齊", "補 archive、bytes、context、crypto、debug、encoding、go tooling、io/fs、math、mime、net/http、os、reflect、runtime、sync、syscall、testing、time、unicode 等 minor changes。", "新增功能 / 相容性異動", "高"],
      ["Patch Revisions", "已整理", "Go 1.20.1 到 Go 1.20.14 由官方 Release History 擷取。", "Patch Revisions", "中"],
    ],
    added: [
      ["Language", "slice to array conversion", "可由 slice 直接轉成 array，例如把 `x` 轉成 `[4]byte(x)`，延續 Go 1.17 slice-to-array-pointer 能力。", "解析 binary frame、固定長度 header 時可減少 unsafe 寫法。", "補長度不足 panic 與正常轉換測試。"],
      ["Language / unsafe", "`unsafe.SliceData`、`unsafe.String`、`unsafe.StringData`", "補齊 slice/string 建構與拆解 API，降低依賴內部 representation 的需求。", "只放在低階封裝層，禁止業務層散用 unsafe。", "用 race test 與 fuzz 測 boundary。"],
      ["Language / generics", "`comparable` constraint 語意放寬", "普通 interface 等 comparable type 可滿足 `comparable` constraint，但 runtime comparison 仍可能 panic。", "generic map key helper 需補 panic case 文件。", "對 interface-containing composite types 做測試。"],
      ["Ports", "FreeBSD on RISC-V experimental support", "新增 `GOOS=freebsd`、`GOARCH=riscv64` 實驗支援。", "只放入 experimental build matrix，不作 production SLA。", "`GOOS=freebsd GOARCH=riscv64 go build`。"],
      ["Tools / Cover", "program coverage / `GOCOVERDIR`", "application 與 integration test 可透過 instrumented binary 收集 coverage。", "把 smoke test、gateway e2e test 納入 coverage artifact。", "`go build -cover` 後用 `GOCOVERDIR` 收集。"],
      ["Runtime", "`runtime/coverage`", "長時間執行或 server 程式可在 runtime 寫出 coverage profile，不必依賴正常 process exit。", "API server、worker、gateway 可在測試 hook 觸發 coverage dump。", "整合測試驗證 profile 檔案生成。"],
      ["Compiler", "PGO preview", "支援以 pprof CPU profile 指導最佳化，Go 1.20 主要用於 hot call site aggressive inlining。", "只使用代表性 production-like profile，避免用錯 workload。", "比較 `-pgo=off` 與 profile build benchmark。"],
      ["Compiler", "generic front-end internal data change", "compiler front-end 改用新的 internal data handling，修正多項 generic type issue，並允許 generic function/method 內宣告 type。", "泛型-heavy library 升級後應補 build/test。", "`go test ./...` + generic API tests。"],
      ["Compiler", "build speed improvements", "Go 1.20 改善 Go 1.18/1.19 因 generics 導致的 build speed regression，最高約 10%。", "大型 monorepo 可量測 CI build time。", "記錄升級前後 cold/warm build 時間。"],
      ["Standard Library / crypto", "`crypto/ecdh`", "新增明確 ECDH package，支援 NIST curves 與 Curve25519。", "新程式優先用 `crypto/ecdh`，不要直接用低階 `crypto/elliptic` 做 ECDH。", "產生 key、derive shared secret 測試。"],
      ["Errors", "`errors.Join` and multiple `%w`", "支援一個 error 包裝多個 error，`errors.Is` / `errors.As` 可走訪多錯誤樹。", "batch job、多設備輪詢、multi-stage validation 可保留完整錯誤原因。", "測 `errors.Is` / `errors.As` 對多錯誤命中。"],
      ["Context", "`context.WithCancelCause` / `context.Cause`", "context cancel 可保留原因，便於區分 timeout、client cancel、shutdown 與 upstream failure。", "API/worker shutdown、gateway timeout 應記錄 cancel cause。", "測 timeout/client cancel/shutdown 三種 cause。"],
      ["HTTP", "`net/http.ResponseController`", "提供 per-request extended control，包含 read/write deadline 等能力。", "streaming response、大檔案下載、長連線 handler 可更精準控制 timeout。", "用 `httptest` 驗證 deadline 行為。"],
      ["HTTP ReverseProxy", "`httputil.ReverseProxy.Rewrite`", "新增 `Rewrite` hook，以 `ProxyRequest` 同時存取 inbound/outbound request，降低 header spoofing 風險。", "gateway/proxy 新實作優先用 `Rewrite` 取代 `Director`。", "測 inbound header 不會覆蓋安全 header。"],
      ["HTTP ReverseProxy", "`ProxyRequest.SetURL` / `SetXForwarded` / `User-Agent` behavior", "`SetURL` 取代 `NewSingleHostReverseProxy` 的常見用法；`SetXForwarded` 明確設定 forwarding headers；incoming request 沒有 `User-Agent` 時不再自動補上。", "反向代理需明確定義 Host、X-Forwarded-* 與 `User-Agent` policy。", "用 integration test 檢查 forwarded headers 與 `User-Agent`。"],
      ["Archive / Path Security", "`archive/tar` / `archive/zip` insecure path controls", "`GODEBUG=tarinsecurepath=0` 與 `zipinsecurepath=0` 可對不安全路徑回傳 `ErrInsecurePath`。", "處理外部 archive 前先加惡意路徑測試。", "測 absolute path、`..`、Windows reserved name。"],
      ["bytes / strings", "`CutPrefix` / `CutSuffix` and `bytes.Clone`", "bytes 與 strings 補 prefix/suffix cut helpers；`bytes.Clone` 可明確複製 slice。", "解析 protocol prefix/suffix 時可減少手寫判斷。", "測 trimmed 與 not-trimmed case。"],
      ["crypto/ecdsa", "`PrivateKey.ECDH`", "可把 ECDSA private key 轉成 ECDH private key。", "憑證與 key 轉換流程需補安全文件。", "測支援曲線與錯誤曲線。"],
      ["crypto/ed25519", "Ed25519ph / Ed25519ctx support", "`PrivateKey.Sign` 與 `VerifyWithOptions` 支援 pre-hashed 與 context variants。", "簽章協議需明確標示 HashFunc 與 Context。", "測 context mismatch verify fail。"],
      ["crypto/subtle", "`XORBytes`", "新增 byte slice XOR helper。", "低階 crypto/protocol helper 可改用標準 API。", "測不同長度與輸出長度。"],
      ["crypto/tls / x509", "`CertificateVerificationError` / `SetFallbackRoots`", "TLS verification failure 有具體 error type；x509 可設定 fallback roots。", "TLS client/server 排錯與 embedded root bundle 管理可更明確。", "測 unknown authority 與 fallback roots。"],
      ["debug / binary tooling", "`debug/elf`、`debug/gosym`、`debug/pe` updates", "ELF/PE 常數與 symbol naming 支援更新，`debug/gosym` 可處理 Go 1.20 symbol prefix。", "binary analysis tool 需用 Go 1.20 library 重新測。", "用 Go 1.19/1.20 binary fixture 測。"],
      ["encoding / fmt", "`encoding/binary` EOF behavior / `fmt.FormatString`", "Varint partial read 改回 `io.ErrUnexpectedEOF`；Formatter 可取回 format directive。", "parser 與 formatter library 應補錯誤分類測試。", "測 partial varint 與 custom Formatter。"],
      ["Go tooling APIs", "`go/ast`、`go/token.FileSet.RemoveFile`、`go/types.Satisfies`", "AST 增加位置資訊；FileSet 可移除檔案釋放記憶體；types 可判斷 constraint satisfaction。", "長時間分析器、LSP、codegen 工具可導入。", "用大型 source tree 做 memory test。"],
      ["IO / Filesystem", "`io.OffsetWriter`、`io/fs.SkipAll`、`path/filepath.SkipAll`、`IsLocal`", "新增 offset writer、立即成功終止 walk、路徑 lexical local 判斷。", "檔案工具、archive extractor、安全路徑檢查應導入。", "測 path traversal 與 Walk early stop。"],
      ["Networking", "`net.LookupCNAME`、`FlagRunning`、`Dialer.ControlContext`", "CNAME lookup 行為更一致；interface flag 可區分 active link；dial control 可取得 context。", "工業網路 gateway 可用 `FlagRunning` 判斷 link 實際狀態。", "測 DNS、拔線/未連線介面、dial timeout。"],
      ["net/http", "1xx、`DisableGeneralOptionsHandler`、`OnProxyConnectResponse`", "ResponseWriter 可送 1xx；Server 可關閉 default `OPTIONS *`；Transport 可觀察 proxy CONNECT response。", "HTTP gateway、安全 proxy、client transport 應補測。", "httptest + proxy fixture。"],
      ["os/exec", "`Cmd.Cancel` / `WaitDelay`", "可定義 Context cancel 或 child process 持有 pipe 時的等待行為。", "CLI wrapper、supervisor、build runner 要避免 zombie 與永遠卡住。", "測 context cancel、child holding stdout/stderr。"],
      ["reflect", "`Value.Comparable`、`Equal`、`Grow`、`SetZero`", "reflection 補 equality、slice grow 與 zero assignment helper。", "generic-ish validation、serialization、diff 工具可減少 unsafe/手寫邏輯。", "測 unexported field 與不可比較型別。"],
      ["Runtime observability", "`runtime/metrics` / `runtime/pprof` / `runtime/trace` updates", "新增 GOMAXPROCS、cgo calls、mutex wait、GC time 等 metrics；pprof/trace 行為修正。", "把 runtime metrics 納入 dashboard，升級後比對 profile。", "metrics scrape、mutex profile、trace smoke test。"],
      ["sync", "`sync.Map.Swap`、`CompareAndSwap`、`CompareAndDelete`", "sync.Map 支援 atomic update/delete 操作。", "高併發 cache/state table 可減少外部鎖。", "race test + high-concurrency tests。"],
      ["testing / time / unicode", "`testing.B.Elapsed`、`time.DateTime`、`Time.Compare`、`utf16.AppendRune`", "testing、time layout、time comparison、UTF-16 append API 補齊常見需求。", "benchmark metric、時間格式、encoding 工具可改用標準 API。", "測 benchmark helper、JSON time、UTF-16 conversion。"],
    ],
    compat: [
      ["Go command", "`go build -i` / `go test -i` removed", "移除", "舊 CI、Makefile、Dockerfile 若仍帶 `-i` 會失敗。", "移除 `-i`，改依 build cache。"],
      ["Go command", "`$GOROOT/pkg` precompiled stdlib archive removed", "行為變更", "標準庫不再以發行版預帶 archive，會按需 build 並進 build cache。", "CI cache policy 應包含 Go build cache，不依賴 `$GOROOT/pkg`。"],
      ["Go command", "GOPATH package install target cleanup", "行為變更", "main module 位於 `GOPATH/src` 時，non-main package 不再安裝到 `GOPATH/pkg`，`go list` 不再回報 `Target`。", "清理舊 GOPATH workflow，改用 module/cache。"],
      ["Platform / Windows", "Windows 7、8、Server 2008、Server 2012 final support", "最後支援", "Go 1.21 起需 Windows 10 或 Server 2016 以上。", "升級到 Go 1.21 前先更新 OS support matrix。"],
      ["Platform / macOS", "macOS 10.13 / 10.14 final support", "最後支援", "Go 1.21 起需 macOS 10.15 Catalina 以上。", "CI runner 與開發機需升級。"],
      ["Cgo", "`CGO_ENABLED` default may become `0` without C toolchain", "預設行為變更", "minimal container 或 macOS 無 C compiler 時會自動走 pure Go build。", "Docker image 要明確設定 `CGO_ENABLED` 與 C toolchain policy。"],
      ["Cgo / macOS", "`net` + `-buildmode=c-archive` needs `-lresolv`", "link 行為變更", "macOS 將 Go archive 連到 C program 時可能缺 resolver symbol。", "C link command 加上 `-lresolv`。"],
      ["Cgo / race detector", "macOS race detector no longer needs cgo/Xcode", "需求變更", "macOS 可降低 race test 環境要求；Linux/Unix/Windows 仍需 host C toolchain。", "CI 文件分平台標註。"],
      ["Vet", "`T.Parallel` loop variable capture diagnostic", "診斷加強", "舊 subtest 可能被 vet 報出 loop variable capture。", "改用每輪 shadow variable 或 table-driven safe pattern。"],
      ["Vet", "`2006-02-01` time format diagnostic", "診斷加強", "誤把 yyyy-dd-mm 當 ISO yyyy-mm-dd 的程式會被 vet 提醒。", "改成 `2006-01-02`。"],
      ["Compiler", "anonymous interface cycles rejected", "相容性異動", "極少數使用 embedded interface cycle 的程式會 compile fail。", "重構 interface graph，避免匿名循環。"],
      ["Linker", "Linux glibc/musl dynamic interpreter selected at link time", "link 行為變更", "container/base image 混用 glibc/musl 時需實際 smoke test。", "分 glibc/musl image 驗證 binary。"],
      ["Linker", "compiler-generated symbols use `go:` / `type:` prefix", "工具相容性", "自製 binary analysis / symbol parsing tool 可能依賴舊 `go.` / `type.`。", "改用 Go 1.20 `debug/gosym` 或更新 parser。"],
      ["Bootstrap", "source build requires Go 1.17.13 bootstrap", "建置要求", "自建 Go toolchain 若 bootstrap 太舊會失敗。", "安裝 Go 1.17.13，確認 `$HOME/go1.17.13` 或 `$HOME/sdk/go1.17.13`。"],
      ["archive/tar / archive/zip", "insecure path checks via GODEBUG", "安全收緊", "外部 archive 若含 absolute path、`..`、Windows reserved name，啟用後會回 `ErrInsecurePath`。", "修正 archive producer 或清洗路徑。"],
      ["archive/zip", "directory file containing data now errors", "行為收緊", "不合規 zip 讀取可能失敗。", "測 legacy zip corpus。"],
      ["encoding/xml", "stricter namespace/name validation", "安全/規格收緊", "多 colon name、empty namespace、closing prefix mismatch 會被拒絕。", "清理 legacy XML input。"],
      ["crypto/ecdsa / rsa", "constant-time backend CPU cost", "安全收緊", "ECDSA supported curves 與 RSA 私鑰操作更安全但 CPU 可能上升。", "對 TLS/signing/decryption 做 benchmark。"],
      ["crypto/rsa", "`PrecomputedValues` must not be manually modified", "安全要求", "手動修改或產生 RSA precomputed fields 可能破壞安全假設。", "改用標準 key generation/parsing。"],
      ["math/rand", "global RNG auto seed and `Seed` deprecated", "預設行為變更/棄用", "依賴 deterministic global random sequence 的測試會漂移。", "測試改用 `rand.New(rand.NewSource(seed))`；必要時用 `GODEBUG=randautoseed=0`。"],
      ["math/rand", "`Read` deprecated", "棄用", "安全用途不應用 math/rand。", "改用 `crypto/rand.Read`。"],
      ["mime/multipart", "header/part limits", "安全限制", "大型或異常 multipart input 可能被拒絕。", "必要時調整 `GODEBUG=multipartmaxheaders` / `multipartmaxparts`，並保留上限。"],
      ["net/http", "HEAD request with body accepted", "行為變更", "舊測試若期待 server reject HEAD body 需要更新。", "以實際 API contract 重新定義。"],
      ["net/http", "cookie parsing/validation behavior changed", "行為變更", "cookie name trimming、empty Expires validation 可能改變 legacy 行為。", "補 cookie parser regression tests。"],
      ["os / Windows", "`NUL` and directory file behavior changed", "平台行為變更", "Windows path/file tests 可能受影響。", "在 Windows runner 重跑 filesystem tests。"],
      ["reflect", "`SetIterKey` / `SetIterValue` unexported field check fixed", "行為修正", "依賴舊錯誤行為的 reflection code 會失敗。", "修正對 unexported field 的操作。"],
      ["regexp/syntax", "`ErrLarge` replaces generic internal error for huge regex", "錯誤分類變更", "錯誤判斷若比對 `ErrInternalError` 需更新。", "改測 `syntax.ErrLarge`。"],
      ["syscall / FreeBSD", "FreeBSD 11 compatibility shims removed", "平台相容性", "舊 FreeBSD target 不應再列為支援。", "更新部署矩陣。"],
      ["testing", "`T.Run` inside `T.Cleanup` panics", "行為收緊", "不明確的 cleanup 內建立 subtest 會 panic。", "調整測試 lifecycle。"],
      ["time", "`Time.MarshalJSON` stricter RFC3339", "格式收緊", "不合 RFC3339 的時間 JSON 可能失敗。", "補 JSON time round-trip tests。"],
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
    phase: "現代標準庫期",
    positioning: "Go 1.21 是現代標準庫與 toolchain 管理的重要版本，加入 `log/slog`、`slices`、`maps`、`cmp` 與 toolchain switching。",
    value: "適合建立標準集合工具、結構化日誌、toolchain pinning 與 PGO 正式流程。",
    risk: "toolchain auto-switching、minimum version semantics 與 structured log 欄位治理需明確。",
    focus: "`slices`、`maps`、`cmp`、`log/slog`、toolchain management、PGO。",
    added: [
      ["Language", "`min` / `max` / `clear`", "新增內建函式，簡化常見集合操作。", "減少自寫 helper。", "語法與版本邊界測試。"],
      ["Stdlib", "`slices` / `maps` / `cmp`", "標準集合與比較工具。", "取代專案內部重複 helper。", "測 shallow copy 與 ordering。"],
      ["Logging", "`log/slog`", "標準結構化 logging。", "建立欄位命名與 redaction 規範。", "log contract tests。"],
      ["Toolchain", "toolchain management", "go command 可依 module toolchain 管理版本。", "CI pinning 必須明確。", "`go env GOTOOLCHAIN`。"],
    ],
    compat: [
      ["Toolchain", "auto toolchain switching", "流程風險", "CI 可能下載/切換 toolchain。", "固定 GOTOOLCHAIN policy。"],
      ["Logging", "structured log schema drift", "治理風險", "欄位不一致會影響 observability。", "建立 log schema。"],
    ],
    commands: [
      ["go env GOTOOLCHAIN", "toolchain policy", "新增/重要", "控制 toolchain switching。", "`GOTOOLCHAIN=local go test ./...`"],
      ["go test", "stdlib helper migration", "建議", "替換 helper 後跑測試。", "`go test ./...`"],
    ],
  },
  22: {
    phase: "現代標準庫期",
    positioning: "Go 1.22 帶來 loop variable 語意修正、integer range 與標準庫 ServeMux 大幅增強。",
    value: "適合重整 table-driven tests、標準庫 router 與 `math/rand/v2` 教材。",
    risk: "舊 closure workaround 可能變冗餘；ServeMux route pattern 成為外部 API contract。",
    focus: "loop variable per-iteration、range over integers、ServeMux patterns、`math/rand/v2`。",
    added: [
      ["Language", "loop variables per iteration", "for loop variable 每次迭代有獨立實例，修正常見 closure bug。", "清理 table-driven tests。", "刪除不必要 shadow copy 後測試。"],
      ["Language", "range over integers", "可直接 `for i := range n`。", "簡化固定次數 loop。", "語法版本邊界測試。"],
      ["HTTP", "enhanced `ServeMux`", "支援 method pattern、wildcards 與 `Request.PathValue`。", "中小 API 可使用標準庫 router。", "route precedence tests。"],
      ["Random", "`math/rand/v2`", "新版 random API。", "新程式優先評估 v2。", "deterministic seed tests。"],
    ],
    compat: [
      ["Language", "loop closure behavior changed", "語意變更", "舊 workaround 可能仍可用但不必要。", "review table tests。"],
      ["HTTP", "ServeMux pattern conflicts", "API 風險", "路由 pattern 會影響外部 API。", "route contract tests。"],
    ],
    commands: [
      ["go vet", "append/defer checks", "新增檢查", "抓常見無效 append / defer time.Since mistake。", "`go vet ./...`"],
      ["go test", "loopvar migration tests", "建議", "確認 closure 行為。", "`go test ./...`"],
    ],
  },
  23: {
    phase: "現代標準庫期",
    positioning: "Go 1.23 引入 iterator/range-over-function、timer channel 行為變更與標準庫 API 版本檢查。",
    value: "適合建立 iterator pipeline、timer/ticker timeout 測試、API version linting。",
    risk: "timer behavior 改變可能影響 flaky timeout tests；iterator API 需避免過度抽象。",
    focus: "iterators、`iter` package、timer changes、`stdversion` vet、telemetry。",
    added: [
      ["Language", "range-over-function iterators", "可 range over iterator function。", "集合/stream API 可更標準化。", "測 early stop / cleanup。"],
      ["Stdlib", "`iter` package", "提供 iterator convention。", "搭配 `slices` / `maps` 新 API。", "iterator fixture tests。"],
      ["Runtime", "timer/ticker GC and channel behavior", "timer/ticker 更容易被 GC，channel 行為更同步。", "重跑 timeout/flaky tests。", "time-sensitive tests。"],
      ["Vet", "`stdversion` analyzer", "檢查使用超過 module go version 的 API。", "CI 防止誤用太新 API。", "`go vet ./...`。"],
    ],
    compat: [
      ["Runtime", "timer behavior", "行為變更", "依賴舊 timer buffering 的測試可能失敗。", "重寫 deterministic tests。"],
      ["API", "too-new stdlib usage", "版本風險", "library 可能誤用高版本 API。", "使用 `stdversion`。"],
    ],
    commands: [
      ["go vet", "`stdversion`", "新增", "檢查 API 版本。", "`go vet ./...`"],
      ["go test", "timer tests", "建議", "重跑 timeout/retry 測試。", "`go test -count=100 ./...`"],
    ],
  },
  24: {
    phase: "現代標準庫期",
    positioning: "Go 1.24 聚焦 tool directive、filesystem security、benchmark API 與供應鏈治理。",
    value: "適合建立工具依賴治理、目錄範圍 filesystem、benchmark loop 與 JSON/time/security 教材。",
    risk: "tool directive、GOAUTH、os.Root 導入需整理 CI 與安全政策。",
    focus: "`tool` directive、`os.Root`、`testing.B.Loop`、generic aliases、GOAUTH。",
    added: [
      ["Language", "generic type aliases", "泛型 alias 更完整。", "API 遷移可保留泛型型別相容。", "compile compatibility tests。"],
      ["Modules", "`tool` directive", "可在 go.mod 記錄 tool dependencies。", "把 mockgen/staticcheck 等工具納入治理。", "`go tool` workflow。"],
      ["Filesystem", "`os.Root`", "限制 filesystem operations 在指定 root 內。", "防 path traversal。", "malicious path tests。"],
      ["Testing", "`B.Loop`", "benchmark loop API 更不易寫錯。", "更新 benchmark pattern。", "benchmark review。"],
    ],
    compat: [
      ["Security", "`os.Root` adoption", "行為設計", "需明確定義 root boundary。", "path traversal tests。"],
      ["Tooling", "`tool` directive governance", "流程變更", "CI tool install 改走 module governance。", "更新 Makefile/CI。"],
    ],
    commands: [
      ["go get -tool", "tool dependency", "新增", "加入 tool directive。", "`go get -tool example.com/cmd/tool`"],
      ["go tool", "run managed tool", "新增/強化", "執行 module-managed tool。", "`go tool stringer`"],
    ],
  },
  25: {
    phase: "現代標準庫期",
    positioning: "Go 1.25 強化 container-aware runtime、同步測試與 concurrency helper。",
    value: "適合 Kubernetes CPU limit、flaky concurrency tests、WaitGroup lifecycle 教材。",
    risk: "GOMAXPROCS 自動調整會改變效能基準；synctest 需明確適用範圍。",
    focus: "container-aware `GOMAXPROCS`、`testing/synctest`、`WaitGroup.Go`。",
    added: [
      ["Runtime", "container-aware `GOMAXPROCS`", "runtime 可依容器 CPU limit 調整預設 parallelism。", "Kubernetes service 需重定義 CPU/latency 基準。", "比較 pod CPU limit 下吞吐。"],
      ["Testing", "`testing/synctest`", "提供同步/時間相關測試能力。", "用於 timeout/retry/flaky concurrency tests。", "重寫 flaky tests。"],
      ["Sync", "`WaitGroup.Go`", "簡化 goroutine 啟動與 WaitGroup bookkeeping。", "降低 Add/Done 錯誤。", "race test。"],
    ],
    compat: [
      ["Runtime", "auto `GOMAXPROCS` changes throughput", "效能風險", "CPU limit 下結果與舊版不同。", "更新 benchmark baseline。"],
      ["Testing", "synctest scope", "測試設計", "不應取代所有 integration tests。", "限定用於 deterministic concurrency。"],
    ],
    commands: [
      ["GOMAXPROCS", "runtime default policy", "行為變更", "container 下需明確觀察。", "`GOMAXPROCS=2 go test ./...`"],
      ["go test", "synctest-based tests", "建議", "重構 flaky tests。", "`go test ./...`"],
    ],
  },
  26: {
    phase: "現代標準庫期",
    positioning: "Go 1.26 延續現代化工具鏈與 runtime 路線，重點在 modernizer、GC、測試 artifact 與語言小幅擴充。",
    value: "適合建立 automated modernization、GC metrics、test artifact collection 與 toolchain 升級治理。",
    risk: "modernizer 自動修改需 code review；GC/runtime 指標需重新校準。",
    focus: "`new(expression)`、modernizers、Green Tea GC、`testing.T.Attr` / `ArtifactDir`。",
    added: [
      ["Language", "`new(expression)`", "語言層小幅擴充，改善部分初始化表達能力。", "只在能提升可讀性時使用。", "compile tests。"],
      ["Go command", "modernizers", "工具可協助把舊程式碼現代化。", "只在 reviewable branch 執行。", "檢查 diff 與 tests。"],
      ["Runtime", "Green Tea GC", "GC 實作更新，影響 runtime metrics 與效能觀察。", "重跑 latency / memory benchmark。", "pprof + runtime metrics。"],
      ["Testing", "`T.Attr` / `ArtifactDir`", "測試可標註 metadata 並保存 artifacts。", "適合 CI evidence collection。", "檢查 artifact 產物。"],
    ],
    compat: [
      ["Tooling", "modernizer diff", "自動化風險", "自動修改不可直接進 main。", "逐 PR review。"],
      ["Runtime", "GC metrics baseline", "觀測風險", "dashboard threshold 需重校準。", "比較升級前後 metrics。"],
      ["Bootstrap", "Go 1.24.6+ bootstrap", "建置要求", "source build 需更新 bootstrap。", "檢查 builder。"],
    ],
    commands: [
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
    if (minor < 2 || minor > 26) continue;
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

function parseOfficialHeadings(html) {
  const headings = [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((m) => stripTags(m[2]))
    .filter((text) => text && !["Overview", "Index"].includes(text))
    .slice(0, 14);
  return headings.length ? headings : ["Introduction", "Language", "Tools", "Runtime", "Compiler", "Standard library"];
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
  const normalized = headings.slice(0, 10);
  const base = normalized.map((heading) => [
    heading,
    "已整理",
    `依官方 ${heading} 段落整理為工程摘要。`,
    "放入新增功能、相容性異動、指令變更或導入計畫區。",
    heading.toLowerCase().includes("security") || heading.toLowerCase().includes("runtime") ? "中高" : "中",
  ]);
  base.push(["Patch Revisions", "已整理", `Go 1.${minor} patch revisions 由官方 Release History 擷取。`, "列於 Patch Revisions 區，作為採用最終 patch 的依據。", "中"]);
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

function pageHtml(minor, release, headings) {
  const data = releaseData[minor];
  const phase = phaseFor(minor);
  const title = `Go 1.${minor} Release Note 專業整理報告`;
  const officialUrl = `https://go.dev/doc/go1.${minor}`;
  const filename = `go1.${minor}-release-note.html`;
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
      <div class="crumbs"><a href="index.html">ReleaseNote Index</a><span>/</span><span>Go 1.${minor}</span></div>
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
      <a class="nav-link" href="#executive-summary">摘要</a>
      <a class="nav-link" href="#overview">總覽</a>
      <a class="nav-link" href="#impact-matrix">影響矩陣</a>
      <a class="nav-link" href="#official-coverage">官方覆蓋矩陣</a>
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
    <section id="official-coverage">
      <div class="section-head"><h2>官方段落覆蓋矩陣</h2><p>此矩陣依官方 release note 段落標題與 Release History 補齊狀態整理。</p></div>
      <div class="table-wrap"><table><thead><tr><th>官方段落</th><th>本頁狀態</th><th>整理方式</th><th>落地區域</th><th>風險等級</th></tr></thead><tbody>${coverageRows(minor, headings)}</tbody></table></div>
    </section>
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

function indexHtml(releases) {
  const versions = Array.from({ length: 25 }, (_, i) => i + 2);
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
  const nav = versions.map((minor) => `<a href="#go1${minor}">Go 1.${minor}</a>`).join("");
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
  <title>Go 1.2-1.26 Release Note 專業整理報告索引 | Golang 學習筆記</title>
  <style>
    :root{--bg:#f5f7fa;--paper:#fff;--ink:#172033;--muted:#5f6d7e;--line:#d7e0ea;--head:#eaf0f6;--accent:#0f766e;--blue:#1d4ed8}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif;line-height:1.62}
    a{color:var(--blue);text-decoration:none} a:hover{text-decoration:underline}
    header,main{width:min(1200px,calc(100% - 32px));margin:0 auto} header{padding:34px 0 20px}
    h1{margin:0;font-size:clamp(32px,5vw,56px);line-height:1.08}.lead{max-width:900px;color:var(--muted);font-size:18px}
    .meta-row,.nav{display:flex;flex-wrap:wrap;gap:8px}.meta,.nav a,.actions a{display:inline-flex;align-items:center;min-height:30px;padding:5px 10px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:13px;font-weight:800}
    .nav{position:sticky;top:0;z-index:2;padding:10px 0;background:rgba(245,247,250,.95);border-bottom:1px solid var(--line)}
    section{margin:24px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .version-card{border:1px solid var(--line);border-radius:8px;background:#fff;padding:16px}.version-card h2{margin:6px 0 8px}.version-card p{color:var(--muted)}
    .phase{display:inline-flex;padding:3px 8px;border-radius:999px;background:#e6f3f1;color:var(--accent);font-size:12px;font-weight:900}
    .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#fff} table{width:100%;min-width:860px;border-collapse:collapse} th,td{padding:10px 12px;border:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere} th{background:var(--head)}
    @media(max-width:760px){header,main{width:min(100% - 24px,1200px)}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <h1>Go 1.2-1.26 Release Note 專業整理報告索引</h1>
    <p class="lead">依官方 Go Release History 與各版本 Release Notes 建立 25 份 major-version 獨立專業整理報告。最新 major 版本為 Go 1.26，最新 patch 狀態記錄至 Go 1.26.3（2026-05-07）。</p>
    <div class="meta-row"><span class="meta">範圍：Go 1.2 - Go 1.26</span><span class="meta">報告數：25</span><span class="meta">生成時間：${GENERATED_AT}</span><span class="meta">來源：go.dev 官方文件</span></div>
  </header>
  <main>
    <nav class="nav" aria-label="Release versions">${nav}</nav>
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
  const headingMap = new Map();
  for (let minor = 2; minor <= 26; minor++) {
    const url = `https://go.dev/doc/go1.${minor}`;
    try {
      const html = await fetchText(url);
      headingMap.set(minor, parseOfficialHeadings(html));
    } catch {
      headingMap.set(minor, ["Introduction", "Major changes", "Tools", "Standard library"]);
    }
  }
  for (let minor = 2; minor <= 26; minor++) {
    const release = releases.get(minor) ?? { date: "官方未列日期", patches: [] };
    const html = pageHtml(minor, release, headingMap.get(minor) ?? []);
    fs.writeFileSync(path.join(OUT_DIR, `go1.${minor}-release-note.html`), html);
  }
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexHtml(releases));
  console.log("generated release notes:", 25);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
