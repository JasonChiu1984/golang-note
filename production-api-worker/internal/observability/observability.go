package observability

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

type Metrics struct {
	RequestsTotal *prometheus.CounterVec
	JobsTotal     *prometheus.CounterVec
	QueueDepth    prometheus.Gauge
	JobDuration   prometheus.Histogram
}

type Observability struct {
	Logger   *slog.Logger
	Registry *prometheus.Registry
	Metrics  Metrics
	Tracer   oteltrace.Tracer
	shutdown func(context.Context) error
}

type Config struct {
	ServiceName  string
	OTLPEndpoint string
	TraceOut     io.Writer
}

func New(ctx context.Context, service string, traceOut io.Writer) (*Observability, error) {
	return NewWithConfig(ctx, Config{ServiceName: service, TraceOut: traceOut})
}

func NewWithConfig(ctx context.Context, config Config) (*Observability, error) {
	if config.ServiceName == "" {
		config.ServiceName = "production-api-worker"
	}
	exporter, err := newTraceExporter(ctx, config)
	if err != nil {
		return nil, err
	}
	provider := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exporter))
	otel.SetTracerProvider(provider)

	registry := prometheus.NewRegistry()
	metrics := Metrics{
		RequestsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "api_requests_total",
			Help: "HTTP requests by route, method and status.",
		}, []string{"route", "method", "status"}),
		JobsTotal: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "worker_jobs_total",
			Help: "Worker jobs by result.",
		}, []string{"result"}),
		QueueDepth: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "worker_queue_depth",
			Help: "Current worker queue depth.",
		}),
		JobDuration: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "worker_job_duration_seconds",
			Help:    "Job processing latency.",
			Buckets: prometheus.DefBuckets,
		}),
	}
	registry.MustRegister(metrics.RequestsTotal, metrics.JobsTotal, metrics.QueueDepth, metrics.JobDuration)

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", config.ServiceName)
	return &Observability{
		Logger:   logger,
		Registry: registry,
		Metrics:  metrics,
		Tracer:   provider.Tracer(config.ServiceName),
		shutdown: provider.Shutdown,
	}, nil
}

func newTraceExporter(ctx context.Context, config Config) (sdktrace.SpanExporter, error) {
	if config.OTLPEndpoint != "" {
		return otlptracegrpc.New(ctx,
			otlptracegrpc.WithEndpoint(config.OTLPEndpoint),
			otlptracegrpc.WithInsecure(),
		)
	}
	if config.TraceOut == nil {
		config.TraceOut = os.Stdout
	}
	return stdouttrace.New(stdouttrace.WithWriter(config.TraceOut))
}

func (o *Observability) MetricsHandler() http.Handler {
	return promhttp.HandlerFor(o.Registry, promhttp.HandlerOpts{})
}

func (o *Observability) StartSpan(ctx context.Context, name string) (context.Context, func()) {
	ctx, span := o.Tracer.Start(ctx, name)
	return ctx, span.End
}

func (o *Observability) InfoContext(ctx context.Context, msg string, args ...any) {
	o.Logger.InfoContext(ctx, msg, args...)
}

func (o *Observability) WarnContext(ctx context.Context, msg string, args ...any) {
	o.Logger.WarnContext(ctx, msg, args...)
}

func (o *Observability) ObserveWorkerQueueDepth(depth int) {
	o.Metrics.QueueDepth.Set(float64(depth))
}

func (o *Observability) ObserveWorkerJobDuration(seconds float64) {
	o.Metrics.JobDuration.Observe(seconds)
}

func (o *Observability) ObserveWorkerJobResult(result string) {
	o.Metrics.JobsTotal.WithLabelValues(result).Inc()
}

func (o *Observability) Shutdown(ctx context.Context) error {
	shutdownCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return o.shutdown(shutdownCtx)
}
