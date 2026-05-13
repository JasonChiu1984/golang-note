package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	DefaultPort      = "8080"
	DefaultQueueSize = 64
	DefaultWorkers   = 4
)

type Config struct {
	Port         string
	QueueSize    int
	Workers      int
	DatabaseURL  string
	OTLPEndpoint string
}

func Load() (Config, error) {
	return LoadFromLookup(os.LookupEnv)
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

	return Config{
		Port:         port,
		QueueSize:    queueSize,
		Workers:      workers,
		DatabaseURL:  strings.TrimSpace(readString(lookup, "DATABASE_URL", "")),
		OTLPEndpoint: strings.TrimSpace(readString(lookup, "OTEL_EXPORTER_OTLP_ENDPOINT", "")),
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
