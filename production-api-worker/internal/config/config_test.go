package config

import (
	"strings"
	"testing"
	"time"
)

func TestLoadFromLookupDefaults(t *testing.T) {
	cfg, err := LoadFromLookup(emptyLookup)
	if err != nil {
		t.Fatalf("LoadFromLookup returned error: %v", err)
	}

	if cfg.Port != DefaultPort {
		t.Fatalf("Port = %q, want %q", cfg.Port, DefaultPort)
	}
	if cfg.QueueSize != DefaultQueueSize {
		t.Fatalf("QueueSize = %d, want %d", cfg.QueueSize, DefaultQueueSize)
	}
	if cfg.Workers != DefaultWorkers {
		t.Fatalf("Workers = %d, want %d", cfg.Workers, DefaultWorkers)
	}
	if cfg.DatabaseMaxOpenConns != DefaultDatabaseMaxOpenConns {
		t.Fatalf("DatabaseMaxOpenConns = %d, want %d", cfg.DatabaseMaxOpenConns, DefaultDatabaseMaxOpenConns)
	}
	if cfg.DatabaseMaxIdleConns != DefaultDatabaseMaxIdleConns {
		t.Fatalf("DatabaseMaxIdleConns = %d, want %d", cfg.DatabaseMaxIdleConns, DefaultDatabaseMaxIdleConns)
	}
	if cfg.DatabaseConnMaxLifetime != DefaultDatabaseConnMaxLifetime {
		t.Fatalf("DatabaseConnMaxLifetime = %s, want %s", cfg.DatabaseConnMaxLifetime, DefaultDatabaseConnMaxLifetime)
	}
	if cfg.APIKey != "" || cfg.DatabaseURL != "" || cfg.OTLPEndpoint != "" {
		t.Fatalf("unexpected optional config: %+v", cfg)
	}
	if cfg.PprofEnabled || cfg.PprofToken != "" {
		t.Fatalf("unexpected pprof config: %+v", cfg)
	}
	if cfg.RateLimitPerMinute != DefaultRateLimitPerMinute {
		t.Fatalf("RateLimitPerMinute = %d, want %d", cfg.RateLimitPerMinute, DefaultRateLimitPerMinute)
	}
	if cfg.RequestBodyLimitBytes != DefaultRequestBodyLimitBytes {
		t.Fatalf("RequestBodyLimitBytes = %d, want %d", cfg.RequestBodyLimitBytes, DefaultRequestBodyLimitBytes)
	}
	if cfg.HTTPReadHeaderTimeout != DefaultHTTPReadHeaderTimeout {
		t.Fatalf("HTTPReadHeaderTimeout = %s, want %s", cfg.HTTPReadHeaderTimeout, DefaultHTTPReadHeaderTimeout)
	}
	if cfg.HTTPReadTimeout != DefaultHTTPReadTimeout {
		t.Fatalf("HTTPReadTimeout = %s, want %s", cfg.HTTPReadTimeout, DefaultHTTPReadTimeout)
	}
	if cfg.HTTPWriteTimeout != DefaultHTTPWriteTimeout {
		t.Fatalf("HTTPWriteTimeout = %s, want %s", cfg.HTTPWriteTimeout, DefaultHTTPWriteTimeout)
	}
	if cfg.HTTPIdleTimeout != DefaultHTTPIdleTimeout {
		t.Fatalf("HTTPIdleTimeout = %s, want %s", cfg.HTTPIdleTimeout, DefaultHTTPIdleTimeout)
	}
	if cfg.HTTPShutdownTimeout != DefaultHTTPShutdownTimeout {
		t.Fatalf("HTTPShutdownTimeout = %s, want %s", cfg.HTTPShutdownTimeout, DefaultHTTPShutdownTimeout)
	}
	if cfg.QueueDrainTimeout != DefaultQueueDrainTimeout {
		t.Fatalf("QueueDrainTimeout = %s, want %s", cfg.QueueDrainTimeout, DefaultQueueDrainTimeout)
	}
	if len(cfg.TrustedProxyCIDRs) != 0 {
		t.Fatalf("TrustedProxyCIDRs = %v, want empty", cfg.TrustedProxyCIDRs)
	}
	if len(cfg.CORSAllowedOrigins) != 0 {
		t.Fatalf("CORSAllowedOrigins = %v, want empty", cfg.CORSAllowedOrigins)
	}
}

