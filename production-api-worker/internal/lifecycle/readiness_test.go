package lifecycle

import "testing"

func TestReadinessSwitchesToDraining(t *testing.T) {
	readiness := NewReadiness()
	if !readiness.Ready() {
		t.Fatal("new readiness state must start ready")
	}

	readiness.MarkDraining()
	if readiness.Ready() {
		t.Fatal("readiness must be false after draining starts")
	}
}
