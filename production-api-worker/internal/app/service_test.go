package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/worker"
)

type fakeQueue struct {
	err error
	got []worker.Task
}

func (q *fakeQueue) Enqueue(ctx context.Context, task worker.Task) error {
	if q.err != nil {
		return q.err
	}
	q.got = append(q.got, task)
	return nil
}

func TestCreateJobRetriesDeadlockAndEnqueues(t *testing.T) {
	obs := noopObs{}
	store := newMemoryStore()
	store.ForceNextDeadlock()
	queue := &fakeQueue{}
	service := NewService(store, queue, obs, func() string { return "job-1" })

	job, err := service.CreateJob(context.Background(), domain.JobInput{Name: "resize", Payload: "image"})
	if err != nil {
		t.Fatalf("CreateJob returned error: %v", err)
	}
	if job.ID != "job-1" || job.Status != domain.JobPending {
		t.Fatalf("unexpected job: %+v", job)
	}
	if len(queue.got) != 1 || queue.got[0].JobID != "job-1" {
		t.Fatalf("job was not enqueued: %+v", queue.got)
	}
}

func TestCreateJobMarksFailedWhenQueueFull(t *testing.T) {
	obs := noopObs{}
	store := newMemoryStore()
	queue := &fakeQueue{err: domain.ErrQueueFull}
	service := NewService(store, queue, obs, func() string { return "job-2" })

	_, err := service.CreateJob(context.Background(), domain.JobInput{Name: "resize", Payload: "image"})
	if !errors.Is(err, domain.ErrQueueFull) {
		t.Fatalf("want queue full, got %v", err)
	}

	job, err := store.GetJob(context.Background(), "job-2")
	if err != nil {
		t.Fatalf("GetJob returned error: %v", err)
	}
	if job.Status != domain.JobFailed {
		t.Fatalf("want failed, got %s", job.Status)
	}
}

