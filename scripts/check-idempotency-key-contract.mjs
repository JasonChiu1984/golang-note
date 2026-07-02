#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/internal/domain/types.go",
  "production-api-worker/internal/app/service.go",
  "production-api-worker/internal/app/service_test.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/internal/repository/memory.go",
  "production-api-worker/internal/repository/postgres.go",
  "production-api-worker/migrations/001_init.sql",
  "production-api-worker/migrations/002_idempotency_key.sql",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
    "TestIdempotencyKeyContract",
  ],
  "production-api-worker/README.md": [
    "Idempotency Key Contract",
    "make idempotency-key-check",
    "Idempotency-Key",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.77",
    "Idempotency-Key",
    "idempotency key",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.77",
    "Idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
  ],
  "production-api-worker/internal/domain/types.go": [
    "IdempotencyKey",
    "ValidateIdempotencyKey",
    "idempotency key must not contain whitespace",
  ],
  "production-api-worker/internal/app/service.go": [
    "GetJobByIdempotencyKey",
    "input.IdempotencyKey",
    "if !created",
  ],
  "production-api-worker/internal/app/service_test.go": [
    "TestCreateJobIdempotencyKeyContract",
    "client-retry-1",
    "duplicate idempotency key should enqueue once",
  ],
  "production-api-worker/internal/api/handler.go": [
    "idempotencyKeyHeader",
    "Idempotency-Key",
    "input.IdempotencyKey",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestIdempotencyKeyContract",
    "retry-key-1",
    "duplicate idempotency key should enqueue once",
  ],
  "production-api-worker/internal/repository/memory.go": [
    "GetJobByIdempotencyKey",
    "job.IdempotencyKey == key",
  ],
  "production-api-worker/internal/repository/postgres.go": [
    "idempotency_key",
    "GetJobByIdempotencyKey",
    "nullString(job.IdempotencyKey)",
  ],
  "production-api-worker/migrations/001_init.sql": [
    "idempotency_key TEXT",
    "idx_jobs_idempotency_key",
  ],
  "production-api-worker/migrations/002_idempotency_key.sql": [
    "ADD COLUMN IF NOT EXISTS idempotency_key",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_key",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Idempotency key contract gate",
    "node scripts/check-idempotency-key-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Idempotency key contract",
    "check-idempotency-key-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "idempotency-key-check",
    "check-idempotency-key-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check idempotency key contract",
    "node scripts/check-idempotency-key-contract.mjs",
    "TestIdempotencyKeyContract",
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

const service = read("production-api-worker/internal/app/service.go");
if (!/GetJobByIdempotencyKey\(ctx, input\.IdempotencyKey\)[\s\S]*created = false[\s\S]*return nil/.test(service)) {
  missing.push("production-api-worker/internal/app/service.go must return an existing job for duplicate idempotency keys");
}
if (!/if !created[\s\S]*return job, nil/.test(service)) {
  missing.push("production-api-worker/internal/app/service.go must skip enqueue for duplicate idempotency keys");
}

const postgres = read("production-api-worker/internal/repository/postgres.go");
if (!/WHERE idempotency_key = \$1/.test(postgres)) {
  missing.push("production-api-worker/internal/repository/postgres.go must query by idempotency_key");
}

if (missing.length > 0) {
  console.error("idempotency key contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "idempotency key",
  files: files.length,
}, null, 2));
