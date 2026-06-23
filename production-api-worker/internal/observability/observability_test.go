package observability

import (
	"context"
	"testing"
	"time"
)

func TestTraceShutdownContract(t *testing.T) {
	called := false
	obs := &Observability{
		shutdown: func(ctx context.Context) error {
			called = true
			deadline, ok := ctx.Deadline()
			if !ok {
				t.Fatal("shutdown context has no deadline")
			}
			remaining := time.Until(deadline)
			if remaining <= 0 || remaining > 3*time.Second {
				t.Fatalf("shutdown deadline remaining = %s, want bounded by 3s", remaining)
			}
			return nil
		},
	}

	if err := obs.Shutdown(context.Background()); err != nil {
		t.Fatalf("Shutdown returned error: %v", err)
	}
	if !called {
		t.Fatal("Shutdown did not call trace provider shutdown")
	}
}
