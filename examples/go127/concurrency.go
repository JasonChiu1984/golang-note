package modern

import (
	"context"
	"errors"
	"fmt"
	"golang.org/x/sync/errgroup"
	"net/http"
	"sync"
)

func FetchAll(ctx context.Context, client *http.Client, urls []string, limit int) error {
	if limit <= 0 {
		return fmt.Errorf("limit must be positive")
	}
	if client == nil {
		return fmt.Errorf("client must not be nil")
	}
	g, groupCtx := errgroup.WithContext(ctx)
	g.SetLimit(limit)
	for _, url := range urls { // Go 1.22+：以 := 宣告的 range 變數逐次獨立
		g.Go(func() error {
			if err := groupCtx.Err(); err != nil {
				return err
			}
			req, err := http.NewRequestWithContext(groupCtx, http.MethodGet, url, nil)
			if err != nil {
				return fmt.Errorf("request %q: %w", url, err)
			}
			resp, err := client.Do(req)
			if err != nil {
				return fmt.Errorf("fetch %q: %w", url, err)
			}
			defer resp.Body.Close()
			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				return fmt.Errorf("fetch %q: HTTP %d", url, resp.StatusCode)
			}
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return err
	}
	return ctx.Err() // 檢查父 context，不要在此檢查已必然取消的 groupCtx
}

func CollectAll(tasks []func() error) error {
	errs := make([]error, len(tasks))
	var wg sync.WaitGroup
	for i, task := range tasks {
		wg.Go(func() { // Go 1.25+
			errs[i] = task()
		})
	}
	wg.Wait()
	return errors.Join(errs...)
}