func TestLoadFromLookupUsesEnvironment(t *testing.T) {
	cfg, err := LoadFromLookup(mapLookup(map[string]string{
		"PORT":                           "9090",
		"QUEUE_SIZE":                     "128",
		"WORKERS":                        "8",
		"API_KEY":                        " secret-token ",
		"ENABLE_PPROF":                   " true ",
		"PPROF_TOKEN":                    " debug-token ",
		"RATE_LIMIT_REQUESTS_PER_MINUTE": "240",
		"REQUEST_BODY_LIMIT_BYTES":       "2097152",
		"HTTP_READ_HEADER_TIMEOUT":       "4s",
		"HTTP_READ_TIMEOUT":              "6s",
		"HTTP_WRITE_TIMEOUT":             "12s",
		"HTTP_IDLE_TIMEOUT":              "90s",
		"HTTP_SHUTDOWN_TIMEOUT":          "7s",
		"QUEUE_DRAIN_TIMEOUT":            "15s",
		"TRUSTED_PROXY_CIDRS":            " 10.0.0.0/8, 192.168.10.0/24 ",
		"CORS_ALLOWED_ORIGINS":           " https://app.example.com/, http://localhost:5173 ",
		"DATABASE_URL":                   " postgres://app:app@localhost:5432/app?sslmode=disable ",
		"DATABASE_MAX_OPEN_CONNS":        "40",
		"DATABASE_MAX_IDLE_CONNS":        "12",
		"DATABASE_CONN_MAX_LIFETIME":     "45m",
		"OTEL_EXPORTER_OTLP_ENDPOINT":    " http://otel:4317 ",
	}))
	if err != nil {
		t.Fatalf("LoadFromLookup returned error: %v", err)
	}

	if cfg.Port != "9090" || cfg.QueueSize != 128 || cfg.Workers != 8 {
		t.Fatalf("unexpected required config: %+v", cfg)
	}
	if cfg.APIKey != "secret-token" {
		t.Fatalf("APIKey = %q", cfg.APIKey)
	}
	if !cfg.PprofEnabled || cfg.PprofToken != "debug-token" {
		t.Fatalf("unexpected pprof config: %+v", cfg)
	}
	if cfg.RateLimitPerMinute != 240 {
		t.Fatalf("RateLimitPerMinute = %d", cfg.RateLimitPerMinute)
	}
	if cfg.RequestBodyLimitBytes != 2097152 {
		t.Fatalf("RequestBodyLimitBytes = %d", cfg.RequestBodyLimitBytes)
	}
	if cfg.HTTPReadHeaderTimeout != 4*time.Second || cfg.HTTPReadTimeout != 6*time.Second || cfg.HTTPWriteTimeout != 12*time.Second {
		t.Fatalf("unexpected HTTP request timeout config: %+v", cfg)
	}
	if cfg.HTTPIdleTimeout != 90*time.Second || cfg.HTTPShutdownTimeout != 7*time.Second || cfg.QueueDrainTimeout != 15*time.Second {
		t.Fatalf("unexpected HTTP lifecycle timeout config: %+v", cfg)
	}
	if got := strings.Join(cfg.TrustedProxyCIDRs, ","); got != "10.0.0.0/8,192.168.10.0/24" {
		t.Fatalf("TrustedProxyCIDRs = %q", got)
	}
	if got := strings.Join(cfg.CORSAllowedOrigins, ","); got != "https://app.example.com,http://localhost:5173" {
		t.Fatalf("CORSAllowedOrigins = %q", got)
	}
	if cfg.DatabaseURL != "postgres://app:app@localhost:5432/app?sslmode=disable" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
	if cfg.DatabaseMaxOpenConns != 40 || cfg.DatabaseMaxIdleConns != 12 {
		t.Fatalf("unexpected database pool size config: %+v", cfg)
	}
	if cfg.DatabaseConnMaxLifetime != 45*time.Minute {
		t.Fatalf("DatabaseConnMaxLifetime = %s", cfg.DatabaseConnMaxLifetime)
	}
	if cfg.OTLPEndpoint != "http://otel:4317" {
		t.Fatalf("OTLPEndpoint = %q", cfg.OTLPEndpoint)
	}
}

