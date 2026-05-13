package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang-learning-notes/production-api-worker/internal/domain"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresStore struct {
	db *sql.DB
}

type PoolConfig struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

func OpenPostgres(ctx context.Context, dsn string) (*PostgresStore, error) {
	return OpenPostgresWithPool(ctx, dsn, PoolConfig{
		MaxOpenConns:    25,
		MaxIdleConns:    10,
		ConnMaxLifetime: 30 * time.Minute,
	})
}

func OpenPostgresWithPool(ctx context.Context, dsn string, pool PoolConfig) (*PostgresStore, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(pool.MaxOpenConns)
	db.SetMaxIdleConns(pool.MaxIdleConns)
	db.SetConnMaxLifetime(pool.ConnMaxLifetime)

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) Close() error {
	return s.db.Close()
}

func (s *PostgresStore) WithTx(ctx context.Context, opts *sql.TxOptions, fn func(Tx) error) error {
	if opts == nil {
		opts = &sql.TxOptions{Isolation: sql.LevelReadCommitted}
	}
	tx, err := s.db.BeginTx(ctx, opts)
	if err != nil {
		return classifyPostgresError(err)
	}
	defer tx.Rollback()

	if err := fn(&postgresTx{tx: tx}); err != nil {
		return classifyPostgresError(err)
	}
	return classifyPostgresError(tx.Commit())
}

func (s *PostgresStore) GetJob(ctx context.Context, id string) (domain.Job, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT id, name, payload, status, attempts, created_at, updated_at
FROM jobs
WHERE id = $1`, id)
	return scanJob(row)
}

type postgresTx struct {
	tx *sql.Tx
}

func (tx *postgresTx) InsertJob(ctx context.Context, job domain.Job) error {
	now := time.Now().UTC()
	_, err := tx.tx.ExecContext(ctx, `
INSERT INTO jobs (id, name, payload, status, attempts, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		job.ID, job.Name, job.Payload, job.Status, job.Attempts, now, now)
	return classifyPostgresError(err)
}

func (tx *postgresTx) UpdateJobStatus(ctx context.Context, id string, status domain.JobStatus) error {
	result, err := tx.tx.ExecContext(ctx, `
UPDATE jobs
SET status = $2,
    attempts = attempts + CASE WHEN $2 = 'processing' THEN 1 ELSE 0 END,
    updated_at = $3
WHERE id = $1`, id, status, time.Now().UTC())
	if err != nil {
		return classifyPostgresError(err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return classifyPostgresError(err)
	}
	if affected == 0 {
		return fmt.Errorf("job %s: %w", id, domain.ErrNotFound)
	}
	return nil
}

func (tx *postgresTx) GetJob(ctx context.Context, id string) (domain.Job, error) {
	row := tx.tx.QueryRowContext(ctx, `
SELECT id, name, payload, status, attempts, created_at, updated_at
FROM jobs
WHERE id = $1`, id)
	return scanJob(row)
}

type scanner interface {
	Scan(dest ...any) error
}

func scanJob(row scanner) (domain.Job, error) {
	var job domain.Job
	if err := row.Scan(&job.ID, &job.Name, &job.Payload, &job.Status, &job.Attempts, &job.CreatedAt, &job.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Job{}, domain.ErrNotFound
		}
		return domain.Job{}, classifyPostgresError(err)
	}
	return job, nil
}

func classifyPostgresError(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "SQLSTATE 40P01") {
		return fmt.Errorf("%w: %v", domain.ErrDeadlock, err)
	}
	return err
}
