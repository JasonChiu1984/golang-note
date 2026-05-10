package crawler

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestCrawlerCrawlsDiscoveredLinks(t *testing.T) {
	store := NewMemoryStore()
	app, err := New(
		StaticFetcher{Pages: map[string]string{
			"https://example.test/":      `<title>Home</title><a href="/about">About</a><a href="/about">Again</a>`,
			"https://example.test/about": `<title>About</title>`,
		}},
		LinkParser{},
		store,
		Config{Workers: 2, MaxDepth: 1, QueueSize: 8},
	)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	stats, err := app.Run(context.Background(), []Task{{URL: "https://example.test/"}})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	if stats.Fetched != 2 {
		t.Fatalf("Fetched = %d, want 2; stats=%+v", stats.Fetched, stats)
	}
	if stats.Scheduled != 2 {
		t.Fatalf("Scheduled = %d, want 2; stats=%+v", stats.Scheduled, stats)
	}
	if len(store.Results()) != 2 {
		t.Fatalf("results = %d, want 2", len(store.Results()))
	}
}

func TestCrawlerRetriesThenSucceeds(t *testing.T) {
	store := NewMemoryStore()
	fetcher := &flakyFetcher{
		failuresBeforeSuccess: 1,
		body:                  `<title>Retry OK</title>`,
	}
	app, err := New(fetcher, LinkParser{}, store, Config{Workers: 1, MaxRetries: 2, QueueSize: 4})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	stats, err := app.Run(context.Background(), []Task{{URL: "https://example.test/retry"}})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	if stats.Retried != 1 {
		t.Fatalf("Retried = %d, want 1; stats=%+v", stats.Retried, stats)
	}
	if stats.Fetched != 1 {
		t.Fatalf("Fetched = %d, want 1; stats=%+v", stats.Fetched, stats)
	}
}

func TestCrawlerReturnsContextError(t *testing.T) {
	store := NewMemoryStore()
	app, err := New(blockingFetcher{}, LinkParser{}, store, Config{Workers: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	_, err = app.Run(ctx, []Task{{URL: "https://example.test/slow"}})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("Run() error = %v, want context deadline exceeded", err)
	}
}

type flakyFetcher struct {
	mu                    sync.Mutex
	failuresBeforeSuccess int
	body                  string
	calls                 int
}

func (f *flakyFetcher) Fetch(ctx context.Context, task Task) (FetchedPage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.calls++
	if f.calls <= f.failuresBeforeSuccess {
		return FetchedPage{}, errors.New("temporary failure")
	}
	return FetchedPage{URL: task.URL, Body: []byte(f.body), StatusCode: 200}, nil
}

type blockingFetcher struct{}

func (blockingFetcher) Fetch(ctx context.Context, task Task) (FetchedPage, error) {
	<-ctx.Done()
	return FetchedPage{}, ctx.Err()
}
