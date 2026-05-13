#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CASE_DIR="$ROOT_DIR/examples/performance-comparison"
STAMP="$(date '+%Y-%m-%d-%H%M%S')"
FULL_TIME="$(date '+%Y-%m-%d %H:%M:%S %z')"
UTC_TIME="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
REPORT_DIR="$ROOT_DIR/測試報告"
RAW_DIR="$REPORT_DIR/raw/$STAMP"
REPORT_FILE="$REPORT_DIR/$STAMP-C-Python-Go-GPU-真實效能測試報告.md"
ITERATIONS="50000000"
C_FLAGS_O2="-O2"
C_FLAGS_O3="-O3"
GO_BENCH_COUNT="${GO_BENCH_COUNT:-5}"
GPU_ELEMENTS="${GPU_ELEMENTS:-1048576}"
GPU_ROUNDS="${GPU_ROUNDS:-128}"

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

format_speedup() {
  awk -v base="$1" -v value="$2" 'BEGIN {
    if (base == "" || value == "" || value == 0) {
      print "n/a"
    } else {
      printf "%.2fx", base / value
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
    displays="$(system_profiler SPDisplaysDataType -detailLevel mini 2>/dev/null || true)"
    echo "gpu_model=$(printf '%s\n' "$displays" | sed -nE 's/^[[:space:]]*Chipset Model:[[:space:]]*(.*)/\1/p' | head -n 1)"
    echo "gpu_type=$(printf '%s\n' "$displays" | sed -nE 's/^[[:space:]]*Type:[[:space:]]*(.*)/\1/p' | head -n 1)"
    echo "gpu_cores=$(printf '%s\n' "$displays" | sed -nE 's/^[[:space:]]*Total Number of Cores:[[:space:]]*(.*)/\1/p' | head -n 1)"
    echo "gpu_metal=$(printf '%s\n' "$displays" | sed -nE 's/^[[:space:]]*Metal( Support)?:[[:space:]]*(.*)/\2/p' | head -n 1)"
  fi
  echo "online_processors=$(getconf _NPROCESSORS_ONLN 2>/dev/null || true)"
} >"$RAW_DIR/environment.txt"

if command -v system_profiler >/dev/null 2>&1; then
  capture "$RAW_DIR/gpu-system-profiler.txt" system_profiler SPDisplaysDataType -detailLevel mini
else
  printf 'system_profiler unavailable\n' >"$RAW_DIR/gpu-system-profiler.txt"
fi

capture "$RAW_DIR/clang-version.txt" clang --version
capture "$RAW_DIR/go-version.txt" go version
capture "$RAW_DIR/python-version.txt" python3 --version
if command -v swiftc >/dev/null 2>&1; then
  capture "$RAW_DIR/swift-version.txt" swiftc --version
else
  printf 'swiftc unavailable\n' >"$RAW_DIR/swift-version.txt"
fi

capture_shell "$RAW_DIR/gpu-runtime-probe.txt" "command -v nvidia-smi || true; command -v swiftc || true; xcrun --find metal || true; python3 -c \"import importlib.util as u; print('torch=' + str(bool(u.find_spec('torch')))); print('cupy=' + str(bool(u.find_spec('cupy')))); print('numba=' + str(bool(u.find_spec('numba')))); print('tensorflow=' + str(bool(u.find_spec('tensorflow'))))\""

capture_shell "$RAW_DIR/c-o2-build.txt" "cd '$CASE_DIR' && clang $C_FLAGS_O2 c/bench.c -o '$RAW_DIR/bench-c-o2'"
capture "$RAW_DIR/c-o2-run.txt" "$RAW_DIR/bench-c-o2"

capture_shell "$RAW_DIR/c-o3-build.txt" "cd '$CASE_DIR' && clang $C_FLAGS_O3 c/bench.c -o '$RAW_DIR/bench-c-o3'"
capture "$RAW_DIR/c-o3-run.txt" "$RAW_DIR/bench-c-o3"

capture_shell "$RAW_DIR/go-bench.txt" "cd '$CASE_DIR' && TMPDIR='$ROOT_DIR/.tmp' GOCACHE='$ROOT_DIR/.gocache' GOMODCACHE='$ROOT_DIR/.gomodcache' GOFLAGS='-ldflags=-linkmode=external' go test -bench=. -benchmem -count=$GO_BENCH_COUNT ./go"
capture_shell "$RAW_DIR/python-run.txt" "cd '$CASE_DIR' && python3 python/bench.py"

gpu_status="skipped"
if command -v swiftc >/dev/null 2>&1 && [[ -f "$CASE_DIR/gpu/bench.swift" ]]; then
  mkdir -p "$RAW_DIR/swift-module-cache"
  if capture_shell "$RAW_DIR/gpu-metal-build.txt" "cd '$CASE_DIR' && swiftc -O -module-cache-path '$RAW_DIR/swift-module-cache' -framework Metal -framework Foundation gpu/bench.swift -o '$RAW_DIR/bench-gpu-metal'"; then
    if capture_shell "$RAW_DIR/gpu-metal-run.txt" "GPU_ELEMENTS='$GPU_ELEMENTS' GPU_ROUNDS='$GPU_ROUNDS' '$RAW_DIR/bench-gpu-metal'"; then
      gpu_status="通過"
    else
      gpu_status="執行失敗"
    fi
  else
    gpu_status="編譯失敗"
    printf 'gpu metal build failed; see gpu-metal-build.txt\n' >"$RAW_DIR/gpu-metal-run.txt"
  fi
else
  printf 'swiftc or gpu/bench.swift unavailable\n' >"$RAW_DIR/gpu-metal-build.txt"
  printf 'gpu benchmark skipped\n' >"$RAW_DIR/gpu-metal-run.txt"
fi

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
gpu_result="$(first_match 'language=SwiftMetal' "$RAW_DIR/gpu-metal-run.txt")"
gpu_cpu_seconds="$(sed -nE 's/.*cpu_seconds=([0-9.]+).*/\1/p' "$RAW_DIR/gpu-metal-run.txt" | head -n 1)"
gpu_kernel_seconds="$(sed -nE 's/.*gpu_kernel_seconds=([0-9.]+).*/\1/p' "$RAW_DIR/gpu-metal-run.txt" | head -n 1)"
gpu_total_seconds="$(sed -nE 's/.*gpu_total_seconds=([0-9.]+).*/\1/p' "$RAW_DIR/gpu-metal-run.txt" | head -n 1)"
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
swift_version="$(sed -n '2p' "$RAW_DIR/swift-version.txt")"
gpu_model="$(sed -nE 's/^gpu_model=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
gpu_cores="$(sed -nE 's/^gpu_cores=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"
gpu_metal="$(sed -nE 's/^gpu_metal=(.*)/\1/p' "$RAW_DIR/environment.txt" | head -n 1)"

cat >"$REPORT_FILE" <<REPORT
# C / Python / Go / GPU 真實效能測試報告

| 項目 | 內容 |
|---|---|
| 測試日期 | ${STAMP:0:10} |
| 完整日期時間 | $FULL_TIME |
| UTC 時間 | $UTC_TIME |
| 測試程式 | \`TestCode/performance-comparison/run-real-benchmark.sh\` |
| CPU Workload | 64-bit integer sequential hash loop |
| CPU Iterations | $ITERATIONS |
| GPU Workload | Metal data-parallel hash kernel |
| GPU Elements / Rounds | $GPU_ELEMENTS / $GPU_ROUNDS |
| Raw output 目錄 | \`測試報告/raw/$STAMP/\` |

## Executive Summary

本報告由真實測試程式自動產生，所有數字都來自本機命令輸出。CPU 語言比較使用 sequential CPU-bound microbenchmark；GPU 比較使用 Metal data-parallel hash kernel。兩者 workload 不同，GPU 數字用於說明資料平行工作負載的加速特性，不可直接與 sequential C / Go / Python loop 混成單一倍率結論。

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
| Swift / Metal toolchain | ${swift_version:-未取得} | GPU benchmark 需 Swift + Metal framework |
| GPU | ${gpu_model:-未取得} | GPU 核心數、記憶體頻寬與 driver/runtime 會影響結果 |
| GPU cores | ${gpu_cores:-未取得} | data-parallel kernel 可受 GPU core 數影響 |
| Metal | ${gpu_metal:-未取得} | macOS GPU compute runtime 可用性 |
| C flags | \`$C_FLAGS_O2\`、\`$C_FLAGS_O3\` | 最佳化、連結與安全選項會改變 hot path |
| Go bench count | \`$GO_BENCH_COUNT\` | 重複次數越多越能觀察穩定性 |
| 資料量 | \`iterations=$ITERATIONS\` | 小資料容易被啟動與 cache effect 主導 |
| GPU 資料量 | \`elements=$GPU_ELEMENTS rounds=$GPU_ROUNDS\` | 小資料容易被 kernel dispatch 與資料同步成本主導 |

## 測試程式與 Workflow

1. 編譯 C O2：\`clang $C_FLAGS_O2 c/bench.c\`
2. 執行 C O2 workload。
3. 編譯 C O3：\`clang $C_FLAGS_O3 c/bench.c\`
4. 執行 C O3 workload。
5. 執行 Go benchmark：\`go test -bench=. -benchmem -count=$GO_BENCH_COUNT ./go\`
6. 執行 Python workload：\`python3 python/bench.py\`
7. 編譯 GPU benchmark：\`swiftc -O -module-cache-path <raw>/swift-module-cache -framework Metal -framework Foundation gpu/bench.swift\`
8. 執行 Metal data-parallel hash workload。
9. 收集 raw stdout 到 \`測試報告/raw/$STAMP/\`。
10. 產生本 Markdown 測試報告。

## CPU 語言結果摘要

| 語言 / 模式 | 實測結果 | 換算秒數 | 相對於 C O2 |
|---|---:|---:|---:|
| C \`$C_FLAGS_O2\` | \`${c_o2_result:-未取得}\` | ${c_o2_seconds:-n/a} | 1.00x |
| C \`$C_FLAGS_O3\` | \`${c_o3_result:-未取得}\` | ${c_o3_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$c_o3_seconds") |
| Go benchmark | \`${go_result:-未取得}\` | ${go_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$go_seconds") |
| Python | \`${python_result:-未取得}\` | ${python_seconds:-n/a} | $(format_ratio "$c_o2_seconds" "$python_seconds") |

## GPU 比較結果摘要

| 項目 | 實測內容 |
|---|---|
| GPU benchmark 狀態 | $gpu_status |
| GPU 實測結果 | \`${gpu_result:-未取得，請查看 gpu-metal-run.txt}\` |
| CPU data-parallel baseline | ${gpu_cpu_seconds:-n/a} 秒 |
| GPU kernel elapsed | ${gpu_kernel_seconds:-n/a} 秒 |
| GPU total elapsed | ${gpu_total_seconds:-n/a} 秒 |
| GPU kernel speedup vs CPU baseline | $(format_speedup "$gpu_cpu_seconds" "$gpu_kernel_seconds") |
| GPU total speedup vs CPU baseline | $(format_speedup "$gpu_cpu_seconds" "$gpu_total_seconds") |

GPU baseline 與既有 C / Go / Python CPU loop 的演算法形態不同：GPU 測的是可平行拆分的 vector workload，CPU 語言比較測的是 sequential hash loop。正式工程判斷應依實際 workload 重新設計 benchmark。

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

### GPU System Profiler

\`\`\`text
$(cat "$RAW_DIR/gpu-system-profiler.txt")
\`\`\`

### GPU Runtime Probe

\`\`\`text
$(cat "$RAW_DIR/gpu-runtime-probe.txt")
\`\`\`

### Swift Version

\`\`\`text
$(cat "$RAW_DIR/swift-version.txt")
\`\`\`

### GPU Metal Build

\`\`\`text
$(cat "$RAW_DIR/gpu-metal-build.txt")
\`\`\`

### GPU Metal Run

\`\`\`text
$(cat "$RAW_DIR/gpu-metal-run.txt")
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
| GPU Metal benchmark | $gpu_status |
| Raw output 保存 | 通過，位於 \`測試報告/raw/$STAMP/\` |
| 報告欄位完整性 | 已包含 CPU、GPU、OS、compiler、flags、Go/Python/Swift version、資料量與 raw output |

## Troubleshooting

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| \`clang\` 不存在 | Xcode Command Line Tools 未安裝 | 安裝 Command Line Tools 或改用可用 C compiler |
| Go benchmark 失敗 | Go cache 或 module cache 權限問題 | 使用 repo-local \`TMPDIR/GOCACHE/GOMODCACHE\` |
| Python 結果很慢 | CPython interpreter 執行 50M loop 成本高 | 降低 iterations 或改測 I/O-bound workload |
| Swift/Metal 編譯失敗 | module cache 無寫入權限或 Xcode/SDK 版本不一致 | 使用 \`-module-cache-path\` 指到可寫目錄，並確認 Command Line Tools 版本 |
| \`metal_device_unavailable\` | sandbox、headless runtime 或 Metal device 不可用 | 在一般終端機或允許 GPU 存取的環境重跑 |
| 結果波動大 | 背景程序、CPU turbo、溫控、電源模式 | 固定電源、關閉重負載背景程序、增加 count |

## Best Practices

- 不用單次數字當正式架構決策依據，至少重跑多輪並保留 raw output。
- CPU-bound microbenchmark 不代表 Modbus、OPC UA、BACnet、SCADA gateway 這類 I/O-bound 系統。
- 若要比較服務吞吐量，應改用 loopback TCP listener、固定 payload、連線數、timeout、retry 與 p95/p99 latency。
- C flags 必須與 production build policy 對齊，不能用 debug build 與 release build 混比。
- Go benchmark 建議搭配 \`benchstat\` 比較 before/after，不只比較不同語言。
- GPU benchmark 必須把 kernel time、資料傳輸/同步 time、CPU fallback time 分開記錄。
- 工業自動化服務常見瓶頸是 I/O wait、device timeout、資料庫寫入或網路抖動；GPU 只適合影像、AI inference、批次分析與大規模 data-parallel 計算。

## Risk Notes

本報告是本機一次真實測試產物。它可以作為教材中的正式報告範例與測試方法證據，但若要作為採購、架構選型或工業現場部署決策，需在目標硬體、目標 OS、目標 compiler/runtime 版本、GPU runtime 與真實 payload 下重跑。
REPORT

cat >"$REPORT_DIR/README.md" <<INDEX
# 測試報告索引

此資料夾保存可追溯的真實測試報告與 raw output。

## 最新正式報告

| 日期時間 | 報告 | 測試程式 | Raw output |
|---|---|---|---|
| $FULL_TIME | \`$STAMP-C-Python-Go-GPU-真實效能測試報告.md\` | \`TestCode/performance-comparison/run-real-benchmark.sh\` | \`raw/$STAMP/\` |

## 重跑方式

\`\`\`bash
./TestCode/performance-comparison/run-real-benchmark.sh
\`\`\`

## 注意事項

- 報告中的數字只代表當次測試環境，不可直接外推為所有專案的語言效能結論。
- 若要做正式架構決策，需在目標硬體、目標 OS、目標 compiler/runtime 與真實 payload 下重跑。
INDEX

echo "$REPORT_FILE"
