package migration

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const schemaTableSQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`

type Runner struct {
	DB     *sql.DB
	Dir    string
	Logger *log.Logger
}

func (r Runner) Apply(ctx context.Context) error {
	if r.DB == nil {
		return fmt.Errorf("migration database is required")
	}
	if strings.TrimSpace(r.Dir) == "" {
		return fmt.Errorf("migration directory is required")
	}
	if _, err := r.DB.ExecContext(ctx, schemaTableSQL); err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	files, err := SQLFiles(r.Dir)
	if err != nil {
		return err
	}
	applied, err := appliedVersions(ctx, r.DB)
	if err != nil {
		return err
	}

	for _, file := range files {
		version, err := VersionFromFile(file)
		if err != nil {
			return err
		}
		if applied[version] {
			r.logf("skip %s", file)
			continue
		}
		if err := r.applyFile(ctx, file, version); err != nil {
			return err
		}
		r.logf("applied %s", file)
	}
	return nil
}

func SQLFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir %s: %w", dir, err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(files)
	return files, nil
}

func VersionFromFile(path string) (string, error) {
	base := filepath.Base(path)
	if filepath.Ext(base) != ".sql" {
		return "", fmt.Errorf("migration file %s must use .sql extension", path)
	}
	version := strings.TrimSuffix(base, ".sql")
	if strings.TrimSpace(version) == "" {
		return "", fmt.Errorf("migration file %s has empty version", path)
	}
	if strings.ContainsAny(version, " \t\r\n") {
		return "", fmt.Errorf("migration version %q must not contain whitespace", version)
	}
	return version, nil
}

func appliedVersions(ctx context.Context, db *sql.DB) (map[string]bool, error) {
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("read schema_migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan schema_migrations: %w", err)
		}
		applied[version] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate schema_migrations: %w", err)
	}
	return applied, nil
}

func (r Runner) applyFile(ctx context.Context, file, version string) error {
	body, err := os.ReadFile(file)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", file, err)
	}
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", file, err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, string(body)); err != nil {
		return fmt.Errorf("apply migration %s: %w", file, err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
		return fmt.Errorf("record migration %s: %w", version, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", file, err)
	}
	return nil
}

func (r Runner) logf(format string, args ...any) {
	if r.Logger != nil {
		r.Logger.Printf(format, args...)
	}
}