func TestLoadFromLookupRejectsInvalidRequiredConfig(t *testing.T) {
	tests := []struct {
		name      string
		env       map[string]string
		wantError string
	}{
		{
			name:      "port is not a number",
			env:       map[string]string{"PORT": "http"},
			wantError: "PORT must be a TCP port number",
		},
		{
			name:      "port is out of range",
			env:       map[string]string{"PORT": "70000"},
			wantError: "PORT must be a TCP port number",
		},
		{
			name:      "queue size is not positive",
			env:       map[string]string{"QUEUE_SIZE": "0"},
			wantError: "QUEUE_SIZE must be a positive integer",
		},
		{
			name:      "workers is not positive",
			env:       map[string]string{"WORKERS": "-1"},
			wantError: "WORKERS must be a positive integer",
		},
		{
			name:      "database max open conns is not positive",
			env:       map[string]string{"DATABASE_MAX_OPEN_CONNS": "0"},
			wantError: "DATABASE_MAX_OPEN_CONNS must be a positive integer",
		},
		{
			name:      "database max idle conns is greater than max open conns",
			env:       map[string]string{"DATABASE_MAX_OPEN_CONNS": "5", "DATABASE_MAX_IDLE_CONNS": "6"},
			wantError: "DATABASE_MAX_IDLE_CONNS must be less than or equal to DATABASE_MAX_OPEN_CONNS",
		},
		{
			name:      "database connection max lifetime is not a duration",
			env:       map[string]string{"DATABASE_CONN_MAX_LIFETIME": "soon"},
			wantError: "DATABASE_CONN_MAX_LIFETIME must be a positive duration",
		},
		{
			name:      "pprof enabled without token",
			env:       map[string]string{"ENABLE_PPROF": "true"},
			wantError: "ENABLE_PPROF requires PPROF_TOKEN or API_KEY",
		},
		{
			name:      "pprof flag is not boolean",
			env:       map[string]string{"ENABLE_PPROF": "sometimes"},
			wantError: "ENABLE_PPROF must be a boolean",
		},
		{
			name:      "rate limit is not positive",
			env:       map[string]string{"RATE_LIMIT_REQUESTS_PER_MINUTE": "0"},
			wantError: "RATE_LIMIT_REQUESTS_PER_MINUTE must be a positive integer",
		},
		{
			name:      "request body limit is not positive",
			env:       map[string]string{"REQUEST_BODY_LIMIT_BYTES": "0"},
			wantError: "REQUEST_BODY_LIMIT_BYTES must be a positive integer",
		},
		{
			name:      "read header timeout is not a duration",
			env:       map[string]string{"HTTP_READ_HEADER_TIMEOUT": "soon"},
			wantError: "HTTP_READ_HEADER_TIMEOUT must be a positive duration",
		},
		{
			name:      "read timeout is not positive",
			env:       map[string]string{"HTTP_READ_TIMEOUT": "0s"},
			wantError: "HTTP_READ_TIMEOUT must be a positive duration",
		},
		{
			name:      "write timeout is not positive",
			env:       map[string]string{"HTTP_WRITE_TIMEOUT": "-1s"},
			wantError: "HTTP_WRITE_TIMEOUT must be a positive duration",
		},
		{
			name:      "idle timeout is not a duration",
			env:       map[string]string{"HTTP_IDLE_TIMEOUT": "idle"},
			wantError: "HTTP_IDLE_TIMEOUT must be a positive duration",
		},
		{
			name:      "shutdown timeout is not positive",
			env:       map[string]string{"HTTP_SHUTDOWN_TIMEOUT": "0s"},
			wantError: "HTTP_SHUTDOWN_TIMEOUT must be a positive duration",
		},
		{
			name:      "queue drain timeout is not positive",
			env:       map[string]string{"QUEUE_DRAIN_TIMEOUT": "-5s"},
			wantError: "QUEUE_DRAIN_TIMEOUT must be a positive duration",
		},
		{
			name:      "trusted proxy cidr is invalid",
			env:       map[string]string{"TRUSTED_PROXY_CIDRS": "10.0.0.0/8,not-a-cidr"},
			wantError: "TRUSTED_PROXY_CIDRS must contain comma-separated CIDR ranges",
		},
		{
			name:      "cors origin is not http or https",
			env:       map[string]string{"CORS_ALLOWED_ORIGINS": "file://app"},
			wantError: "CORS_ALLOWED_ORIGINS must contain comma-separated exact http/https origins",
		},
		{
			name:      "cors origin contains path",
			env:       map[string]string{"CORS_ALLOWED_ORIGINS": "https://app.example.com/path"},
			wantError: "CORS_ALLOWED_ORIGINS must contain comma-separated exact http/https origins",
		},
		{
			name:      "cors origin contains user info",
			env:       map[string]string{"CORS_ALLOWED_ORIGINS": "https://user@app.example.com"},
			wantError: "CORS_ALLOWED_ORIGINS must contain comma-separated exact http/https origins",
		},
		{
			name:      "cors origin contains empty query marker",
			env:       map[string]string{"CORS_ALLOWED_ORIGINS": "https://app.example.com?"},
			wantError: "CORS_ALLOWED_ORIGINS must contain comma-separated exact http/https origins",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := LoadFromLookup(mapLookup(tt.env))
			if err == nil {
				t.Fatal("LoadFromLookup returned nil error")
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("error = %q, want containing %q", err.Error(), tt.wantError)
			}
		})
	}
}