func TestCreateJobStopsDeadlockRetryWhenContextCanceled(t *testing.T) {
	obs := noopObs{}
	ctx, cancel := context.WithCancel(context.Background())
	store := &cancelingDeadlockStore{cancel: cancel}
	queue := &fakeQueue{}
	service := NewService(store, queue, obs, func() string { return "job-3" })

	_, err := service.CreateJob(ctx, domain.JobInput{Name: "resize", Payload: "image"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("want context canceled, got %v", err)
	}
	if store.calls != 1 {
		t.Fatalf("WithTx calls = %d, want 1", store.calls)
	}
	if len(queue.got) != 0 {
		t.Fatalf("job should not be enqueued after canceled retry: %+v", queue.got)
	}
}

func TestCreateJobIdempotencyKeyContract(t *testing.T) {
	obs := noopObs{}
	store := newMemoryStore()
	queue := &fakeQueue{}
	ids := []string{"job-4", "job-5"}
	service := NewService(store, queue, obs, func() string {
		id := ids[0]
		ids = ids[1:]
		return id
	})

	first, err := service.CreateJob(context.Background(), domain.JobInput{
		Name:           "resize",
		Payload:        "image",
		IdempotencyKey: "client-retry-1",
	})
	if err != nil {
		t.Fatalf("first CreateJob returned error: %v", err)
	}

	second, err := service.CreateJob(context.Background(), domain.JobInput{
		Name:           "resize",
		Payload:        "image",
		IdempotencyKey: "client-retry-1",
	})
	if err != nil {
		t.Fatalf("second CreateJob returned error: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("duplicate idempotency key created different jobs: first=%s second=%s", first.ID, second.ID)
	}
	if len(queue.got) != 1 || queue.got[0].JobID != first.ID {
		t.Fatalf("duplicate idempotency key should enqueue once, got %+v", queue.got)
	}
	if second.IdempotencyKey != "client-retry-1" {
		t.Fatalf("idempotency key not preserved on stored job: %+v", second)
	}
}

func TestServiceTransactionBoundaryContract(t *testing.T) {
	obs := noopObs{}
	store := newMemoryStore()
	queue := &fakeQueue{}
	service := NewService(store, queue, obs, func() string { return "job-transaction-boundary" })

	job, err := service.CreateJob(context.Background(), domain.JobInput{Name: "resize", Payload: "image"})
	if err != nil {
		t.Fatalf("CreateJob returned error: %v", err)
	}
	if got := store.LastIsolationLevel(); got != sql.LevelReadCommitted {
		t.Fatalf("transaction isolation = %v, want %v", got, sql.LevelReadCommitted)
	}
	if _, err := store.GetJob(context.Background(), job.ID); err != nil {
		t.Fatalf("job must be committed before enqueue boundary is complete: %v", err)
	}
	if len(queue.got) != 1 || queue.got[0].JobID != job.ID {
		t.Fatalf("job must enqueue exactly once after transaction commit: %+v", queue.got)
	}

	queue.err = domain.ErrQueueFull
	service = NewService(store, queue, obs, func() string { return "job-queue-full-boundary" })

	_, err = service.CreateJob(context.Background(), domain.JobInput{Name: "resize", Payload: "image"})
	if !errors.Is(err, domain.ErrQueueFull) {
		t.Fatalf("queue full error = %v, want %v", err, domain.ErrQueueFull)
	}
	failed, err := store.GetJob(context.Background(), "job-queue-full-boundary")
	if err != nil {
		t.Fatalf("queue-full job must remain queryable for incident/debug visibility: %v", err)
	}
	if failed.Status != domain.JobFailed {
		t.Fatalf("queue-full job status = %s, want %s", failed.Status, domain.JobFailed)
	}
}

type cancelingDeadlockStore struct {
	cancel context.CancelFunc
	calls  int
}

func (s *cancelingDeadlockStore) WithTx(ctx context.Context, opts *sql.TxOptions, fn func(Tx) error) error {
	s.calls++
	s.cancel()
	return domain.ErrDeadlock
}

func (s *cancelingDeadlockStore) GetJob(ctx context.Context, id string) (domain.Job, error) {
	return domain.Job{}, domain.ErrNotFound
}

type noopObs struct{}

func (noopObs) StartSpan(ctx context.Context, name string) (context.Context, func()) {
	return ctx, func() {}
}

func (noopObs) InfoContext(ctx context.Context, msg string, args ...any) {}
func (noopObs) WarnContext(ctx context.Context, msg string, args ...any) {}

type memoryStore struct {
	mu           sync.Mutex
	jobs         map[string]domain.Job
	nextDeadlock bool
	lastOpts     sql.TxOptions
}

func newMemoryStore() *memoryStore {
	return &memoryStore{jobs: map[string]domain.Job{}}
}

func (s *memoryStore) ForceNextDeadlock() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextDeadlock = true
}

func (s *memoryStore) WithTx(ctx context.Context, opts *sql.TxOptions, fn func(Tx) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if opts != nil {
		s.lastOpts = *opts
	}
	if s.nextDeadlock {
		s.nextDeadlock = false
		return domain.ErrDeadlock
	}

	snapshot := make(map[string]domain.Job, len(s.jobs))
	for k, v := range s.jobs {
		snapshot[k] = v
	}
	tx := &memoryTx{jobs: snapshot}
	if err := fn(tx); err != nil {
		return err
	}
	s.jobs = snapshot
	return nil
}

func (s *memoryStore) LastIsolationLevel() sql.IsolationLevel {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lastOpts.Isolation
}

func (s *memoryStore) GetJob(ctx context.Context, id string) (domain.Job, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[id]
	if !ok {
		return domain.Job{}, fmt.Errorf("job %s: %w", id, domain.ErrNotFound)
	}
	return job, nil
}

type memoryTx struct {
	jobs map[string]domain.Job
}

func (tx *memoryTx) InsertJob(ctx context.Context, job domain.Job) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	now := time.Now()
	job.CreatedAt = now
	job.UpdatedAt = now
	tx.jobs[job.ID] = job
	return nil
}

func (tx *memoryTx) UpdateJobStatus(ctx context.Context, id string, status domain.JobStatus) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	job, ok := tx.jobs[id]
	if !ok {
		return fmt.Errorf("job %s: %w", id, domain.ErrNotFound)
	}
	job.Status = status
	job.UpdatedAt = time.Now()
	if status == domain.JobProcessing {
		job.Attempts++
	}
	tx.jobs[id] = job
	return nil
}

func (tx *memoryTx) GetJob(ctx context.Context, id string) (domain.Job, error) {
	if err := ctx.Err(); err != nil {
		return domain.Job{}, err
	}
	job, ok := tx.jobs[id]
	if !ok {
		return domain.Job{}, fmt.Errorf("job %s: %w", id, domain.ErrNotFound)
	}
	return job, nil
}

func (tx *memoryTx) GetJobByIdempotencyKey(ctx context.Context, key string) (domain.Job, error) {
	if err := ctx.Err(); err != nil {
		return domain.Job{}, err
	}
	for _, job := range tx.jobs {
		if job.IdempotencyKey == key {
			return job, nil
		}
	}
	return domain.Job{}, domain.ErrNotFound
}
