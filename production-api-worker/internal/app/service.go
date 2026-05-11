package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
	"golang-learning-notes/production-api-worker/internal/repository"
	"golang-learning-notes/production-api-worker/internal/worker"
)

type Queue interface {
	Enqueue(ctx context.Context, task worker.Task) error
}

type IDGenerator func() string

type Service struct {
	store repository.Store
	queue Queue
	obs   *observability.Observability
	newID IDGenerator
}

func NewService(store repository.Store, queue Queue, obs *observability.Observability, newID IDGenerator) *Service {
	return &Service{store: store, queue: queue, obs: obs, newID: newID}
}

func (s *Service) CreateJob(ctx context.Context, input domain.JobInput) (domain.Job, error) {
	ctx, span := s.obs.Tracer.Start(ctx, "Service.CreateJob")
	defer span.End()

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
		return s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx repository.Tx) error {
			return tx.InsertJob(ctx, job)
		})
	})
	if err != nil {
		return domain.Job{}, fmt.Errorf("insert job: %w", err)
	}

	if err := s.queue.Enqueue(ctx, worker.Task{JobID: job.ID}); err != nil {
		_ = s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx repository.Tx) error {
			return tx.UpdateJobStatus(ctx, job.ID, domain.JobFailed)
		})
		return domain.Job{}, err
	}
	return job, nil
}

func (s *Service) GetJob(ctx context.Context, id string) (domain.Job, error) {
	ctx, span := s.obs.Tracer.Start(ctx, "Service.GetJob")
	defer span.End()
	return s.store.GetJob(ctx, id)
}

func (s *Service) ProcessJob(ctx context.Context, task worker.Task) error {
	ctx, span := s.obs.Tracer.Start(ctx, "Service.ProcessJob")
	defer span.End()

	if err := s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx repository.Tx) error {
		return tx.UpdateJobStatus(ctx, task.JobID, domain.JobProcessing)
	}); err != nil {
		return err
	}

	time.Sleep(10 * time.Millisecond)

	if err := s.store.WithTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(tx repository.Tx) error {
		return tx.UpdateJobStatus(ctx, task.JobID, domain.JobDone)
	}); err != nil {
		return err
	}
	s.obs.Logger.InfoContext(ctx, "job processed", "job_id", task.JobID)
	return nil
}

func (s *Service) withDeadlockRetry(ctx context.Context, fn func() error) error {
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		err = fn()
		if !errors.Is(err, domain.ErrDeadlock) {
			return err
		}
		s.obs.Logger.WarnContext(ctx, "deadlock retry", "attempt", attempt+1)
		time.Sleep(time.Duration(attempt+1) * 10 * time.Millisecond)
	}
	return err
}

