package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	dir := os.Getenv("MIGRATIONS_DIR")
	if dir == "" {
		dir = "migrations"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatal(err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		log.Fatal(err)
	}
	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			files = append(files, filepath.Join(dir, entry.Name()))
		}
	}
	sort.Strings(files)

	for _, file := range files {
		body, err := os.ReadFile(file)
		if err != nil {
			log.Fatal(err)
		}
		if _, err := db.ExecContext(ctx, string(body)); err != nil {
			log.Fatalf("apply %s: %v", file, err)
		}
		log.Printf("applied %s", file)
	}
}

