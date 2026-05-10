package crawler

import (
	"context"
	"sync"
)

type MemoryStore struct {
	mu      sync.Mutex
	results []Result
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{}
}

func (s *MemoryStore) Save(ctx context.Context, result Result) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.results = append(s.results, result)
	return nil
}

func (s *MemoryStore) Results() []Result {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Result(nil), s.results...)
}
