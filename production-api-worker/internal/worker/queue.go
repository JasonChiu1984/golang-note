package worker

import (
	"context"
	"errors"
	"sync"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
	"golang-learning-notes/production-api-worker/internal/observability"
)

type Task struct {
	JobID string
}

type Processor func(ctx context.Context, task Task) error

type Queue struct {
	jobs      chan Task
	processor Processor
	obs       *observability.Observability
	wg        sync.WaitGroup
	mu        sync.Mutex
	closed    bool
}

func New(size int, processor Processor, obs *observability.Observability) *Queue {
	if size <= 0 {
		size = 32
	}
	return &Queue{
		jobs:      make(chan Task, size),
		processor: processor,
		obs:       obs,
	}
}

func (q *Queue) Enqueue(ctx context.Context, task Task) error {
	q.mu.Lock()
	closed := q.closed
	q.mu.Unlock()
	if closed {
		return errors.New("queue closed")
	}

	select {
	case q.jobs <- task:
		q.observeDepth()
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		if q.obs != nil {
			q.obs.Metrics.JobsTotal.WithLabelValues("dropped").Inc()
		}
		return domain.ErrQueueFull
	}
}

func (q *Queue) Start(ctx context.Context, workers int) {
	if workers <= 0 {
		workers = 1
	}
	for i := 0; i < workers; i++ {
		q.wg.Add(1)
		go func() {
			defer q.wg.Done()
			for {
				select {
				case task, ok := <-q.jobs:
					if !ok {
						return
					}
					q.observeDepth()
					start := time.Now()
					err := q.processor(ctx, task)
					if q.obs != nil {
						q.obs.Metrics.JobDuration.Observe(time.Since(start).Seconds())
						if err != nil {
							q.obs.Metrics.JobsTotal.WithLabelValues("failed").Inc()
						} else {
							q.obs.Metrics.JobsTotal.WithLabelValues("success").Inc()
						}
					}
				case <-ctx.Done():
					return
				}
			}
		}()
	}
}

func (q *Queue) Shutdown() {
	_ = q.ShutdownContext(context.Background())
}

func (q *Queue) ShutdownContext(ctx context.Context) error {
	q.mu.Lock()
	if !q.closed {
		q.closed = true
		close(q.jobs)
	}
	q.mu.Unlock()

	done := make(chan struct{})
	go func() {
		q.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (q *Queue) observeDepth() {
	if q.obs != nil {
		q.obs.Metrics.QueueDepth.Set(float64(len(q.jobs)))
	}
}
