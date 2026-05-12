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

func TestCreateJobContract(t *testing.T) {
	handler := newContractHandler(t, nil)

	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.Header.Set(requestIDHeader, "request-from-client")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusAccepted, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type = %q, want application/json", ct)
	}
	if got := rec.Header().Get(requestIDHeader); got != "request-from-client" {
		t.Fatalf("request id header = %q, want request-from-client", got)
	}

	var job domain.Job
	if err := json.NewDecoder(rec.Body).Decode(&job); err != nil {
		t.Fatal(err)
	}
	if job.ID != "contract-job-1" || job.Name != "resize" || job.Payload != "image" || job.Status != domain.JobPending {
		t.Fatalf("unexpected contract response: %+v", job)
	}
}

func TestRequestIDContract(t *testing.T) {
	handler := newContractHandler(t, nil)

	req := httptest.NewRequest(http.MethodGet, "/jobs/missing", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	if got := rec.Header().Get(requestIDHeader); !strings.HasPrefix(got, "req-") {
		t.Fatalf("generated request id header = %q, want req-*", got)
	}
}

func TestErrorContract(t *testing.T) {
	tests := []struct {
		name       string
		handler    http.Handler
		request    *http.Request
		wantStatus int
		wantCode   string
	}{
		{
			name:       "invalid input",
			handler:    newContractHandler(t, nil),
			request:    httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"payload":"image"}`)),
			wantStatus: http.StatusBadRequest,
			wantCode:   "invalid_input",
		},
		{
			name:       "not found",
			handler:    newContractHandler(t, nil),
			request:    httptest.NewRequest(http.MethodGet, "/jobs/missing", nil),
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "queue full",
			handler:    newContractHandler(t, domain.ErrQueueFull),
			request:    httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`)),
			wantStatus: http.StatusServiceUnavailable,
			wantCode:   "queue_full",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			tt.handler.ServeHTTP(rec, tt.request)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
				t.Fatalf("content-type = %q, want application/json", ct)
			}

			var response errorResponse
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatal(err)
			}
			if response.Error.Code != tt.wantCode {
				t.Fatalf("error code = %q, want %q", response.Error.Code, tt.wantCode)
			}
			if response.Error.Message == "" {
				t.Fatal("error message must not be empty")
			}
		})
	}
}

func newContractHandler(t *testing.T, enqueueErr error) http.Handler {
	t.Helper()
	obs := newTestObs(t)
	service := app.NewService(
		repository.NewMemoryStore(),
		fakeQueue{err: enqueueErr},
		obs,
		func() string { return "contract-job-1" },
	)
	return NewHandler(service, obs).Routes()
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

type fakeQueue struct {
	err error
}

func (q fakeQueue) Enqueue(ctx context.Context, task worker.Task) error {
	return q.err
}
