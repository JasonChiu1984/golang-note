# C / Python / Go Performance Comparison

這個資料夾提供可重跑的最小 benchmark 範例，用來支援 `docs/c-python-go-performance-supplement.html` 的效能比較說明。

## 目的

- 使用同一個整數運算 workload 比較 C、Python、Go 的 CPU-bound 路徑。
- 使用 Swift / Metal 補充 GPU data-parallel workload，示範 CPU baseline、GPU kernel time 與 GPU total time 應分開記錄。
- 示範 benchmark 應記錄 command、資料量、語言版本、compiler flags 與原始結果。
- 這不是跨平台固定倍率結論；正式報告必須在目標硬體與作業系統重跑。

## 執行方式

```bash
cd examples/performance-comparison

clang -O2 c/bench.c -o /tmp/bench-c
/tmp/bench-c

go test -bench=. -benchmem -count=10 ./go

python3 python/bench.py

swiftc -O -module-cache-path /tmp/golang-perf-module-cache \
  -framework Metal -framework Foundation \
  gpu/bench.swift -o /tmp/bench-gpu-metal
GPU_ELEMENTS=1048576 GPU_ROUNDS=128 /tmp/bench-gpu-metal
```

## 正式測試程式

若需要產出含 CPU、GPU、OS、compiler、flags、Go/Python/Swift 版本、資料量與 raw output 的正式報告，請從 repo root 執行：

```bash
./TestCode/performance-comparison/run-real-benchmark.sh
```

報告會輸出到 `測試報告/`，raw stdout 會保存到 `測試報告/raw/<timestamp>/`。

## 報告必填

| 欄位 | 範例 |
|---|---|
| CPU | Apple M-series / Intel Xeon / AMD EPYC |
| OS | macOS / Linux / Windows |
| C compiler / flags | `clang -O2` |
| Go version | `go version` |
| Python version | `python3 --version` |
| Data size | `iterations=50000000` |
| GPU | GPU 型號、核心數、Metal/CUDA/OpenCL 狀態 |
| GPU workload | elements、rounds、kernel time、total time |
| Raw result | 貼上完整 stdout |

## GPU 比較限制

GPU benchmark 使用 data-parallel hash kernel，和 C / Go / Python 的 sequential CPU loop 不是同一種演算法形態。正式比較時應依實際需求拆成：

- CPU sequential hot path。
- CPU data-parallel baseline。
- GPU kernel elapsed。
- GPU total elapsed，包含 dispatch、同步與 readback。
- 真實服務延遲，例如 Modbus / OPC UA / BACnet polling、資料庫寫入或 API p95 / p99。
