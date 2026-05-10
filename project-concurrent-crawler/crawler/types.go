package crawler

import (
	"context"
	"time"
)

type Task struct {
	URL      string
	Depth    int
	Attempts int
}

type FetchedPage struct {
	URL        string
	Body       []byte
	StatusCode int
}

type ParsedPage struct {
	Title string
	Links []string
}

type Result struct {
	URL        string
	Title      string
	Links      []string
	StatusCode int
	Error      string
	FetchedAt  time.Time
}

type Stats struct {
	Scheduled int
	Fetched   int
	Failed    int
	Retried   int
	Skipped   int
}

type Fetcher interface {
	Fetch(ctx context.Context, task Task) (FetchedPage, error)
}

type Parser interface {
	Parse(page FetchedPage) (ParsedPage, error)
}

type Store interface {
	Save(ctx context.Context, result Result) error
}

type Config struct {
	Workers    int
	MaxDepth   int
	MaxRetries int
	QueueSize  int
	RateLimit  time.Duration
}

func (c Config) withDefaults() Config {
	if c.Workers <= 0 {
		c.Workers = 3
	}
	if c.QueueSize <= 0 {
		c.QueueSize = 32
	}
	if c.MaxDepth < 0 {
		c.MaxDepth = 0
	}
	if c.MaxRetries < 0 {
		c.MaxRetries = 0
	}
	return c
}
