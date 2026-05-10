package crawler

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

type HTTPFetcher struct {
	client  *http.Client
	maxBody int64
}

func NewHTTPFetcher(timeout time.Duration, maxBody int64) *HTTPFetcher {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	if maxBody <= 0 {
		maxBody = 1 << 20
	}
	return &HTTPFetcher{
		client:  &http.Client{Timeout: timeout},
		maxBody: maxBody,
	}
}

func (f *HTTPFetcher) Fetch(ctx context.Context, task Task) (FetchedPage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, task.URL, nil)
	if err != nil {
		return FetchedPage{}, err
	}

	resp, err := f.client.Do(req)
	if err != nil {
		return FetchedPage{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, f.maxBody))
	if err != nil {
		return FetchedPage{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return FetchedPage{}, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	return FetchedPage{URL: task.URL, Body: body, StatusCode: resp.StatusCode}, nil
}

type StaticFetcher struct {
	Pages map[string]string
}

func (f StaticFetcher) Fetch(ctx context.Context, task Task) (FetchedPage, error) {
	select {
	case <-ctx.Done():
		return FetchedPage{}, ctx.Err()
	default:
	}

	body, ok := f.Pages[task.URL]
	if !ok {
		return FetchedPage{}, fmt.Errorf("page not found: %s", task.URL)
	}
	return FetchedPage{URL: task.URL, Body: []byte(body), StatusCode: http.StatusOK}, nil
}
