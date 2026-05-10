package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

func runConcurrency() {
	fmt.Println("\n-- concurrency --")

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	jobs := make(chan int)
	results := make(chan int)

	var wg sync.WaitGroup
	for worker := 0; worker < 3; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				select {
				case results <- job * job:
				case <-ctx.Done():
					return
				}
			}
		}()
	}

	go func() {
		defer close(jobs)
		for job := 1; job <= 5; job++ {
			select {
			case jobs <- job:
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	sum := 0
	for result := range results {
		sum += result
	}
	fmt.Println("worker result sum:", sum)
}
