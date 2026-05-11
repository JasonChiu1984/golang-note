# production-api-worker

這是圖解筆記3的可執行 production 範例，示範一個 API + worker 系統如何串起：

- HTTP API：`POST /jobs`、`GET /jobs/{id}`、`GET /metrics`
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

