package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultPort                    = "8080"
	DefaultQueueSize               = 64
	DefaultWorkers                 = 4
	DefaultDatabaseMaxOpenConns    = 25
	DefaultDatabaseMaxIdleConns    = 10
	DefaultDatabaseConnMaxLifetime = 30 * time.Minute
	DefaultMigrationsDir           = "migrations"
	DefaultMigrationTimeout        = 30 * time.Second
)

type Config struct {
	Port                    string
	QueueSize               int
	Workers                 int
	DatabaseURL             string
	DatabaseMaxOpenConns    int
	DatabaseMaxIdleConns    int
	DatabaseConnMaxLifetime time.Duration
	OTLPEndpoint            string
}

type MigrationConfig struct {
	DatabaseURL      string
	MigrationsDir    string
	MigrationTimeout time.Duration
}

func Load() (Config, error) {
	return LoadFromLookup(os.LookupEnv)
}

func LoadMigration() (MigrationConfig, error) {
	return LoadMigrationFromLookup(os.LookupEnv)
}

func LoadFromLookup(lookup func(string) (string, bool)) (Config, error) {
	if lookup == nil {
		lookup = os.LookupEnv
	}

	port, err := parsePort("PORT", readString(lookup, "PORT", DefaultPort))
	if err != nil {
		return Config{}, err
	}
	queueSize, err := parsePositiveInt("QUEUE_SIZE", readString(lookup, "QUEUE_SIZE", strconv.Itoa(DefaultQueueSize)))
	if err != nil {
		return Config{}, err
	}
	workers, err := parsePositiveInt("WORKERS", readString(lookup, "WORKERS", strconv.Itoa(DefaultWorkers)))
	if err != nil {
		return Config{}, err
	}
	databaseMaxOpenConns, err := parsePositiveInt("DATABASE_MAX_OPEN_CONNS", readString(lookup, "DATABASE_MAX_OPEN_CONNS", strconv.Itoa(DefaultDatabaseMaxOpenConns)))
	if err != nil {
		return Config{}, err
	}
	databaseMaxIdleConns, err := parsePositiveInt("DATABASE_MAX_IDLE_CONNS", readString(lookup, "DATABASE_MAX_IDLE_CONNS", strconv.Itoa(DefaultDatabaseMaxIdleConns)))
	if err != nil {
		return Config{}, err
	}
	if databaseMaxIdleConns > databaseMaxOpenConns {
		return Config{}, fmt.Errorf("DATABASE_MAX_IDLE_CONNS must be less than or equal to DATABASE_MAX_OPEN_CONNS, got %d > %d", databaseMaxIdleConns, databaseMaxOpenConns)
	}
	databaseConnMaxLifetime, err := parsePositiveDuration("DATABASE_CONN_MAX_LIFETIME", readString(lookup, "DATABASE_CONN_MAX_LIFETIME", DefaultDatabaseConnMaxLifetime.String()))
	if err != nil {
		return Config{}, err
	}

	return Config{
		Port:                    port,
		QueueSize:               queueSize,
		Workers:                 workers,
		DatabaseURL:             strings.TrimSpace(readString(lookup, "DATABASE_URL", "")),
		DatabaseMaxOpenConns:    databaseMaxOpenConns,
		DatabaseMaxIdleConns:    databaseMaxIdleConns,
		DatabaseConnMaxLifetime: databaseConnMaxLifetime,
		OTLPEndpoint:            strings.TrimSpace(readString(lookup, "OTEL_EXPORTER_OTLP_ENDPOINT", "")),
	}, nil
}

func LoadMigrationFromLookup(lookup func(string) (string, bool)) (MigrationConfig, error) {
	if lookup == nil {
		lookup = os.LookupEnv
	}

	databaseURL := strings.TrimSpace(readString(lookup, "DATABASE_URL", ""))
	if databaseURL == "" {
		return MigrationConfig{}, fmt.Errorf("DATABASE_URL is required for migration")
	}
	migrationsDir := strings.TrimSpace(readString(lookup, "MIGRATIONS_DIR", DefaultMigrationsDir))
	if migrationsDir == "" {
		return MigrationConfig{}, fmt.Errorf("MIGRATIONS_DIR must not be empty")
	}
	migrationTimeout, err := parsePositiveDuration("MIGRATION_TIMEOUT", readString(lookup, "MIGRATION_TIMEOUT", DefaultMigrationTimeout.String()))
	if err != nil {
		return MigrationConfig{}, err
	}

	return MigrationConfig{
		DatabaseURL:      databaseURL,
		MigrationsDir:    migrationsDir,
		MigrationTimeout: migrationTimeout,
	}, nil
}

func readString(lookup func(string) (string, bool), key, fallback string) string {
	value, ok := lookup(key)
	if !ok {
		return fallback
	}
	return strings.TrimSpace(value)
}

func parsePort(name, value string) (string, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 || parsed > 65535 {
		return "", fmt.Errorf("%s must be a TCP port number from 1 to 65535, got %q", name, value)
	}
	return strconv.Itoa(parsed), nil
}

func parsePositiveInt(name, value string) (int, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer, got %q", name, value)
	}
	return parsed, nil
}

func parsePositiveDuration(name, value string) (time.Duration, error) {
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration such as 30m or 1h, got %q", name, value)
	}
	return parsed, nil
}
