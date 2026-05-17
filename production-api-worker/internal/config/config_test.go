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
