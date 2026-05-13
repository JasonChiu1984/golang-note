# 測試報告索引

此資料夾保存可追溯的真實測試報告與 raw output。

## 最新正式報告

| 日期時間 | 報告 | 測試程式 | Raw output |
|---|---|---|---|
| 2026-05-13 22:10:43 +0800 | `2026-05-13-221043-C-Python-Go-GPU-真實效能測試報告.md` | `TestCode/performance-comparison/run-real-benchmark.sh` | `raw/2026-05-13-221043/` |

## 重跑方式

```bash
./TestCode/performance-comparison/run-real-benchmark.sh
```

## 注意事項

- 報告中的數字只代表當次測試環境，不可直接外推為所有專案的語言效能結論。
- 若要做正式架構決策，需在目標硬體、目標 OS、目標 compiler/runtime 與真實 payload 下重跑。
