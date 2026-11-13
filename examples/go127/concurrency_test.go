package modern

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/synctest"
	"time"

	"golang.org/x/sync/errgroup"
)

func TestErrgroupFirstErrorAndWaitForAll(t *testing.T) {
	first, second := errors.New("first"), errors.New("second")
	g, ctx := errgroup.WithContext(context.Background())
	observedCancel, release := make(chan struct{}), make(chan struct{})
	g.Go(func() error { return first })
	g.Go(func() error {
		<-ctx.Done()
		close(observedCancel)
		<-release
		return second
	})
	result := make(chan error, 1)
	go func() { result <- g.Wait() }()
	<-observedCancel
	select {
	case err := <-result:
		t.Fatalf("Wait returned before all tasks exited: %v", err)
	default:
	}
	close(release)
	if err := <-result; !errors.Is(err, first) || errors.Is(err, second) {
		t.Fatalf("Wait should return only first error, got %v", err)
	}
}

func TestErrgroupSuccessStillCancelsDerivedContext(t *testing.T) {
	g, ctx := errgroup.WithContext(context.Background())
	g.Go(func() error { return nil })
	if err := g.Wait(); err != nil {
		t.Fatal(err)
	}
	if !errors.Is(ctx.Err(), context.Canceled) {
		t.Fatalf("ctx.Err() = %v", ctx.Err())
	}
}

func TestErrgroupParentCancellationIsNotAutomaticReturnError(t *testing.T) {
	parent, cancel := context.WithCancel(context.Background())
	cancel()
	g, _ := errgroup.WithContext(parent)
	g.Go(func() error { return nil })
	if err := g.Wait(); err != nil {
		t.Fatalf("all tasks returned nil; Wait = %v", err)
	}
}

func TestTryGoAtLimit(t *testing.T) {
	var g errgroup.Group
	g.SetLimit(1)
	release := make(chan struct{})
	g.Go(func() error { <-release; return nil })
	if g.TryGo(func() error { return nil }) {
		t.Error("TryGo unexpectedly started at limit")
	}
	close(release)
	if err := g.Wait(); err != nil {
		t.Fatal(err)
	}
}

func TestCollectAll(t *testing.T) {
	first, second := errors.New("first"), errors.New("second")
	err := CollectAll([]func() error{func() error { return first }, func() error { return nil }, func() error { return second }})
	if !errors.Is(err, first) || !errors.Is(err, second) {
		t.Fatalf("missing joined error: %v", err)
	}
	if err := CollectAll(nil); err != nil {
		t.Fatalf("empty tasks: %v", err)
	}
	if err := CollectAll([]func() error{func() error { return nil }}); err != nil {
		t.Fatal(err)
	}
}

func TestWaitGroupGoAtomicCounter(t *testing.T) {
	var wg sync.WaitGroup
	var n atomic.Int64
	for range 20 {
		wg.Go(func() { n.Add(1) })
	}
	wg.Wait()
	if got := n.Load(); got != 20 {
		t.Fatalf("counter = %d", got)
	}
}

func TestTimeoutWithSynctest(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var observed atomic.Bool
		go func() { <-ctx.Done(); observed.Store(true) }()
		synctest.Wait()
		if observed.Load() {
			t.Fatal("canceled before deadline")
		}
		time.Sleep(5 * time.Second) // Virtual time inside the bubble.
		synctest.Wait()
		if !observed.Load() || !errors.Is(ctx.Err(), context.DeadlineExceeded) {
			t.Fatal("deadline not observed")
		}
	})
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type countedBody struct {
	io.Reader
	closes *atomic.Int64
}

func (b countedBody) Close() error { b.closes.Add(1); return nil }

func TestFetchAllSuccessAndClosesBodies(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		var closes, active, peak atomic.Int64
		gate := make(chan struct{})
		client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			n := active.Add(1)
			defer active.Add(-1)
			for old := peak.Load(); n > old; old = peak.Load() {
				if peak.CompareAndSwap(old, n) {
					break
				}
			}
			<-gate
			return &http.Response{StatusCode: 200, Body: countedBody{strings.NewReader("ok"), &closes}, Header: make(http.Header), Request: r}, nil
		})}
		urls := make([]string, 20)
		for i := range urls {
			urls[i] = "https://example.test/" + strconv.Itoa(i)
		}
		done := make(chan error, 1)
		go func() { done <- FetchAll(context.Background(), client, urls, 3) }()
		synctest.Wait()
		if got := active.Load(); got != 3 {
			t.Errorf("active before release = %d, want 3", got)
		}
		close(gate)
		if err := <-done; err != nil {
			t.Fatal(err)
		}
		if got := closes.Load(); got != int64(len(urls)) {
			t.Fatalf("closed %d bodies", got)
		}
		if peak.Load() > 3 {
			t.Fatalf("active exceeded limit: %d", peak.Load())
		}
	})
}

func TestFetchAllFailureCancelsAndWaitsForSibling(t *testing.T) {
	started, canceled := make(chan struct{}), make(chan struct{})
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path == "/wait" {
			close(started)
			<-r.Context().Done()
			close(canceled)
			return nil, r.Context().Err()
		}
		<-started
		return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader("unavailable")), Header: make(http.Header), Request: r}, nil
	})}
	err := FetchAll(context.Background(), client, []string{"https://example.test/wait", "https://example.test/fail"}, 2)
	if err == nil || !strings.Contains(err.Error(), "HTTP 503") {
		t.Fatalf("error = %v", err)
	}
	select {
	case <-canceled:
	default:
		t.Fatal("returned before sibling exited")
	}
}

func TestFetchAllValidationAndParentCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := FetchAll(ctx, http.DefaultClient, nil, 1); !errors.Is(err, context.Canceled) {
		t.Fatalf("parent cancellation: %v", err)
	}
	if err := FetchAll(context.Background(), http.DefaultClient, nil, 0); err == nil {
		t.Fatal("accepted zero limit")
	}
	if err := FetchAll(context.Background(), nil, nil, 1); err == nil {
		t.Fatal("accepted nil client")
	}
	if err := FetchAll(context.Background(), http.DefaultClient, []string{":invalid"}, 1); err == nil {
		t.Fatal("accepted malformed URL")
	}
}

func TestGenericMethod(t *testing.T) {
	got := (Converter{}).Map([]int{1, 2, 3}, strconv.Itoa)
	if strings.Join(got, ",") != "1,2,3" {
		t.Fatalf("Map = %v", got)
	}
}
