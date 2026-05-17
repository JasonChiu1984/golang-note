package main

import (
	"os"
	"syscall"
	"testing"
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
