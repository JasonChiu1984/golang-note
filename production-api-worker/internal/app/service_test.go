package app

import (
	"context"
	"errors"
	"testing"

	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
	"golang-learning-notes/production-api-worker/internal/repository"
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
	obs := newTestObs(t)
	store := repository.NewMemoryStore()
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
	obs := newTestObs(t)
	store := repository.NewMemoryStore()
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

func newTestObs(t *testing.T) *observability.Observability {
	t.Helper()
	obs, err := observability.New(context.Background(), "test", discardWriter{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = obs.Shutdown(context.Background()) })
	return obs
}

type discardWriter struct{}

func (discardWriter) Write(p []byte) (int, error) { return len(p), nil }

