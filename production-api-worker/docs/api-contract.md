# production-api-worker API Contract

> 版本：v1.0.18 ｜ 基準日期：2026-05-13 ｜ 適用範圍：local memory mode、Postgres + OTLP mode

這份文件固定 `production-api-worker` 對外可見的 HTTP 合約。內部 service、repository、queue、lifecycle、panic recovery、retry 或 observability 可以重構，但下列 endpoint、status code、JSON shape、錯誤 code、request correlation header、readiness 與 cancellation 行為需要透過 contract test 保護。

## Compatibility Rules

| 規則 | 說明 |
|---|---|
| 向後相容新增 | 可新增 response 欄位，但不得移除或改名既有欄位 |
| Request decoding | `POST /jobs` 只接受單一 JSON object；malformed JSON、unknown field、trailing JSON value 與空白 `name` 都必須回 `400 invalid_input` |
| 錯誤分支 | client 應依 `error.code` 判斷，不依自然語言 message |
| Status enum | `pending`、`processing`、`done`、`failed` 是穩定字串 |
| Request correlation | server 必須回傳 `X-Request-ID`；client 提供時需原樣保留 |
| Readiness lifecycle | draining 時 `/readyz` 必須回 `503`，讓外部導流系統停止送新 request |
| Panic recovery | 未預期 panic 必須回 `500` 與穩定 `internal_error` JSON，不暴露 panic 細節 |
| Request timeout | handler deadline exceeded 必須回 `504 request_timeout`，不得漂移成 `500 internal_error` |
| Startup configuration | `PORT`、`QUEUE_SIZE`、`WORKERS` 與 DB pool 設定必須先驗證；錯誤設定 fail fast，不可 silent fallback |
| Worker shutdown | queue close 與 enqueue send 必須同步，shutdown 後新 enqueue 回穩定錯誤 |
| Retry cancellation | deadlock retry 的 backoff 必須尊重 `context` cancellation / deadline |
| Breaking change | 需新增版本路由或遷移期，不能直接覆蓋既有合約 |
| Release gate | 任何 handler、service retry 或 queue lifecycle 改動都要跑 contract / cancellation / shutdown safety test |

## Request Correlation

所有 endpoint 都回傳 `X-Request-ID`：

- Client 提供 `X-Request-ID` 時，server 原樣回傳同一個值。
- Client 未提供時，server 產生 `req-*` 格式 ID。
- 同一個 ID 會放進 request context、structured log 欄位 `request_id` 與 trace attribute `request.id`。

```http
X-Request-ID: request-from-client
```

## Error Envelope

所有錯誤回應使用相同格式：

```json
{
  "error": {
    "code": "invalid_input",
    "message": "invalid input"
  }
}
```

| Code | HTTP status | 觸發條件 |
|---|---:|---|
| `invalid_input` | 400 | JSON 無法解析、unknown field、trailing JSON value、缺少/空白 `name`、payload 超過限制 |
| `not_found` | 404 | 查詢不存在的 job |
| `queue_full` | 503 | bounded queue 無法接受新工作 |
| `request_timeout` | 504 | request context deadline exceeded |
| `internal_error` | 500 | 未分類的伺服器錯誤或 handler panic recovery |

## POST /jobs

建立 job 並排入 worker queue。

### Request

```http
POST /jobs
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "name": "resize",
  "payload": "image"
}
```

| 欄位 | 型別 | 必填 | 限制 |
|---|---|---|---|
| `name` | string | 是 | 不可為空 |
| `payload` | string | 否 | 最大 4096 bytes |

Request body 必須是單一 JSON object；多個 JSON value、未知欄位或格式錯誤都視為 `invalid_input`。

### Success Response

```http
202 Accepted
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "id": "job-1",
  "name": "resize",
  "payload": "image",
  "status": "pending",
  "attempts": 0,
  "created_at": "2026-05-13T06:03:49Z",
  "updated_at": "2026-05-13T06:03:49Z"
}
```

## GET /jobs/{id}

