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

func TestWorkerFailureResultContract(t *testing.T) {
	obs := &recordingObserver{}
	queue := New(2, func(ctx context.Context, task Task) error {
		if task.JobID == "fail" {
			return errors.New("processor failed")
		}
		return nil
	}, obs)
	queue.Start(context.Background(), 1)

	if err := queue.Enqueue(context.Background(), Task{JobID: "ok"}); err != nil {
		t.Fatalf("enqueue ok task: %v", err)
	}
	if err := queue.Enqueue(context.Background(), Task{JobID: "fail"}); err != nil {
		t.Fatalf("enqueue failed task: %v", err)
	}
	if err := queue.ShutdownContext(context.Background()); err != nil {
		t.Fatalf("ShutdownContext returned error: %v", err)
	}

	if got := obs.resultCount("success"); got != 1 {
		t.Fatalf("success result count = %d, want 1", got)
	}
	if got := obs.resultCount("failed"); got != 1 {
		t.Fatalf("failed result count = %d, want 1", got)
	}
	if len(obs.durations) != 2 {
		t.Fatalf("job duration count = %d, want 2", len(obs.durations))
	}
}

type recordingObserver struct {
	mu        sync.Mutex
	results   []string
	durations []float64
	depths    []int
}

func (o *recordingObserver) ObserveWorkerQueueDepth(depth int) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.depths = append(o.depths, depth)
}

func (o *recordingObserver) ObserveWorkerJobDuration(seconds float64) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.durations = append(o.durations, seconds)
}

func (o *recordingObserver) ObserveWorkerJobResult(result string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.results = append(o.results, result)
}

func (o *recordingObserver) resultCount(result string) int {
	o.mu.Lock()
	defer o.mu.Unlock()
	count := 0
	for _, got := range o.results {
		if got == result {
			count++
		}
	}
	return count
}
