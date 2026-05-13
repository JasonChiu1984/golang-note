# 真實效能測試程式

此資料夾提供可重跑的正式效能測試 harness，對應 `docs/c-python-go-performance-supplement.html` 的正式測試報告模板。

## 執行方式

```bash
./TestCode/performance-comparison/run-real-benchmark.sh
```

## 輸出

| 輸出 | 說明 |
|---|---|
| `測試報告/<timestamp>-C-Python-Go-真實效能測試報告.md` | 正式 Markdown 測試報告 |
| `測試報告/raw/<timestamp>/` | 完整 raw stdout、版本資訊、環境資訊 |

## 測試範圍

- C `clang -O2`
- C `clang -O3`
- Go `go test -bench=. -benchmem`
- Python `python3`

## 風險說明

這是 CPU-bound microbenchmark。它可以驗證報告流程與比較方法，但不能直接代表 OPC UA、Modbus、BACnet、SCADA gateway 或任何 I/O-bound production service 的真實效能。
