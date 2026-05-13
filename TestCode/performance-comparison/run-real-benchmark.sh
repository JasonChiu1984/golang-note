#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CASE_DIR="$ROOT_DIR/examples/performance-comparison"
STAMP="$(date '+%Y-%m-%d-%H%M%S')"
FULL_TIME="$(date '+%Y-%m-%d %H:%M:%S %z')"
UTC_TIME="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
REPORT_DIR="$ROOT_DIR/測試報告"
RAW_DIR="$REPORT_DIR/raw/$STAMP"
REPORT_FILE="$REPORT_DIR/$STAMP-C-Python-Go-真實效能測試報告.md"
ITERATIONS="50000000"
C_FLAGS_O2="-O2"
C_FLAGS_O3="-O3"
GO_BENCH_COUNT="${GO_BENCH_COUNT:-5}"

mkdir -p "$RAW_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 127
  fi
}

capture() {
  local output="$1"
  shift
  {
    echo "\$ $*"
    "$@"
  } >"$output" 2>&1
}

capture_shell() {
  local output="$1"
  local command="$2"
  {
    echo "\$ $command"
    bash -lc "$command"
  } >"$output" 2>&1
}

first_match() {
  local pattern="$1"
  local file="$2"
  grep -E "$pattern" "$file" | head -n 1 || true
}

extract_seconds() {
  sed -nE 's/.*seconds=([0-9.]+).*/\1/p' "$1" | head -n 1
}

extract_go_ns_per_op() {
  awk '/BenchmarkRun/ {print $3; exit}' "$1"
}

format_ratio() {
  awk -v base="$1" -v value="$2" 'BEGIN {
    if (base == "" || value == "" || value == 0) {
      print "n/a"
    } else {
      printf "%.2fx", value / base
    }
  }'
}

require_cmd awk
require_cmd clang
require_cmd go
require_cmd python3

{
  echo "run_at=$FULL_TIME"
  echo "run_at_utc=$UTC_TIME"
  echo "root=$ROOT_DIR"
  echo "iterations=$ITERATIONS"
  echo "uname=$(uname -a)"
  echo "machine=$(uname -m)"
  if command -v sw_vers >/dev/null 2>&1; then
    echo "os_name=$(sw_vers -productName 2>/dev/null || true)"
    echo "os_version=$(sw_vers -productVersion 2>/dev/null || true)"
    echo "os_build=$(sw_vers -buildVersion 2>/dev/null || true)"
  fi
  if command -v sysctl >/dev/null 2>&1; then
    echo "cpu_model=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || sysctl -n hw.model 2>/dev/null || true)"
    echo "physical_cpu=$(sysctl -n hw.physicalcpu 2>/dev/null || true)"
    echo "logical_cpu=$(sysctl -n hw.logicalcpu 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || true)"
  fi
  if command -v system_profiler >/dev/null 2>&1; then
    hardware="$(system_profiler SPHardwareDataType 2>/dev/null || true)"
    echo "hardware_chip=$(printf '%s\n' "$hardware" | sed -nE 's/^[[:space:]]*Chip:[[:space:]]*(.*)/\1/p' | head -n 1)"
    echo "hardware_cores=$(printf '%s\n' "$hardware" | sed -nE 's/^[[:space:]]*Total Number of Cores:[[:space:]]*(.*)/\1/p' | head -n 1)"
    echo "hardware_memory=$(printf '%s\n' "$hardware" | sed -nE 's/^[[:space:]]*Memory:[[:space:]]*(.*)/\1/p' | head -n 1)"
  fi
  echo "online_processors=$(getconf _NPROCESSORS_ONLN 2>/dev/null || true)"
} >"$RAW_DIR/environment.txt"

capture "$RAW_DIR/clang-version.txt" clang --version
capture "$RAW_DIR/go-version.txt" go version
capture "$RAW_DIR/python-version.txt" python3 --version

capture_shell "$RAW_DIR/c-o2-build.txt" "cd '$CASE_DIR' && clang $C_FLAGS_O2 c/bench.c -o '$RAW_DIR/bench-c-o2'"
capture "$RAW_DIR/c-o2-run.txt" "$RAW_DIR/bench-c-o2"

capture_shell "$RAW_DIR/c-o3-build.txt" "cd '$CASE_DIR' && clang $C_FLAGS_O3 c/bench.c -o '$RAW_DIR/bench-c-o3'"
capture "$RAW_DIR/c-o3-run.txt" "$RAW_DIR/bench-c-o3"

