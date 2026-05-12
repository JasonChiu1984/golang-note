# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
- API contract：穩定 request/response/error schema，文件在 `docs/api-contract.md`
- Service transaction boundary：`sql.TxOptions`、deadlock retry、queue enqueue
- Repository：memory 與 Postgres `database/sql` 版本
- Worker queue：bounded queue、worker pool、graceful shutdown
- Observability：Prometheus client、OpenTelemetry OTLP/stdout exporter、slog
- Pipeline：migration CLI、Docker Compose、GitHub Actions

## Local Memory Mode

```bash
go test ./...
go run ./cmd/api-worker
```

## Postgres + OTLP Mode

```bash
docker compose up --build
```

Then:

```bash
curl -X POST http://localhost:8080/jobs \
  -H 'Content-Type: application/json' \
  -d '{"name":"resize","payload":"image"}'

curl http://localhost:8080/metrics
```

## Migration

```bash
DATABASE_URL='postgres://app:app@localhost:5432/app?sslmode=disable' go run ./cmd/migrate
```

## Release Quality Gate

```bash
go mod tidy
go mod verify
go list -m -u all
govulncheck ./...
go test ./internal/api -run 'Test.*Contract' -count=1
go test -race -cover ./...
go test -run='^$' -bench=. -benchmem -count=10 ./... > bench.txt
docker compose up --build
```

| Gate | 目的 |
|---|---|
| `go mod verify` | 確認 module cache 與 `go.sum` hash 一致 |
| `go list -m -u all` | 發現可更新依賴並建立維護紀錄 |
| `govulncheck ./...` | 掃描 API / worker 實際可達的已知漏洞 |
| `go test ./internal/api -run 'Test.*Contract' -count=1` | 固定 HTTP status、JSON shape、錯誤 code 與 response header |
| `go test -race -cover ./...` | 驗證 service、handler、queue 與併發安全 |
| `go test -run='^$' -bench=. -benchmem -count=10 ./...` | API / worker 效能改動需保留 benchmark 證據 |
| `docker compose up --build` | 驗證 Postgres、migration、API、worker、metrics 整體鏈路 |

## API Contract

對外 API 合約請先看 `docs/api-contract.md`。任何 handler、domain status、錯誤處理或 route label 調整，都要先判斷是否改變該文件列出的外部行為。

| 合約項 | 目前策略 |
|---|---|
| Success response | 保持 `id`、`name`、`payload`、`status` 欄位向後相容 |
| Error response | 統一使用 `{"error":{"code":"...","message":"..."}}` |
| Status enum | `pending`、`processing`、`done`、`failed` 不任意改名 |
| Breaking change | 新增版本路由或遷移期，不直接覆蓋既有合約 |

## Performance Diagnostics

| 場景 | 建議工具 |
|---|---|
| API handler CPU 高 | `go tool pprof` CPU profile |
| queue 或 worker throughput 下降 | benchmark A/B + `benchstat` |
| worker goroutine 數量異常 | goroutine profile + `/sched/goroutines:goroutines` |
| repository lock contention | mutex profile |
| request latency 長尾 | OpenTelemetry span + execution trace |