查詢 job 目前狀態。

### Success Response

```http
200 OK
Content-Type: application/json
```

Response schema 與 `POST /jobs` 成功回應相同。

### Not Found

```http
404 Not Found
Content-Type: application/json
```

```json
{
  "error": {
    "code": "not_found",
    "message": "not found"
  }
}
```

## Health and Metrics

| Endpoint | Status | 用途 |
|---|---:|---|
| `GET /livez` | 200 | process 存活檢查 |
| `GET /readyz` | 200 | readiness 檢查，可接新 request |
| `GET /readyz` | 503 | draining，停止接新流量並等待既有工作收斂 |
| `GET /metrics` | 200 | Prometheus metrics |

## Startup Configuration

`api-worker` 啟動前會先驗證環境變數。這些設定雖然不是 HTTP response schema，但會直接影響操作合約、容量規劃與 incident 排查。

| Env | 預設值 | 驗證 |
|---|---:|---|
| `PORT` | `8080` | TCP port `1-65535` |
| `QUEUE_SIZE` | `64` | 正整數 |
| `WORKERS` | `4` | 正整數 |
| `DATABASE_URL` | 空字串 | 空字串時使用 memory store |
| `DATABASE_MAX_OPEN_CONNS` | `25` | 正整數 |
| `DATABASE_MAX_IDLE_CONNS` | `10` | 正整數，且不可大於 `DATABASE_MAX_OPEN_CONNS` |
| `DATABASE_CONN_MAX_LIFETIME` | `30m0s` | 正數 duration，例如 `30m` 或 `1h` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 空字串 | 空字串時使用 stdout trace exporter |

錯誤設定必須讓 process fail fast，例如 `PORT=http`、`QUEUE_SIZE=0`、`WORKERS=-1`、`DATABASE_MAX_IDLE_CONNS > DATABASE_MAX_OPEN_CONNS` 或 `DATABASE_CONN_MAX_LIFETIME=soon` 不應被靜默改成預設值。

## Panic Recovery

若 handler、service 或 queue 發生未預期 panic，API 必須保留 request correlation 並回傳穩定錯誤格式。

```http
500 Internal Server Error
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal error"
  }
}
```

## Request Timeout

若 handler 內部 request deadline 到期，API 必須明確回 timeout 合約，避免使用端把 timeout 當成未知伺服器錯誤處理。

```http
504 Gateway Timeout
Content-Type: application/json
X-Request-ID: request-from-client
```

```json
{
  "error": {
    "code": "request_timeout",
    "message": "request timeout"
  }
}
```

## Contract Test Gate

```bash
cd production-api-worker
go test ./internal/api -run 'Test.*Contract' -count=1
go test ./internal/config -count=1
go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1
```

這個 gate 固定：

- `POST /jobs` 成功時回傳 `202 Accepted` 與穩定 job JSON 欄位。
- 不合法 request 回傳 `400` 與 `error.code=invalid_input`，包含 malformed JSON、unknown field、trailing JSON value 與空白 `name`。
- 查詢不存在 job 回傳 `404` 與 `error.code=not_found`。
- queue 滿載時回傳 `503` 與 `error.code=queue_full`。
- 錯誤與成功回應都維持 `Content-Type: application/json`。
- client 提供的 `X-Request-ID` 需原樣回傳；未提供時需自動產生 `req-*`。
- draining 時 `/readyz` 需回 `503 Service Unavailable`，避免 shutdown 期間仍接收新流量。
- handler panic 需回 `500 internal_error` JSON，並保留原 `X-Request-ID`。
- request deadline exceeded 需回 `504 request_timeout`，並保留原 `X-Request-ID`。
- 啟動設定需固定預設值、合法 env 與錯誤設定 fail-fast 行為。
- deadlock retry backoff 遇到 context cancellation / deadline 時需停止，不得繼續重試或 enqueue。
- queue shutdown 期間不可發生 `send on closed channel`；close 後新 enqueue 需回穩定錯誤。