capture_shell "$RAW_DIR/go-bench.txt" "cd '$CASE_DIR' && TMPDIR='$ROOT_DIR/.tmp' GOCACHE='$ROOT_DIR/.gocache' GOMODCACHE='$ROOT_DIR/.gomodcache' GOFLAGS='-ldflags=-linkmode=external' go test -bench=. -benchmem -count=$GO_BENCH_COUNT ./go"
capture_shell "$RAW_DIR/python-run.txt" "cd '$CASE_DIR' && python3 python/bench.py"

c_o2_seconds="$(extract_seconds "$RAW_DIR/c-o2-run.txt")"
c_o3_seconds="$(extract_seconds "$RAW_DIR/c-o3-run.txt")"
go_ns_op="$(extract_go_ns_per_op "$RAW_DIR/go-bench.txt")"
python_seconds="$(extract_seconds "$RAW_DIR/python-run.txt")"
go_seconds=""
if [[ -n "$go_ns_op" ]]; then
  go_seconds="$(awk -v ns="$go_ns_op" 'BEGIN { printf "%.6f", ns / 1000000000 }')"
fi

c_o2_result="$(first_match 'language=C' "$RAW_DIR/c-o2-run.txt")"
c_o3_result="$(first_match 'language=C' "$RAW_DIR/c-o3-run.txt")"
python_result="$(first_match 'language=Python' "$RAW_DIR/python-run.txt")"
go_result="$(first_match 'BenchmarkRun' "$RAW_DIR/go-bench.txt")"
cpu_model="$(sed -nE 's/^cpu_model=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
if [[ -z "$cpu_model" ]]; then
  cpu_model="$(sed -nE 's/^hardware_chip=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
fi
if [[ -z "$cpu_model" ]]; then
  cpu_model="$(sed -nE 's/^machine=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
fi
physical_cpu="$(sed -nE 's/^physical_cpu=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
if [[ -z "$physical_cpu" ]]; then
  physical_cpu="$(sed -nE 's/^hardware_cores=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
fi
logical_cpu="$(sed -nE 's/^logical_cpu=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
if [[ -z "$logical_cpu" ]]; then
  logical_cpu="$(sed -nE 's/^online_processors=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
fi
os_name="$(sed -nE 's/^os_name=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
os_version="$(sed -nE 's/^os_version=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
os_line="$(printf '%s %s' "${os_name:-$(uname -s)}" "${os_version:-$(uname -r)}")"
clang_version="$(sed -n '2p' "$RAW_DIR/clang-version.txt")"
go_version="$(sed -n '2p' "$RAW_DIR/go-version.txt")"
python_version="$(sed -n '2p' "$RAW_DIR/python-version.txt")"

cat >"$REPORT_FILE" <<REPORT
# C / Python / Go 真實效能測試報告

