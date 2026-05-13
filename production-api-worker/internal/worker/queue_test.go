package worker

import (
	"context"
	"errors"
	"sync"
	"testing"
)

func TestEnqueueAfterShutdownReturnsClosedError(t *testing.T) {
	queue := New(1, func(ctx context.Context, task Task) error { return nil }, nil)

	if err := queue.ShutdownContext(context.Background()); err != nil {
		t.Fatalf("ShutdownContext returned error: %v", err)
	}

	err := queue.Enqueue(context.Background(), Task{JobID: "job-1"})
	if !errors.Is(err, ErrClosed) {
		t.Fatalf("Enqueue after shutdown error = %v, want %v", err, ErrClosed)
	}
}

func TestConcurrentEnqueueAndShutdownDoesNotPanic(t *testing.T) {
	queue := New(64, func(ctx context.Context, task Task) error { return nil }, nil)
	queue.Start(context.Background(), 2)

	var wg sync.WaitGroup
	for i := 0; i < 64; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = queue.Enqueue(context.Background(), Task{JobID: "job"})
		}()
	}

	if err := queue.ShutdownContext(context.Background()); err != nil {
		t.Fatalf("ShutdownContext returned error: %v", err)
	}
	wg.Wait()
}
