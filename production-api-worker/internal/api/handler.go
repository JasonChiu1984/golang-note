package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"golang-learning-notes/production-api-worker/internal/app"
	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
)

type Handler struct {
	service *app.Service
	obs     *observability.Observability
}

func NewHandler(service *app.Service, obs *observability.Observability) *Handler {
	return &Handler{service: service, obs: obs}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /jobs", h.createJob)
	mux.HandleFunc("GET /jobs/{id}", h.getJob)
	mux.Handle("GET /metrics", h.obs.MetricsHandler())
	mux.HandleFunc("GET /livez", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	return h.metricsMiddleware(mux)
}

func (h *Handler) createJob(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.obs.Tracer.Start(r.Context(), "POST /jobs")
	defer span.End()

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	ctx, cancel := contextWithTimeout(ctx, 2*time.Second)
	defer cancel()

	var input domain.JobInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		h.writeError(w, err)
		return
	}
	job, err := h.service.CreateJob(ctx, input)
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, job)
}

func (h *Handler) getJob(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.obs.Tracer.Start(r.Context(), "GET /jobs/{id}")
	defer span.End()

	job, err := h.service.GetJob(ctx, r.PathValue("id"))
	if err != nil {
		h.writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (h *Handler) metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		h.obs.Metrics.RequestsTotal.WithLabelValues(routeLabel(r), r.Method, http.StatusText(recorder.status)).Inc()
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

func (h *Handler) writeError(w http.ResponseWriter, err error) {
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
	}
	h.obs.Logger.Warn("request failed", "status", status, "error", err.Error())
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
