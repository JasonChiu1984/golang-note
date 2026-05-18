package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/pprof"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"golang-learning-notes/production-api-worker/internal/app"
	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
)

type Handler struct {
	service   *app.Service
	obs       *observability.Observability
	ready     func() bool
	authToken string
	pprof     pprofConfig
	limiter   *rateLimiter
	proxies   trustedProxyConfig
	cors      corsConfig
}

type Option func(*Handler)

type pprofConfig struct {
	enabled bool
	token   string
}

func WithReadiness(ready func() bool) Option {
	return func(h *Handler) {
		if ready != nil {
			h.ready = ready
		}
	}
}

func WithAuthToken(token string) Option {
	return func(h *Handler) {
		h.authToken = strings.TrimSpace(token)
	}
}

func WithPprof(enabled bool, token string) Option {
	return func(h *Handler) {
		h.pprof = pprofConfig{
			enabled: enabled,
			token:   strings.TrimSpace(token),
		}
	}
}

func WithRateLimit(limit int, window time.Duration) Option {
	return func(h *Handler) {
		h.limiter = newRateLimiter(limit, window)
	}
}

func WithTrustedProxyCIDRs(cidrs []string) Option {
	return func(h *Handler) {
		h.proxies = newTrustedProxyConfig(cidrs)
	}
}

func WithCORSAllowedOrigins(origins []string) Option {
	return func(h *Handler) {
		h.cors = newCORSConfig(origins)
	}
}

