# 08. 版本管理

Go 的 module 系統是語言內建的版本管理方案。理解它，才能正確管理依賴、發佈套件、與團隊協作。

## 語意版本 Semantic Versioning

Go module 遵循 [SemVer](https://semver.org/)：

```text
v1.4.2
│ │ │
│ │ └── PATCH：bug fix，向後相容
│ └──── MINOR：新功能，向後相容
└────── MAJOR：breaking change，不保證相容
```

| 版本變動 | 何時 bump | 範例 |
|---|---|---|
| PATCH | 修 bug、安全修補 | `v1.4.2` → `v1.4.3` |
| MINOR | 新增 API、功能 | `v1.4.3` → `v1.5.0` |
| MAJOR | 刪除 / 更改公開 API | `v1.5.0` → `v2.0.0` |

> **工程經驗**：v0.x.x 視為不穩定，任何版本都可能 breaking。正式對外發佈前先用 v0，等 API 穩定再升 v1。

## `go.mod` 深入

```go
module github.com/yourname/myservice

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
	golang.org/x/sync v0.6.0
)

require (
	// indirect dependencies（被直接依賴拉進來的）
	golang.org/x/text v0.14.0 // indirect
)
```

### 指令詳解

| 指令 | 說明 |
|---|---|
| `module` | 本 module 的 import path |
| `go` | 最低 Go 版本要求 |
| `require` | 直接 / 間接依賴清單 |
| `replace` | 替換 module 來源（本地開發、fork） |
| `exclude` | 排除特定版本（有已知 bug） |
| `retract` | 撤回自己發佈的版本（標記為不建議使用） |

### `replace` 實用場景

```go
// 本地開發時，引用尚未推送的本地 module
replace github.com/yourname/shared => ../shared

// 使用 fork 修正 bug
replace github.com/original/pkg => github.com/yourfork/pkg v1.2.3-fix
```

> **注意**：`replace` 只對本 module 的 build 生效，不會影響依賴你的下游 module。

## `go.sum`

`go.sum` 記錄每個依賴的加密 hash，確保每次 build 使用完全相同的程式碼。

| 問題 | 說明 |
|---|---|
| 要不要 commit `go.sum`？ | **一定要**。它是 build 可重現性的保證 |
| 為什麼有兩行？ | 一行是 module 的 zip hash，一行是 `go.mod` 的 hash |
| hash 不一致怎麼辦？ | `go mod tidy` 重新計算 |

## 依賴管理指令

```mermaid
flowchart LR
  A["go get pkg@version"] --> B["更新 go.mod"]
  B --> C["go mod tidy"]
  C --> D["清理未用依賴"]
  D --> E["go mod verify"]
  E --> F["驗證 hash"]
```

| 指令 | 用途 | 範例 |
|---|---|---|
| `go get` | 新增 / 更新依賴 | `go get golang.org/x/sync@latest` |
| `go get pkg@v1.2.3` | 指定版本 | `go get github.com/gin-gonic/gin@v1.9.1` |
| `go get pkg@none` | 移除依賴 | `go get github.com/old/pkg@none` |
| `go mod tidy` | 清理未用 + 補齊缺少 | 每次改完 import 後執行 |
| `go mod vendor` | 複製依賴到 `vendor/` | 離線 build 或 CI 加速 |
| `go mod graph` | 顯示依賴圖 | 分析間接依賴來源 |
| `go mod verify` | 驗證 hash | CI 中確認依賴沒被篡改 |
| `go mod download` | 預先下載依賴 | Docker build 優化 |

## Private Module

```bash
# 設定私有 module
go env -w GOPRIVATE="github.com/yourcompany/*"

# 跳過 checksum 驗證
go env -w GONOSUMCHECK="github.com/yourcompany/*"

# Git 認證（使用 token）
git config --global url."https://oauth2:${TOKEN}@github.com/".insteadOf "https://github.com/"
```

| 環境變數 | 說明 |
|---|---|
| `GOPRIVATE` | 不走 proxy 也不走 checksum DB |
| `GONOSUMCHECK` | 不驗證 checksum |
| `GONOPROXY` | 不走 proxy |

## Module Proxy

```bash
# 預設值
GOPROXY="https://proxy.golang.org,direct"

# 企業內部 proxy
GOPROXY="https://goproxy.yourcompany.com,https://proxy.golang.org,direct"
```

```mermaid
flowchart LR
  GO["go get"] --> PROXY["Module Proxy"]
  PROXY --> SUM["Sum DB"]
  PROXY --> SOURCE["Source"]
  GO -. GOPRIVATE .-> SOURCE
```

## Major Version 升級

Go module 規定 v2+ 必須在 import path 加 suffix：

```go
// go.mod
module github.com/yourname/mylib/v2

// 使用端
import "github.com/yourname/mylib/v2/pkg"
```

| 版本 | Module path | 分支策略 |
|---|---|---|
| v0 / v1 | `github.com/yourname/mylib` | `main` branch |
| v2 | `github.com/yourname/mylib/v2` | 子目錄或新 branch |
| v3+ | `github.com/yourname/mylib/v3` | 同上 |

## Git Tag 與 Module 版本對應

```bash
# 發佈 v1.0.0
git tag v1.0.0
git push origin v1.0.0

# 預發佈版本
git tag v1.1.0-rc.1
git push origin v1.1.0-rc.1
```

| Tag 格式 | Go 解讀 |
|---|---|
| `v1.2.3` | 正式版本 |
| `v1.2.3-rc.1` | 預發佈（go get 不會自動選） |
| `v0.0.0-20240101-abcdef` | pseudo-version（未 tag） |

## 常見錯誤

| 錯誤 | 原因 | 修正 |
|---|---|---|
| `go.sum` 衝突 | 多人同時加依賴 | `go mod tidy` 後重新 commit |
| `replace` 忘記移除 | 本地 replace 推到 remote | CI 加檢查 |
| v2 import 不到 | module path 沒加 `/v2` | 同步改 `go.mod` 和 import |
| 間接依賴衝突 | diamond dependency | `go mod graph` 分析 |

---

## Go Workspace (`go work`) (Go 1.18+)

`go work` 解決了「在同一個工作環境中同時開發多個 module」的問題，是 monorepo 與本地多 module 開發的現代解法，取代了過去需要在 `go.mod` 中使用 `replace` 的笨拙方式。

### 典型場景

你同時開發 `myapp` 和 `mypkg`，想讓 `myapp` 用本地的 `mypkg`（而不是 git 上的版本）：

```text
workspace/
├── go.work         ← workspace 設定檔
├── myapp/
│   └── go.mod      (module github.com/user/myapp)
└── mypkg/
    └── go.mod      (module github.com/user/mypkg)
```

### 建立 Workspace

```bash
# 在 workspace 根目錄初始化
go work init ./myapp ./mypkg

# 加入更多 module
go work use ./another-module

# 同步所有 module 的依賴
go work sync
```

### `go.work` 檔案結構

```
go 1.22

use (
    ./myapp
    ./mypkg
)

# 可選：覆蓋特定依賴（少用）
replace github.com/user/old => ./local-fork
```

### `go work` vs `replace` 比較

| 比較 | `go.mod replace` | `go work` |
|---|---|---|
| 作用範圍 | 單一 module | 整個 workspace |
| 需要修改 `go.mod` | 是（且不能推 remote） | 否 |
| `go.work` 要 commit | 通常不 commit（放 `.gitignore`）| — |
| 適用場景 | 偶爾的本地測試 | **多 module 同時開發** |

### 工程實踐

```bash
# go.work 通常不需要 commit 到 git，加入 .gitignore
echo "go.work\ngo.work.sum" >> .gitignore

# CI/CD 環境中若不需要 workspace，可用環境變數停用
GOWORK=off go build ./...
```

> **工程經驗**：Go Workspace 對於大型組織的 monorepo 或需要同時維護 SDK + Consumer 的情境非常有用。小型專案的一次性本地測試仍可用 `replace`。

---

## 小練習

1. 建立 module，加入兩個外部依賴，用 `go mod tidy` 清理。
2. 用 `replace` 指向本地目錄，測試後移除。
3. 用 `go mod graph` 觀察依賴樹。
4. 設定 `GOPRIVATE` 模擬私有 module。
5. 建立兩個 module（`lib` 和 `app`），用 `go work` 讓 `app` 使用本地的 `lib`。