func TestLoadMigrationFromLookupUsesDefaults(t *testing.T) {
	cfg, err := LoadMigrationFromLookup(mapLookup(map[string]string{
		"DATABASE_URL": " postgres://app:app@localhost:5432/app?sslmode=disable ",
	}))
	if err != nil {
		t.Fatalf("LoadMigrationFromLookup returned error: %v", err)
	}

	if cfg.DatabaseURL != "postgres://app:app@localhost:5432/app?sslmode=disable" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
	if cfg.MigrationsDir != DefaultMigrationsDir {
		t.Fatalf("MigrationsDir = %q, want %q", cfg.MigrationsDir, DefaultMigrationsDir)
	}
	if cfg.MigrationTimeout != DefaultMigrationTimeout {
		t.Fatalf("MigrationTimeout = %s, want %s", cfg.MigrationTimeout, DefaultMigrationTimeout)
	}
}

func TestLoadMigrationFromLookupUsesEnvironment(t *testing.T) {
	cfg, err := LoadMigrationFromLookup(mapLookup(map[string]string{
		"DATABASE_URL":      " postgres://app:app@localhost:5432/app?sslmode=disable ",
		"MIGRATIONS_DIR":    " ./db/migrations ",
		"MIGRATION_TIMEOUT": "45s",
	}))
	if err != nil {
		t.Fatalf("LoadMigrationFromLookup returned error: %v", err)
	}

	if cfg.DatabaseURL != "postgres://app:app@localhost:5432/app?sslmode=disable" {
		t.Fatalf("DatabaseURL = %q", cfg.DatabaseURL)
	}
	if cfg.MigrationsDir != "./db/migrations" {
		t.Fatalf("MigrationsDir = %q", cfg.MigrationsDir)
	}
	if cfg.MigrationTimeout != 45*time.Second {
		t.Fatalf("MigrationTimeout = %s", cfg.MigrationTimeout)
	}
}

func TestLoadMigrationFromLookupRejectsInvalidConfig(t *testing.T) {
	tests := []struct {
		name      string
		env       map[string]string
		wantError string
	}{
		{
			name:      "missing database url",
			env:       map[string]string{},
			wantError: "DATABASE_URL is required for migration",
		},
		{
			name:      "blank migrations dir",
			env:       map[string]string{"DATABASE_URL": "postgres://app", "MIGRATIONS_DIR": "   "},
			wantError: "MIGRATIONS_DIR must not be empty",
		},
		{
			name:      "bad migration timeout",
			env:       map[string]string{"DATABASE_URL": "postgres://app", "MIGRATION_TIMEOUT": "soon"},
			wantError: "MIGRATION_TIMEOUT must be a positive duration",
		},
		{
			name:      "zero migration timeout",
			env:       map[string]string{"DATABASE_URL": "postgres://app", "MIGRATION_TIMEOUT": "0s"},
			wantError: "MIGRATION_TIMEOUT must be a positive duration",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := LoadMigrationFromLookup(mapLookup(tt.env))
			if err == nil {
				t.Fatal("LoadMigrationFromLookup returned nil error")
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("error = %q, want containing %q", err.Error(), tt.wantError)
			}
		})
	}
}

func emptyLookup(string) (string, bool) {
	return "", false
}

func mapLookup(values map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	}
}
