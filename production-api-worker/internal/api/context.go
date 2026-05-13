package api

import (
	"context"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"
)

var contextWithTimeout = context.WithTimeout

type contextKey string

const (
	requestIDHeader                = "X-Request-ID"
	requestIDContextKey contextKey = "request_id"
	loggerContextKey    contextKey = "logger"
)

var requestIDSequence uint64

func nextRequestID() string {
	sequence := atomic.AddUint64(&requestIDSequence, 1)
	return fmt.Sprintf("req-%d-%06d", time.Now().UnixNano(), sequence)
}

func withRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDContextKey, id)
}

func requestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDContextKey).(string)
	return id
}

func withLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerContextKey, logger)
}

func loggerFromContext(ctx context.Context, fallback *slog.Logger) *slog.Logger {
	logger, _ := ctx.Value(loggerContextKey).(*slog.Logger)
	if logger == nil {
		return fallback
	}
	return logger
}
