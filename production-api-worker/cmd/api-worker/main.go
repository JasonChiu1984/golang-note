package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"time"

	"golang-learning-notes/production-api-worker/internal/api"
	"golang-learning-notes/production-api-worker/internal/app"
	"golang-learning-notes/production-api-worker/internal/observability"
	"golang-learning-notes/production-api-worker/internal/repository"
	"golang-learning-notes/production-api-worker/internal/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	obs, err := observability.NewWithConfig(ctx, observability.Config{
		ServiceName:  "production-api-worker",
		OTLPEndpoint: os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
		TraceOut:     os.Stdout,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer obs.Shutdown(context.Background())

	store, cleanup, err := openStore(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer cleanup()

	var service *app.Service
	queue := worker.New(envInt("QUEUE_SIZE", 64), func(ctx context.Context, task worker.Task) error {
		return service.ProcessJob(ctx, task)
	}, obs)
	service = app.NewService(store, queue, obs, newID)
	queue.Start(ctx, envInt("WORKERS", 4))
	defer queue.Shutdown()

	server := &http.Server{
		Addr:              ":" + envString("PORT", "8080"),
		Handler:           api.NewHandler(service, obs).Routes(),
		ReadHeaderTimeout: 3 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	obs.Logger.Info("server listening", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func openStore(ctx context.Context) (repository.Store, func(), error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return repository.NewMemoryStore(), func() {}, nil
	}
	store, err := repository.OpenPostgres(ctx, dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("open postgres: %w", err)
	}
	return store, func() { _ = store.Close() }, nil
}

func envString(name, fallback string) string {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	return value
}

func envInt(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func newID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return time.Now().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b[:])
}