| 項目 | 內容 |
|---|---|
| 測試日期 | ${STAMP:0:10} |
| 完整日期時間 | $FULL_TIME |
| UTC 時間 | $UTC_TIME |
| 測試程式 | \`TestCode/performance-comparison/run-real-benchmark.sh\` |
| Workload | 64-bit integer hash loop |
| Iterations | $ITERATIONS |
| Raw output 目錄 | \`測試報告/raw/$STAMP/\` |

## Executive Summary

本報告由真實測試程式自動產生，所有數字都來自本機命令輸出。此測試只代表目前 CPU、OS、compiler flags、Go/Python 版本與資料量下的 CPU-bound microbenchmark，不可直接外推成所有專案或工業通訊場景的語言絕對結論。

## 測試環境

| 欄位 | 實測內容 | 影響 |
|---|---|---|
| CPU | ${cpu_model:-未取得} | CPU cache、SIMD、turbo、核心數會影響結果 |
| Physical CPU | ${physical_cpu:-未取得} | 影響平行測試解讀 |
| Logical CPU | ${logical_cpu:-未取得} | 影響 Go benchmark scheduler 與背景雜訊 |
| OS | ${os_line:-未取得} | scheduler、syscall、filesystem 行為不同 |
| Compiler | ${clang_version:-未取得} | C hot path 直接受 compiler optimization 影響 |
| Go version | ${go_version:-未取得} | runtime、GC、compiler optimization 會隨版本改變 |
| Python version | ${python_version:-未取得} | interpreter 實作與版本會改變結果 |
| C flags | \`$C_FLAGS_O2\`、\`$C_FLAGS_O3\` | 最佳化、連結與安全選項會改變 hot path |
| Go bench count | \`$GO_BENCH_COUNT\` | 重複次數越多越能觀察穩定性 |
| 資料量 | \`iterations=$ITERATIONS\` | 小資料容易被啟動與 cache effect 主導 |

## 測試程式與 Workflow

1. 編譯 C O2：\`clang $C_FLAGS_O2 c/bench.c\`
2. 執行 C O2 workload。
3. 編譯 C O3：\`clang $C_FLAGS_O3 c/bench.c\`
4. 執行 C O3 workload。
5. 執行 Go benchmark：\`go test -bench=. -benchmem -count=$GO_BENCH_COUNT ./go\`
6. 執行 Python workload：\`python3 python/bench.py\`
7. 收集 raw stdout 到 \`測試報告/raw/$STAMP/\`。
8. 產生本 Markdown 測試報告。

## 結果摘要

| 語言 / 模式 | 實測結果 | 換算秒數 | 相對於 C O2 |
|---|---:|---:|---:|
| C \`$C_FLAGS_O2\` | \`${c_o2_result:-未取得}\` | ${c_o2_seconds:-n/a} | 1.00x |
| C \`$C_FLAGS_O3\` | \`${c_o3_result:-未取得}\` | ${c_o3_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$c_o3_seconds") |
| Go benchmark | \`${go_result:-未取得}\` | ${go_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$go_seconds") |
| Python | \`${python_result:-未取得}\` | ${python_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$python_seconds") |

## Raw Output

### Environment

\`\`\`text
$(cat "$RAW_DIR/environment.txt")
\`\`\`

### C O2 Build

\`\`\`text
$(cat "$RAW_DIR/c-o2-build.txt")
\`\`\`

### C O2 Run

\`\`\`text
$(cat "$RAW_DIR/c-o2-run.txt")
\`\`\`

### C O3 Build

\`\`\`text
$(cat "$RAW_DIR/c-o3-build.txt")
\`\`\`

### C O3 Run

\`\`\`text
$(cat "$RAW_DIR/c-o3-run.txt")
\`\`\`

### Go Benchmark

\`\`\`text
$(cat "$RAW_DIR/go-bench.txt")
\`\`\`

### Python Run

\`\`\`text
$(cat "$RAW_DIR/python-run.txt")
\`\`\`

## Verification

| 檢查 | 結果 |
|---|---|
| C O2 binary build | 通過 |
| C O2 run | 通過 |
| C O3 binary build | 通過 |
| C O3 run | 通過 |
| Go benchmark | 通過 |
| Python run | 通過 |
| Raw output 保存 | 通過，位於 \`測試報告/raw/$STAMP/\` |
| 報告欄位完整性 | 已包含 CPU、OS、compiler、flags、Go/Python version、資料量與 raw output |

## Troubleshooting

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| \`clang\` 不存在 | Xcode Command Line Tools 未安裝 | 安裝 Command Line Tools 或改用可用 C compiler |
| Go benchmark 失敗 | Go cache 或 module cache 權限問題 | 使用 repo-local \`TMPDIR/GOCACHE/GOMODCACHE\` |
| Python 結果很慢 | CPython interpreter 執行 50M loop 成本高 | 降低 iterations 或改測 I/O-bound workload |
| 結果波動大 | 背景程序、CPU turbo、溫控、電源模式 | 固定電源、關閉重負載背景程序、增加 count |

## Best Practices

- 不用單次數字當正式架構決策依據，至少重跑多輪並保留 raw output。
- CPU-bound microbenchmark 不代表 Modbus、OPC UA、BACnet、SCADA gateway 這類 I/O-bound 系統。
- 若要比較服務吞吐量，應改用 loopback TCP listener、固定 payload、連線數、timeout、retry 與 p95/p99 latency。
- C flags 必須與 production build policy 對齊，不能用 debug build 與 release build 混比。
- Go benchmark 建議搭配 \`benchstat\` 比較 before/after，不只比較不同語言。

## Risk Notes

本報告是本機一次真實測試產物。它可以作為教材中的正式報告範例與測試方法證據，但若要作為採購、架構選型或工業現場部署決策，需在目標硬體、目標 OS、目標 compiler/runtime 版本與真實 payload 下重跑。
REPORT

cat >"$REPORT_DIR/README.md" <<INDEX
# 測試報告索引

此資料夾保存可追溯的真實測試報告與 raw output。

## 最新正式報告

| 日期時間 | 報告 | 測試程式 | Raw output |
|---|---|---|---|
| $FULL_TIME | \`$STAMP-C-Python-Go-真實效能測試報告.md\` | \`TestCode/performance-comparison/run-real-benchmark.sh\` | \`raw/$STAMP/\` |

## 重跑方式

\`\`\`bash
./TestCode/performance-comparison/run-real-benchmark.sh
\`\`\`

## 注意事項

- 報告中的數字只代表當次測試環境，不可直接外推為所有專案的語言效能結論。
- 若要做正式架構決策，需在目標硬體、目標 OS、目標 compiler/runtime 與真實 payload 下重跑。
INDEX

echo "$REPORT_FILE"
