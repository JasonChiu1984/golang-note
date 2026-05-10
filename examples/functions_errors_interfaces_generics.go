package main

import (
	"context"
	"errors"
	"fmt"
)

var errDivideByZero = errors.New("divide by zero")

type KeyValueStore interface {
	Save(ctx context.Context, key string, value []byte) error
}

type MemoryKeyValueStore struct {
	data map[string][]byte
}

func NewMemoryKeyValueStore() *MemoryKeyValueStore {
	return &MemoryKeyValueStore{data: map[string][]byte{}}
}

func (s *MemoryKeyValueStore) Save(ctx context.Context, key string, value []byte) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		s.data[key] = append([]byte(nil), value...)
		return nil
	}
}

func runFunctionsErrorsInterfacesGenerics() {
	fmt.Println("\n-- functions, errors, interfaces, generics --")

	value, err := divide(10, 2)
	if err != nil {
		fmt.Println("divide failed:", err)
	} else {
		fmt.Println("divide result:", value)
	}

	if _, err := divide(10, 0); errors.Is(err, errDivideByZero) {
		fmt.Println("wrapped error can still be checked")
	}

	var store KeyValueStore = NewMemoryKeyValueStore()
	if err := store.Save(context.Background(), "language", []byte("go")); err != nil {
		fmt.Println("save failed:", err)
	}

	first, ok := First([]string{"goroutine", "channel"})
	fmt.Printf("first=%s ok=%t contains=%t\n", first, ok, Contains([]int{1, 2, 3}, 2))
}

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, fmt.Errorf("divide %d by %d: %w", a, b, errDivideByZero)
	}
	return a / b, nil
}

func First[T any](items []T) (T, bool) {
	var zero T
	if len(items) == 0 {
		return zero, false
	}
	return items[0], true
}

func Contains[T comparable](items []T, target T) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}
