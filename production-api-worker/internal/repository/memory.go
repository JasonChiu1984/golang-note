package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
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

type MemoryStore struct {
	mu           sync.Mutex
	jobs         map[string]domain.Job
	nextDeadlock bool
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{jobs: map[string]domain.Job{}}
}

func (s *MemoryStore) ForceNextDeadlock() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextDeadlock = true
}

func (s *MemoryStore) WithTx(ctx context.Context, opts *sql.TxOptions, fn func(Tx) error) error {
	if ctx == nil {
		return errors.New("context is required")
	}
	if opts == nil {
		opts = &sql.TxOptions{Isolation: sql.LevelReadCommitted}
	}
	if opts.Isolation == sql.LevelDefault {
		opts.Isolation = sql.LevelReadCommitted
	}

	s.mu.Lock()
	defer s.mu.Unlock()

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

func (s *MemoryStore) GetJob(ctx context.Context, id string) (domain.Job, error) {
	if ctx == nil {
		return domain.Job{}, errors.New("context is required")
	}
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
	if job.ID == "" {
		return fmt.Errorf("id is required: %w", domain.ErrInvalidInput)
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
