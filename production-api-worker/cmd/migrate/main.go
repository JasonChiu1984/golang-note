package main

import (
	"context"
	"database/sql"
	"log"

	"golang-learning-notes/production-api-worker/internal/config"
	"golang-learning-notes/production-api-worker/internal/migration"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.LoadMigration()
	if err != nil {
		log.Fatalf("load migration config: %v", err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), cfg.MigrationTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatal(err)
	}

	runner := migration.Runner{
		DB:     db,
		Dir:    cfg.MigrationsDir,
		Logger: log.Default(),
	}
	if err := runner.Apply(ctx); err != nil {
		log.Fatal(err)
	}
}
