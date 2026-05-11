package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang-learning-notes/production-api-worker/internal/app"
	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
	"golang-learning-notes/production-api-worker/internal/repository"
	"golang-learning-notes/production-api-worker/internal/worker"
)

func TestCreateJobAndMetrics(t *testing.T) {
	obs := newTestObs(t)
	store := repository.NewMemoryStore()
	var service *app.Service
	queue := worker.New(4, func(ctx context.Context, task worker.Task) error {
		return service.ProcessJob(ctx, task)
	}, obs)
	service = app.NewService(store, queue, obs, func() string { return "job-api-1" })
	queue.Start(context.Background(), 1)
	t.Cleanup(queue.Shutdown)

	handler := NewHandler(service, obs).Routes()
	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("want 202, got %d: %s", rec.Code, rec.Body.String())
	}

	var job domain.Job
	if err := json.NewDecoder(rec.Body).Decode(&job); err != nil {
		t.Fatal(err)
	}
	if job.ID != "job-api-1" {
		t.Fatalf("unexpected job: %+v", job)
	}

	metricsReq := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	metricsRec := httptest.NewRecorder()
	handler.ServeHTTP(metricsRec, metricsReq)
	if metricsRec.Code != http.StatusOK {
		t.Fatalf("metrics returned %d", metricsRec.Code)
	}
	if !strings.Contains(metricsRec.Body.String(), "api_requests_total") {
		t.Fatalf("metrics output missing api_requests_total: %s", metricsRec.Body.String())
	}
}

func newTestObs(t *testing.T) *observability.Observability {
	t.Helper()
	obs, err := observability.New(context.Background(), "test-api", discardWriter{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = obs.Shutdown(context.Background()) })
	return obs
}

type discardWriter struct{}

func (discardWriter) Write(p []byte) (int, error) { return len(p), nil }

