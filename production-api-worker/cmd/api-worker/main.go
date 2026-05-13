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
	"time"

	"golang-learning-notes/production-api-worker/internal/api"
	"golang-learning-notes/production-api-worker/internal/app"
	"golang-learning-notes/production-api-worker/internal/config"
	"golang-learning-notes/production-api-worker/internal/lifecycle"
	"golang-learning-notes/production-api-worker/internal/observability"
	"golang-learning-notes/production-api-worker/internal/repository"
	"golang-learning-notes/production-api-worker/internal/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	obs, err := observability.NewWithConfig(ctx, observability.Config{
		ServiceName:  "production-api-worker",
		OTLPEndpoint: cfg.OTLPEndpoint,
		TraceOut:     os.Stdout,
	})
	if err != nil {
		log.Fatal(err)
	}
	defer obs.Shutdown(context.Background())

	store, cleanup, err := openStore(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer cleanup()

	readiness := lifecycle.NewReadiness()
	workerCtx, cancelWorkers := context.WithCancel(context.Background())
	defer cancelWorkers()

	var service *app.Service
	queue := worker.New(cfg.QueueSize, func(ctx context.Context, task worker.Task) error {
		return service.ProcessJob(ctx, task)
	}, obs)
	service = app.NewService(store, queue, obs, newID)
	queue.Start(workerCtx, cfg.Workers)
	defer queue.Shutdown()

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           api.NewHandler(service, obs, api.WithReadiness(readiness.Ready)).Routes(),
		ReadHeaderTimeout: 3 * time.Second,
	}

	shutdownDone := make(chan struct{})
	go func() {
		defer close(shutdownDone)
		<-ctx.Done()
		readiness.MarkDraining()
		obs.Logger.Info("shutdown signal received, draining service")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := server.Shutdown(shutdownCtx); err != nil {
			obs.Logger.Error("http server shutdown failed", "error", err)
		}
		cancel()

		queueCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := queue.ShutdownContext(queueCtx); err != nil {
			obs.Logger.Error("worker queue drain timed out", "error", err)
			cancelWorkers()
			_ = queue.ShutdownContext(context.Background())
		}
		cancel()
	}()

	obs.Logger.Info("server listening", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	if ctx.Err() != nil {
		<-shutdownDone
	}
}

func openStore(ctx context.Context, cfg config.Config) (repository.Store, func(), error) {
	if cfg.DatabaseURL == "" {
		return repository.NewMemoryStore(), func() {}, nil
	}
	store, err := repository.OpenPostgresWithPool(ctx, cfg.DatabaseURL, repository.PoolConfig{
		MaxOpenConns:    cfg.DatabaseMaxOpenConns,
		MaxIdleConns:    cfg.DatabaseMaxIdleConns,
		ConnMaxLifetime: cfg.DatabaseConnMaxLifetime,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("open postgres: %w", err)
	}
	return store, func() { _ = store.Close() }, nil
}

func newID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return time.Now().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b[:])
}
