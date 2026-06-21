#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/internal/migration/migration.go",
  "production-api-worker/internal/migration/migration_test.go",
  "production-api-worker/cmd/migrate/main.go",
  "production-api-worker/migrations/001_init.sql",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "Migration contract gate",
    "node scripts/check-migration-contract.mjs",
    "schema_migrations",
  ],
  "production-api-worker/README.md": [
    "Migration Contract",
    "make migration-check",
    "node scripts/check-migration-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.66",
    "Migration Operation Contract",
    "node scripts/check-migration-contract.mjs",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultMigrationsDir",
    "DefaultMigrationTimeout",
    "LoadMigrationFromLookup",
    "DATABASE_URL is required for migration",
    "MIGRATIONS_DIR must not be empty",
    "MIGRATION_TIMEOUT",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "TestLoadMigrationFromLookupUsesDefaults",
    "TestLoadMigrationFromLookupUsesEnvironment",
    "TestLoadMigrationFromLookupRejectsInvalidConfig",
  ],
  "production-api-worker/internal/migration/migration.go": [
    "schema_migrations",
    "SQLFiles",
    "VersionFromFile",
    "BeginTx",
    "INSERT INTO schema_migrations",
  ],
  "production-api-worker/internal/migration/migration_test.go": [
    "TestSQLFilesReturnsSortedSQLFilesOnly",
    "TestVersionFromFile",
    "TestVersionFromFileRejectsInvalidNames",
  ],
  "production-api-worker/cmd/migrate/main.go": [
    "config.LoadMigration",
    "context.WithTimeout",
    "migration.Runner",
  ],
  "production-api-worker/migrations/001_init.sql": [
    "CREATE TABLE IF NOT EXISTS jobs",
    "CREATE INDEX IF NOT EXISTS idx_jobs_status_updated_at",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Migration contract gate",
    "node scripts/check-migration-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Migration contract gate",
    "node scripts/check-migration-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Migration contract gate",
    "node scripts/check-migration-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Migration contract gate",
    "node scripts/check-migration-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check migration contract",
    "node scripts/check-migration-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "migration-check",
    "check-migration-contract.mjs",
  ],
};

const missing = [];

function read(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

for (const file of files) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    continue;
  }
  const text = read(file);
  for (const term of required[file]) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

const config = read("production-api-worker/internal/config/config.go");
if (!/databaseURL := strings\.TrimSpace\(readString\(lookup, "DATABASE_URL", ""\)\)[\s\S]*if databaseURL == ""[\s\S]*DATABASE_URL is required for migration/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must fail fast when DATABASE_URL is empty");
}
if (!/migrationsDir := strings\.TrimSpace\(readString\(lookup, "MIGRATIONS_DIR", DefaultMigrationsDir\)\)[\s\S]*MIGRATIONS_DIR must not be empty/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must validate MIGRATIONS_DIR");
}
if (!/parsePositiveDuration\("MIGRATION_TIMEOUT"[\s\S]*DefaultMigrationTimeout\.String\(\)/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must validate MIGRATION_TIMEOUT with the default timeout");
}

const migration = read("production-api-worker/internal/migration/migration.go");
if (!/CREATE TABLE IF NOT EXISTS schema_migrations[\s\S]*version TEXT PRIMARY KEY[\s\S]*applied_at TIMESTAMPTZ/.test(migration)) {
  missing.push("production-api-worker/internal/migration/migration.go must create schema_migrations(version, applied_at)");
}
if (!/sort\.Strings\(files\)/.test(migration)) {
  missing.push("production-api-worker/internal/migration/migration.go must sort SQL migration files");
}
if (!/strings\.ContainsAny\(version, " \\t\\r\\n"\)/.test(migration)) {
  missing.push("production-api-worker/internal/migration/migration.go must reject whitespace in migration versions");
}
if (!/BeginTx\(ctx, nil\)[\s\S]*ExecContext\(ctx, string\(body\)\)[\s\S]*INSERT INTO schema_migrations[\s\S]*Commit\(\)/.test(migration)) {
  missing.push("production-api-worker/internal/migration/migration.go must apply and record each migration in one transaction");
}

if (missing.length > 0) {
  console.error("migration contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "migration",
}, null, 2));
