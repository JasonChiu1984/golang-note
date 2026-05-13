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
	if cfg.DatabaseURL != "" || cfg.OTLPEndpoint != "" {
		t.Fatalf("unexpected optional config: %+v", cfg)
	}
}

func TestLoadFromLookupUsesEnvironment(t *testing.T) {
	cfg, err := LoadFromLookup(mapLookup(map[string]string{
		"PORT":                        "9090",
		"QUEUE_SIZE":                  "128",
		"WORKERS":                     "8",
		"DATABASE_URL":                " postgres://app:app@localhost:5432/app?sslmode=disable ",
		"DATABASE_MAX_OPEN_CONNS":     "40",
		"DATABASE_MAX_IDLE_CONNS":     "12",
		"DATABASE_CONN_MAX_LIFETIME":  "45m",
		"OTEL_EXPORTER_OTLP_ENDPOINT": " http://otel:4317 ",
	}))
	if err != nil {
		t.Fatalf("LoadFromLookup returned error: %v", err)
	}

	if cfg.Port != "9090" || cfg.QueueSize != 128 || cfg.Workers != 8 {
		t.Fatalf("unexpected required config: %+v", cfg)
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

func emptyLookup(string) (string, bool) {
	return "", false
}

func mapLookup(values map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	}
}
