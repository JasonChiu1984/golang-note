package worker

import (
	"context"
	"errors"
	"sync"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"
)

type Task struct {
	JobID string
}

type Processor func(ctx context.Context, task Task) error

type Observer interface {
	ObserveWorkerQueueDepth(depth int)
	ObserveWorkerJobDuration(seconds float64)
	ObserveWorkerJobResult(result string)
}

var ErrClosed = errors.New("queue closed")

type Queue struct {
	jobs      chan Task
	processor Processor
	obs       Observer
	wg        sync.WaitGroup
	mu        sync.Mutex
	closed    bool
}

func New(size int, processor Processor, obs Observer) *Queue {
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
	defer q.mu.Unlock()

	if q.closed {
		return ErrClosed
	}

	select {
	case q.jobs <- task:
		q.observeDepth()
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		if q.obs != nil {
			q.obs.ObserveWorkerJobResult("dropped")
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
						q.obs.ObserveWorkerJobDuration(time.Since(start).Seconds())
						if err != nil {
							q.obs.ObserveWorkerJobResult("failed")
						} else {
							q.obs.ObserveWorkerJobResult("success")
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
		q.obs.ObserveWorkerQueueDepth(len(q.jobs))
	}
}
