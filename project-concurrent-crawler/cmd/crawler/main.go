package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"golang-learning-notes/project-concurrent-crawler/crawler"
)

func main() {
	pages := map[string]string{
		"https://example.test/":      `<html><head><title>Home</title></head><body><a href="/about">About</a><a href="/docs">Docs</a></body></html>`,
		"https://example.test/about": `<html><head><title>About</title></head><body><a href="/docs">Docs</a></body></html>`,
		"https://example.test/docs":  `<html><head><title>Docs</title></head><body></body></html>`,
	}

	store := crawler.NewMemoryStore()
	app, err := crawler.New(
		crawler.StaticFetcher{Pages: pages},
		crawler.LinkParser{},
		store,
		crawler.Config{Workers: 3, MaxDepth: 1, MaxRetries: 1, QueueSize: 16, RateLimit: 10 * time.Millisecond},
	)
	if err != nil {
		log.Fatal(err)
	}

	stats, err := app.Run(context.Background(), []crawler.Task{{URL: "https://example.test/"}})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("stats: %+v\n", stats)
	for _, result := range store.Results() {
		fmt.Printf("%s title=%q links=%d error=%q\n", result.URL, result.Title, len(result.Links), result.Error)
	}
}
