#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/internal/repository/postgres.go",
  "production-api-worker/cmd/api-worker/main.go",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
    "DATABASE_MAX_OPEN_CONNS",
    "DATABASE_MAX_IDLE_CONNS",
    "DATABASE_CONN_MAX_LIFETIME",
  ],
  "production-api-worker/README.md": [
    "DB Pool Contract",
    "make db-pool-check",
    "DATABASE_MAX_OPEN_CONNS",
    "DATABASE_MAX_IDLE_CONNS",
    "DATABASE_CONN_MAX_LIFETIME",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.79",
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultDatabaseMaxOpenConns",
    "DefaultDatabaseMaxIdleConns",
    "DefaultDatabaseConnMaxLifetime",
    "DATABASE_MAX_IDLE_CONNS must be less than or equal to DATABASE_MAX_OPEN_CONNS",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "TestLoadFromLookupDefaults",
    "TestLoadFromLookupUsesEnvironment",
    "database max idle conns is greater than max open conns",
  ],
  "production-api-worker/internal/repository/postgres.go": [
    "type PoolConfig",
    "OpenPostgresWithPool",
    "SetMaxOpenConns",
    "SetMaxIdleConns",
    "SetConnMaxLifetime",
  ],
  "production-api-worker/cmd/api-worker/main.go": [
    "repository.OpenPostgresWithPool",
    "MaxOpenConns:    cfg.DatabaseMaxOpenConns",
    "MaxIdleConns:    cfg.DatabaseMaxIdleConns",
    "ConnMaxLifetime: cfg.DatabaseConnMaxLifetime",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "DB pool contract gate",
    "node scripts/check-db-pool-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "db-pool-check",
    "node scripts/check-db-pool-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check DB pool contract",
    "node scripts/check-db-pool-contract.mjs",
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
if (!/parsePositiveInt\("DATABASE_MAX_OPEN_CONNS"[\s\S]*DefaultDatabaseMaxOpenConns/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must parse DATABASE_MAX_OPEN_CONNS with default");
}
if (!/parsePositiveInt\("DATABASE_MAX_IDLE_CONNS"[\s\S]*DefaultDatabaseMaxIdleConns/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must parse DATABASE_MAX_IDLE_CONNS with default");
}
if (!/databaseMaxIdleConns > databaseMaxOpenConns[\s\S]*DATABASE_MAX_IDLE_CONNS must be less than or equal to DATABASE_MAX_OPEN_CONNS/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must reject idle pool size greater than open pool size");
}
if (!/parsePositiveDuration\("DATABASE_CONN_MAX_LIFETIME"[\s\S]*DefaultDatabaseConnMaxLifetime\.String\(\)/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must parse DATABASE_CONN_MAX_LIFETIME with default");
}

const repository = read("production-api-worker/internal/repository/postgres.go");
if (!/func OpenPostgresWithPool\(ctx context\.Context, dsn string, pool PoolConfig\)[\s\S]*db\.SetMaxOpenConns\(pool\.MaxOpenConns\)[\s\S]*db\.SetMaxIdleConns\(pool\.MaxIdleConns\)[\s\S]*db\.SetConnMaxLifetime\(pool\.ConnMaxLifetime\)/.test(repository)) {
  missing.push("production-api-worker/internal/repository/postgres.go must apply every DB pool option to sql.DB");
}

const main = read("production-api-worker/cmd/api-worker/main.go");
if (!/repository\.OpenPostgresWithPool\(ctx, cfg\.DatabaseURL, repository\.PoolConfig\{[\s\S]*MaxOpenConns:\s+cfg\.DatabaseMaxOpenConns,[\s\S]*MaxIdleConns:\s+cfg\.DatabaseMaxIdleConns,[\s\S]*ConnMaxLifetime:\s+cfg\.DatabaseConnMaxLifetime,/.test(main)) {
  missing.push("production-api-worker/cmd/api-worker/main.go must pass DB pool config into repository.OpenPostgresWithPool");
}

if (missing.length > 0) {
  console.error("DB pool contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "db pool",
}, null, 2));
