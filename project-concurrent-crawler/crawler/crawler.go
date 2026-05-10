package crawler

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type Crawler struct {
	fetcher Fetcher
	parser  Parser
	store   Store
	config  Config
}

func New(fetcher Fetcher, parser Parser, store Store, config Config) (*Crawler, error) {
	if fetcher == nil {
		return nil, errors.New("fetcher is required")
	}
	if parser == nil {
		return nil, errors.New("parser is required")
	}
	if store == nil {
		return nil, errors.New("store is required")
	}

	return &Crawler{
		fetcher: fetcher,
		parser:  parser,
		store:   store,
		config:  config.withDefaults(),
	}, nil
}

func (c *Crawler) Run(ctx context.Context, seeds []Task) (Stats, error) {
	if ctx == nil {
		return Stats{}, errors.New("context is required")
	}

	jobs := make(chan Task, c.config.QueueSize)
	discovered := make(chan Task, c.config.QueueSize)
	done := make(chan struct{}, c.config.Workers)

	var (
		workerWG sync.WaitGroup
		statsMu  sync.Mutex
		stats    Stats
		seen     = map[string]struct{}{}
		queue    []Task
	)

	schedule := func(task Task) {
		if task.URL == "" {
			stats.Skipped++
			return
		}
		if task.Depth > c.config.MaxDepth {
			stats.Skipped++
			return
		}
		if _, exists := seen[task.URL]; exists && task.Attempts == 0 {
			stats.Skipped++
			return
		}
		if task.Attempts == 0 {
			seen[task.URL] = struct{}{}
			stats.Scheduled++
		}
		queue = append(queue, task)
	}

	for _, seed := range seeds {
		schedule(seed)
	}

	var rate <-chan time.Time
	var stopRate func()
	if c.config.RateLimit > 0 {
		ticker := time.NewTicker(c.config.RateLimit)
		rate = ticker.C
		stopRate = ticker.Stop
	} else {
		stopRate = func() {}
	}
	defer stopRate()

	for i := 0; i < c.config.Workers; i++ {
		workerWG.Add(1)
		go func() {
			defer workerWG.Done()
			for {
				select {
				case task, ok := <-jobs:
					if !ok {
						return
					}
					c.process(ctx, task, discovered, rate, &stats, &statsMu)
					select {
					case done <- struct{}{}:
					case <-ctx.Done():
						return
					}
				case <-ctx.Done():
					return
				}
			}
		}()
	}

	active := 0
	for len(queue) > 0 || active > 0 {
		var (
			nextJobs chan<- Task
			nextTask Task
		)
		if len(queue) > 0 {
			nextJobs = jobs
			nextTask = queue[0]
		}

		select {
		case nextJobs <- nextTask:
			queue = queue[1:]
			active++
		case task := <-discovered:
			schedule(task)
		case <-done:
			active--
		case <-ctx.Done():
			close(jobs)
			workerWG.Wait()
			statsMu.Lock()
			defer statsMu.Unlock()
			return stats, ctx.Err()
		}
	}

	close(jobs)
	workerWG.Wait()

	statsMu.Lock()
	defer statsMu.Unlock()
	return stats, nil
}

func (c *Crawler) process(ctx context.Context, task Task, discovered chan<- Task, rate <-chan time.Time, stats *Stats, statsMu *sync.Mutex) {
	if rate != nil {
		select {
		case <-rate:
		case <-ctx.Done():
			return
		}
	}

	page, err := c.fetcher.Fetch(ctx, task)
	if err != nil {
		if task.Attempts < c.config.MaxRetries {
			statsMu.Lock()
			stats.Retried++
			statsMu.Unlock()
			c.tryDiscover(ctx, discovered, Task{URL: task.URL, Depth: task.Depth, Attempts: task.Attempts + 1})
			return
		}
		c.save(ctx, Result{URL: task.URL, Error: err.Error(), FetchedAt: time.Now()})
		statsMu.Lock()
		stats.Failed++
		statsMu.Unlock()
		return
	}

	parsed, err := c.parser.Parse(page)
	if err != nil {
		c.save(ctx, Result{URL: page.URL, StatusCode: page.StatusCode, Error: fmt.Sprintf("parse: %v", err), FetchedAt: time.Now()})
		statsMu.Lock()
		stats.Failed++
		statsMu.Unlock()
		return
	}

	c.save(ctx, Result{
		URL:        page.URL,
		Title:      parsed.Title,
		Links:      append([]string(nil), parsed.Links...),
		StatusCode: page.StatusCode,
		FetchedAt:  time.Now(),
	})

	statsMu.Lock()
	stats.Fetched++
	statsMu.Unlock()

	for _, link := range parsed.Links {
		c.tryDiscover(ctx, discovered, Task{URL: link, Depth: task.Depth + 1})
	}
}

func (c *Crawler) tryDiscover(ctx context.Context, discovered chan<- Task, task Task) {
	select {
	case discovered <- task:
	case <-ctx.Done():
	}
}

func (c *Crawler) save(ctx context.Context, result Result) {
	if err := c.store.Save(ctx, result); err != nil {
		return
	}
}
