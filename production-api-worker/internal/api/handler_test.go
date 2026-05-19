package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func TestReadinessContract(t *testing.T) {
	ready := true
	handler := newContractHandlerWithOptions(t, nil, WithReadiness(func() bool { return ready }))

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("ready status = %d, want %d", rec.Code, http.StatusOK)
	}

	ready = false
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("draining status = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
}

func TestPanicRecoveryContract(t *testing.T) {
	handler := newContractHandlerWithQueue(t, fakeQueue{panicValue: "queue panic"})

	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.Header.Set(requestIDHeader, "panic-request")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusInternalServerError, rec.Body.String())
	}
	if got := rec.Header().Get(requestIDHeader); got != "panic-request" {
		t.Fatalf("request id header = %q, want panic-request", got)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("content-type = %q, want application/json", ct)
	}

	var response errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Error.Code != "internal_error" {
		t.Fatalf("error code = %q, want internal_error", response.Error.Code)
	}
}

func TestRequestDecodingContract(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{
			name: "malformed json",
			body: `{"name":`,
		},
		{
			name: "unknown field",
			body: `{"name":"resize","priority":"high"}`,
		},
		{
			name: "trailing json value",
			body: `{"name":"resize"} {"name":"extra"}`,
		},
		{
			name: "blank name",
			body: `{"name":"   ","payload":"image"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newContractHandler(t, nil)
			req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(tt.body))
			req.Header.Set(requestIDHeader, "decode-request")
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
			if got := rec.Header().Get(requestIDHeader); got != "decode-request" {
				t.Fatalf("request id header = %q, want decode-request", got)
			}

			var response errorResponse
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatal(err)
			}
			if response.Error.Code != "invalid_input" {
				t.Fatalf("error code = %q, want invalid_input", response.Error.Code)
			}
		})
	}
}

func TestRequestBodyLimitContract(t *testing.T) {
	handler := newContractHandlerWithOptions(t, nil, WithRequestBodyLimitBytes(32))
	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"payload-larger-than-limit"}`))
	req.Header.Set(requestIDHeader, "body-limit-request")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusRequestEntityTooLarge, rec.Body.String())
	}
	if got := rec.Header().Get(requestIDHeader); got != "body-limit-request" {
		t.Fatalf("request id header = %q, want body-limit-request", got)
	}

	var response errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Error.Code != "payload_too_large" {
		t.Fatalf("error code = %q, want payload_too_large", response.Error.Code)
	}
}

func TestRequestTimeoutContract(t *testing.T) {
	original := contextWithTimeout
	t.Cleanup(func() { contextWithTimeout = original })
	contextWithTimeout = func(parent context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
		return context.WithDeadline(parent, time.Now().Add(-time.Second))
	}

	handler := newContractHandler(t, nil)
	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.Header.Set(requestIDHeader, "timeout-request")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusGatewayTimeout, rec.Body.String())
	}
	if got := rec.Header().Get(requestIDHeader); got != "timeout-request" {
		t.Fatalf("request id header = %q, want timeout-request", got)
	}

	var response errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Error.Code != "request_timeout" {
		t.Fatalf("error code = %q, want request_timeout", response.Error.Code)
	}
}

func TestSecurityHeadersContract(t *testing.T) {
	handler := newContractHandler(t, nil)
	req := httptest.NewRequest(http.MethodGet, "/livez", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q, want nosniff", got)
	}
	if got := rec.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("X-Frame-Options = %q, want DENY", got)
	}
	if got := rec.Header().Get("Referrer-Policy"); got != "no-referrer" {
		t.Fatalf("Referrer-Policy = %q, want no-referrer", got)
	}
}

func TestCORSAllowedOriginsContract(t *testing.T) {
	handler := newContractHandlerWithOptions(t, nil, WithCORSAllowedOrigins([]string{"https://app.example.com", "http://localhost:5173"}))

	req := httptest.NewRequest(http.MethodOptions, "/jobs", nil)
	req.Header.Set("Origin", "https://app.example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("allowed preflight status = %d, want %d: %s", rec.Code, http.StatusNoContent, rec.Body.String())
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want https://app.example.com", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "POST") || !strings.Contains(got, "OPTIONS") {
		t.Fatalf("Access-Control-Allow-Methods = %q, want POST and OPTIONS", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "Authorization") || !strings.Contains(got, requestIDHeader) {
		t.Fatalf("Access-Control-Allow-Headers = %q, want Authorization and %s", got, requestIDHeader)
	}
	if got := rec.Header().Values("Vary"); !containsHeaderValue(got, "Origin") {
		t.Fatalf("Vary = %v, want Origin", got)
	}

	req = httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.Header.Set("Origin", "https://app.example.com")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("allowed actual request status = %d, want %d: %s", rec.Code, http.StatusAccepted, rec.Body.String())
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("actual Access-Control-Allow-Origin = %q", got)
	}

	req = httptest.NewRequest(http.MethodOptions, "/jobs", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("blocked preflight status = %d, want %d", rec.Code, http.StatusForbidden)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("blocked Access-Control-Allow-Origin = %q, want empty", got)
	}
}

func containsHeaderValue(values []string, want string) bool {
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			if strings.TrimSpace(part) == want {
				return true
			}
		}
	}
	return false
}