func NewHandler(service *app.Service, obs *observability.Observability, options ...Option) *Handler {
	handler := &Handler{
		service: service,
		obs:     obs,
		ready:   func() bool { return true },
		limiter: newRateLimiter(120, time.Minute),
	}
	for _, option := range options {
		option(handler)
	}
	return handler
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /jobs", h.createJob)
	mux.HandleFunc("GET /jobs/{id}", h.getJob)
	mux.Handle("GET /metrics", h.obs.MetricsHandler())
	mux.HandleFunc("GET /livez", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("GET /readyz", h.readyz)
	if h.pprof.enabled {
		mux.HandleFunc("GET /debug/pprof/", pprof.Index)
		mux.HandleFunc("GET /debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("GET /debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("GET /debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("GET /debug/pprof/trace", pprof.Trace)
		mux.HandleFunc("GET /debug/pprof/{name}", pprof.Index)
	}
	return h.securityHeadersMiddleware(h.corsMiddleware(h.requestContextMiddleware(h.metricsMiddleware(h.recoverMiddleware(h.authMiddleware(h.rateLimitMiddleware(mux)))))))
}

func (h *Handler) readyz(w http.ResponseWriter, r *http.Request) {
	if !h.ready() {
		http.Error(w, "draining", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) createJob(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.obs.Tracer.Start(r.Context(), "POST /jobs")
	defer span.End()
	span.SetAttributes(
		attribute.String("http.route", "/jobs"),
		attribute.String("request.id", requestIDFromContext(ctx)),
	)

	ctx, cancel := contextWithTimeout(ctx, 2*time.Second)
	defer cancel()

	input, err := decodeJobInput(w, r)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	job, err := h.service.CreateJob(ctx, input)
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusAccepted, job)
}

func (h *Handler) getJob(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.obs.Tracer.Start(r.Context(), "GET /jobs/{id}")
	defer span.End()
	span.SetAttributes(
		attribute.String("http.route", "/jobs/{id}"),
		attribute.String("request.id", requestIDFromContext(ctx)),
	)

	job, err := h.service.GetJob(ctx, r.PathValue("id"))
	if err != nil {
		h.writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func decodeJobInput(w http.ResponseWriter, r *http.Request) (domain.JobInput, error) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var input domain.JobInput
	if err := decoder.Decode(&input); err != nil {
		return domain.JobInput{}, fmt.Errorf("decode job input: %v: %w", err, domain.ErrInvalidInput)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return domain.JobInput{}, fmt.Errorf("decode job input: multiple JSON values: %w", domain.ErrInvalidInput)
	}
	return input, nil
}

func (h *Handler) requestContextMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimSpace(r.Header.Get(requestIDHeader))
		if id == "" {
			id = nextRequestID()
		}
		w.Header().Set(requestIDHeader, id)

		logger := h.obs.Logger.With(
			"request_id", id,
			"method", r.Method,
			"route", routeLabel(r),
		)
		ctx := withLogger(withRequestID(r.Context(), id), logger)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

type corsConfig struct {
	allowed map[string]struct{}
}

func newCORSConfig(origins []string) corsConfig {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin == "" {
			continue
		}
		allowed[origin] = struct{}{}
	}
	return corsConfig{allowed: allowed}
}

func (c corsConfig) allows(origin string) bool {
	_, ok := c.allowed[strings.TrimRight(strings.TrimSpace(origin), "/")]
	return ok
}

func (h *Handler) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimRight(strings.TrimSpace(r.Header.Get("Origin")), "/")
		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}
		if !h.cors.allows(origin) {
			if r.Method == http.MethodOptions {
				http.Error(w, "cors origin is not allowed", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
		w.Header().Set("Access-Control-Max-Age", "300")
		w.Header().Add("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.pprof.enabled && isPprofPath(r.URL.Path) {
			if h.pprof.token == "" || r.Header.Get("Authorization") != "Bearer "+h.pprof.token {
				writeJSON(w, http.StatusUnauthorized, errorResponse{
					Error: errorBody{Code: "unauthorized", Message: "unauthorized"},
				})
				return
			}
			next.ServeHTTP(w, r)
			return
		}
		if h.authToken == "" || !requiresAuth(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer "+h.authToken {
			writeJSON(w, http.StatusUnauthorized, errorResponse{
				Error: errorBody{Code: "unauthorized", Message: "unauthorized"},
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.limiter == nil || !requiresRateLimit(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		if !h.limiter.Allow(clientIP(r, h.proxies)) {
			w.Header().Set("Retry-After", "60")
			writeJSON(w, http.StatusTooManyRequests, errorResponse{
				Error: errorBody{Code: "rate_limited", Message: "rate limited"},
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requiresAuth(path string) bool {
	if path == "/metrics" {
		return true
	}
	if path == "/jobs" || strings.HasPrefix(path, "/jobs/") {
		return true
	}
	return false
}

func requiresRateLimit(path string) bool {
	if path == "/jobs" || strings.HasPrefix(path, "/jobs/") {
		return true
	}
	if isPprofPath(path) {
		return true
	}
	return false
}

func isPprofPath(path string) bool {
	return path == "/debug/pprof" || strings.HasPrefix(path, "/debug/pprof/")
}

func (h *Handler) metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		h.obs.Metrics.RequestsTotal.WithLabelValues(routeLabel(r), r.Method, http.StatusText(recorder.status)).Inc()
	})
}

func (h *Handler) recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				loggerFromContext(r.Context(), h.obs.Logger).ErrorContext(
					r.Context(),
					"panic recovered",
					"panic", recovered,
					"route", routeLabel(r),
				)
				writeJSON(w, http.StatusInternalServerError, errorResponse{
					Error: errorBody{Code: "internal_error", Message: "internal error"},
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func routeLabel(r *http.Request) string {
	if r.Method == http.MethodPost && r.URL.Path == "/jobs" {
		return "/jobs"
	}
	if r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/jobs/") {
		return "/jobs/{id}"
	}
	return r.URL.Path
}

func (h *Handler) writeError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "internal error"
	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		status = http.StatusBadRequest
		code = "invalid_input"
		message = "invalid input"
	case errors.Is(err, domain.ErrQueueFull):
		status = http.StatusServiceUnavailable
		code = "queue_full"
		message = "queue full"
	case errors.Is(err, domain.ErrNotFound):
		status = http.StatusNotFound
		code = "not_found"
		message = "not found"
	case errors.Is(err, context.DeadlineExceeded):
		status = http.StatusGatewayTimeout
		code = "request_timeout"
		message = "request timeout"
	}
	loggerFromContext(r.Context(), h.obs.Logger).WarnContext(
		r.Context(),
		"request failed",
		"status", status,
		"error_code", code,
		"error", err.Error(),
	)
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
