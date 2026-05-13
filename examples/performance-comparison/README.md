# C / Python / Go Performance Comparison

這個資料夾提供可重跑的最小 benchmark 範例，用來支援 `docs/c-python-go-performance-supplement.html` 的效能比較說明。

## 目的

- 使用同一個整數運算 workload 比較 C、Python、Go 的 CPU-bound 路徑。
- 示範 benchmark 應記錄 command、資料量、語言版本、compiler flags 與原始結果。
- 這不是跨平台固定倍率結論；正式報告必須在目標硬體與作業系統重跑。

## 執行方式

```bash
cd examples/performance-comparison

clang -O2 c/bench.c -o /tmp/bench-c
/tmp/bench-c

go test -bench=. -benchmem -count=10 ./go

python3 python/bench.py
```

## 報告必填

| 欄位 | 範例 |
|---|---|
| CPU | Apple M-series / Intel Xeon / AMD EPYC |
| OS | macOS / Linux / Windows |
| C compiler / flags | `clang -O2` |
| Go version | `go version` |
| Python version | `python3 --version` |
| Data size | `iterations=50000000` |
| Raw result | 貼上完整 stdout |
