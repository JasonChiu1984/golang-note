package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/worker"
)

type Tx interface {
	InsertJob(ctx context.Context, job domain.Job) error
	UpdateJobStatus(ctx context.Context, id string, status domain.JobStatus) error
	GetJob(ctx context.Context, id string) (domain.Job, error)
}

type Store interface {
	WithTx(ctx context.Context, opts *sql.TxOptions, fn func(Tx) error) error
	GetJob(ctx context.Context, id string) (domain.Job, error)
}

type Queue interface {
	Enqueue(ctx context.Context, task worker.Task) error
}

type Observability interface {
	StartSpan(ctx context.Context, name string) (context.Context, func())
	InfoContext(ctx context.Context, msg string, args ...any)
	WarnContext(ctx context.Context, msg string, args ...any)
}

type IDGenerator func() string

type Service struct {
	store Store
	queue Queue
	obs   Observability
	newID IDGenerator
}

func NewService(store Store, queue Queue, obs Observability, newID IDGenerator) *Service {
	return &Service{store: store, queue: queue, obs: obs, newID: newID}
}

func (s *Service) CreateJob(ctx context.Context, input domain.JobInput) (domain.Job, error) {
	ctx, endSpan := s.obs.StartSpan(ctx, "Service.CreateJob")
	defer endSpan()

	if err := domain.ValidateJobInput(input); err != nil {
		return domain.Job{}, err
	}

	job := domain.Job{
		ID:      s.newID(),
		Name:    input.Name,
		Payload: input.Payload,
		Status:  domain.JobPending,
	}

	err := s.withDeadlockRetry(ctx, func() error {
		return s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx Tx) error {
			return tx.InsertJob(ctx, job)
		})
	})
	if err != nil {
		return domain.Job{}, fmt.Errorf("insert job: %w", err)
	}

	if err := s.queue.Enqueue(ctx, worker.Task{JobID: job.ID}); err != nil {
		_ = s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx Tx) error {
			return tx.UpdateJobStatus(ctx, job.ID, domain.JobFailed)
		})
		return domain.Job{}, err
	}
	return job, nil
}

func (s *Service) GetJob(ctx context.Context, id string) (domain.Job, error) {
	ctx, endSpan := s.obs.StartSpan(ctx, "Service.GetJob")
	defer endSpan()
	return s.store.GetJob(ctx, id)
}

func (s *Service) ProcessJob(ctx context.Context, task worker.Task) error {
	ctx, endSpan := s.obs.StartSpan(ctx, "Service.ProcessJob")
	defer endSpan()

	if err := s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx Tx) error {
		return tx.UpdateJobStatus(ctx, task.JobID, domain.JobProcessing)
	}); err != nil {
		return err
	}

	time.Sleep(10 * time.Millisecond)

	if err := s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx Tx) error {
		return tx.UpdateJobStatus(ctx, task.JobID, domain.JobDone)
	}); err != nil {
		return err
	}
	s.obs.InfoContext(ctx, "job processed", "job_id", task.JobID)
	return nil
}

func (s *Service) withDeadlockRetry(ctx context.Context, fn func() error) error {
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		err = fn()
		if !errors.Is(err, domain.ErrDeadlock) {
			return err
		}
		if attempt == 2 {
			return err
		}
		s.obs.WarnContext(ctx, "deadlock retry", "attempt", attempt+1)
		backoff := time.Duration(attempt+1) * 10 * time.Millisecond
		timer := time.NewTimer(backoff)
		select {
		case <-timer.C:
		case <-ctx.Done():
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return ctx.Err()
		}
	}
	return err
}
