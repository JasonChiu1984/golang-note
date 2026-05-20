package main

import (
	"os"
	"syscall"
	"testing"
	"time"

	"golang-learning-notes/production-api-worker/internal/config"
)

func TestMonitoredSignalsContract(t *testing.T) {
	signals := monitoredSignals()
	if len(signals) != 2 {
		t.Fatalf("monitoredSignals length = %d, want 2", len(signals))
	}

	want := map[os.Signal]bool{
		os.Interrupt:    false,
		syscall.SIGTERM: false,
	}
	for _, sig := range signals {
		if _, ok := want[sig]; ok {
			want[sig] = true
		}
	}
	for sig, seen := range want {
		if !seen {
			t.Fatalf("monitoredSignals missing %v", sig)
		}
	}
}

func TestHTTPServerTimeoutContract(t *testing.T) {
	cfg := config.Config{
		HTTPReadHeaderTimeout: 4 * time.Second,
		HTTPReadTimeout:       6 * time.Second,
		HTTPWriteTimeout:      12 * time.Second,
		HTTPIdleTimeout:       90 * time.Second,
		HTTPShutdownTimeout:   7 * time.Second,
		QueueDrainTimeout:     15 * time.Second,
	}

	timeouts := serverTimeouts(cfg)
	if timeouts.ReadHeader != 4*time.Second {
		t.Fatalf("ReadHeader = %s", timeouts.ReadHeader)
	}
	if timeouts.Read != 6*time.Second {
		t.Fatalf("Read = %s", timeouts.Read)
	}
	if timeouts.Write != 12*time.Second {
		t.Fatalf("Write = %s", timeouts.Write)
	}
	if timeouts.Idle != 90*time.Second {
		t.Fatalf("Idle = %s", timeouts.Idle)
	}
	if timeouts.Shutdown != 7*time.Second {
		t.Fatalf("Shutdown = %s", timeouts.Shutdown)
	}
	if timeouts.QueueDrain != 15*time.Second {
		t.Fatalf("QueueDrain = %s", timeouts.QueueDrain)
	}
}
