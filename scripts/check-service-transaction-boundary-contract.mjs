#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/app/service.go",
  "production-api-worker/internal/app/service_test.go",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.79`",
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
    "TestServiceTransactionBoundaryContract",
  ],
  "production-api-worker/README.md": [
    "Service Transaction Boundary Contract",
    "make service-transaction-boundary-check",
    "TestServiceTransactionBoundaryContract",
  ],
  "production-api-worker/internal/app/service.go": [
    "sql.TxOptions{Isolation: sql.LevelReadCommitted}",
    "s.queue.Enqueue(ctx, worker.Task{JobID: job.ID})",
    "tx.UpdateJobStatus(ctx, job.ID, domain.JobFailed)",
  ],
  "production-api-worker/internal/app/service_test.go": [
    "TestServiceTransactionBoundaryContract",
    "sql.LevelReadCommitted",
    "job must enqueue exactly once after transaction commit",
    "queue-full job status",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.79",
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.79",
    "Service transaction boundary contract",
    "check-service-transaction-boundary-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Service transaction boundary contract",
    "check-service-transaction-boundary-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check service transaction boundary contract",
    "node scripts/check-service-transaction-boundary-contract.mjs",
    "TestServiceTransactionBoundaryContract",
  ],
  "production-api-worker/Makefile": [
    "service-transaction-boundary-check",
    "check-service-transaction-boundary-contract.mjs",
    "TestServiceTransactionBoundaryContract",
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
if (!/store\.WithTx\(ctx, &sql\.TxOptions\{Isolation: sql\.LevelReadCommitted\}[\s\S]*tx\.InsertJob\(ctx, job\)[\s\S]*if err := s\.queue\.Enqueue/.test(service)) {
  missing.push("production-api-worker/internal/app/service.go must insert the job in a LevelReadCommitted transaction before queue enqueue");
}
if (!/if err := s\.queue\.Enqueue[\s\S]*store\.WithTx\(ctx, &sql\.TxOptions\{Isolation: sql\.LevelReadCommitted\}[\s\S]*tx\.UpdateJobStatus\(ctx, job\.ID, domain\.JobFailed\)/.test(service)) {
  missing.push("production-api-worker/internal/app/service.go must mark queue-full enqueue failures as failed inside a transaction");
}

if (missing.length > 0) {
  console.error("service transaction boundary contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "service transaction boundary",
  files: files.length,
}, null, 2));