func TestAPIKeyAuthContract(t *testing.T) {
	handler := newContractHandlerWithOptions(t, nil, WithAuthToken("secret-token"))

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		auth       string
		wantStatus int
		wantCode   string
	}{
		{
			name:       "protected post without token",
			method:     http.MethodPost,
			path:       "/jobs",
			body:       `{"name":"resize","payload":"image"}`,
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "protected metrics without token",
			method:     http.MethodGet,
			path:       "/metrics",
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "health stays public",
			method:     http.MethodGet,
			path:       "/readyz",
			wantStatus: http.StatusOK,
		},
		{
			name:       "protected post with token",
			method:     http.MethodPost,
			path:       "/jobs",
			body:       `{"name":"resize","payload":"image"}`,
			auth:       "Bearer secret-token",
			wantStatus: http.StatusAccepted,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.auth != "" {
				req.Header.Set("Authorization", tt.auth)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantCode == "" {
				return
			}
			var response errorResponse
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatal(err)
			}
			if response.Error.Code != tt.wantCode {
				t.Fatalf("error code = %q, want %q", response.Error.Code, tt.wantCode)
			}
		})
	}
}

func TestPprofDiagnosticsContract(t *testing.T) {
	disabled := newContractHandler(t, nil)
	req := httptest.NewRequest(http.MethodGet, "/debug/pprof/", nil)
	rec := httptest.NewRecorder()
	disabled.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("disabled pprof status = %d, want %d", rec.Code, http.StatusNotFound)
	}

	enabled := newContractHandlerWithOptions(t, nil, WithPprof(true, "debug-token"))
	rec = httptest.NewRecorder()
	enabled.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("pprof without token status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}

	req = httptest.NewRequest(http.MethodGet, "/debug/pprof/", nil)
	req.Header.Set("Authorization", "Bearer debug-token")
	rec = httptest.NewRecorder()
	enabled.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("pprof with token status = %d, want %d: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "Types of profiles available") {
		t.Fatalf("pprof response missing profile index: %s", rec.Body.String())
	}
}

func TestRateLimitContract(t *testing.T) {
	handler := newContractHandlerWithOptions(t, nil, WithRateLimit(1, time.Minute))

	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.RemoteAddr = "192.0.2.10:1234"
	req.Header.Set(requestIDHeader, "rate-limit-request")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("first request status = %d, want %d: %s", rec.Code, http.StatusAccepted, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.RemoteAddr = "192.0.2.10:1234"
	req.Header.Set(requestIDHeader, "rate-limit-request")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("second request status = %d, want %d: %s", rec.Code, http.StatusTooManyRequests, rec.Body.String())
	}
	if got := rec.Header().Get(requestIDHeader); got != "rate-limit-request" {
		t.Fatalf("request id header = %q, want rate-limit-request", got)
	}
	if got := rec.Header().Get("Retry-After"); got != "60" {
		t.Fatalf("Retry-After = %q, want 60", got)
	}

	var response errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Error.Code != "rate_limited" {
		t.Fatalf("error code = %q, want rate_limited", response.Error.Code)
	}
}

func TestRateLimitTrustedProxyContract(t *testing.T) {
	untrusted := newContractHandlerWithOptions(t, nil, WithRateLimit(1, time.Minute))

	req := httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.RemoteAddr = "203.0.113.10:4567"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	rec := httptest.NewRecorder()
	untrusted.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("first untrusted status = %d, want %d: %s", rec.Code, http.StatusAccepted, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
	req.RemoteAddr = "203.0.113.10:4567"
	req.Header.Set("X-Forwarded-For", "198.51.100.2")
	rec = httptest.NewRecorder()
	untrusted.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("second untrusted status = %d, want %d: %s", rec.Code, http.StatusTooManyRequests, rec.Body.String())
	}

	trusted := newContractHandlerWithOptions(t, nil, WithRateLimit(1, time.Minute), WithTrustedProxyCIDRs([]string{"10.0.0.0/8"}))
	for _, forwarded := range []string{"198.51.100.10", "198.51.100.11"} {
		req = httptest.NewRequest(http.MethodPost, "/jobs", strings.NewReader(`{"name":"resize","payload":"image"}`))
		req.RemoteAddr = "10.0.0.5:4567"
		req.Header.Set("X-Forwarded-For", forwarded)
		rec = httptest.NewRecorder()
		trusted.ServeHTTP(rec, req)
		if rec.Code != http.StatusAccepted {
			t.Fatalf("trusted forwarded %s status = %d, want %d: %s", forwarded, rec.Code, http.StatusAccepted, rec.Body.String())
		}
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
	return newContractHandlerWithOptions(t, enqueueErr)
}

func newContractHandlerWithOptions(t *testing.T, enqueueErr error, options ...Option) http.Handler {
	t.Helper()
	return newContractHandlerWithQueue(t, fakeQueue{err: enqueueErr}, options...)
}

func newContractHandlerWithQueue(t *testing.T, queue fakeQueue, options ...Option) http.Handler {
	t.Helper()
	obs := newTestObs(t)
	service := app.NewService(
		repository.NewMemoryStore(),
		queue,
		obs,
		func() string { return "contract-job-1" },
	)
	return NewHandler(service, obs, options...).Routes()
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
	err        error
	panicValue any
}

func (q fakeQueue) Enqueue(ctx context.Context, task worker.Task) error {
	if q.panicValue != nil {
		panic(q.panicValue)
	}
	return q.err
}
