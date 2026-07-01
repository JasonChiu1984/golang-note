#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/worker/queue.go",
  "production-api-worker/internal/worker/queue_test.go",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "Worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
    "TestWorkerFailureResultContract",
  ],
  "production-api-worker/README.md": [
    "Worker Failure Contract",
    "make worker-failure-check",
    "TestWorkerFailureResultContract",
  ],
  "production-api-worker/internal/worker/queue.go": [
    'ObserveWorkerJobResult("failed")',
    'ObserveWorkerJobResult("success")',
    "ObserveWorkerJobDuration",
  ],
  "production-api-worker/internal/worker/queue_test.go": [
    "TestWorkerFailureResultContract",
    "processor failed",
    'resultCount("failed")',
    'resultCount("success")',
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.76",
    "Worker failure contract",
    "TestWorkerFailureResultContract",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.76",
    "Worker failure handling keeps failed jobs visible through worker_jobs_total",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check worker failure contract",
    "node scripts/check-worker-failure-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "worker-failure-check",
    "check-worker-failure-contract.mjs",
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

const worker = read("production-api-worker/internal/worker/queue.go");
if (!/err := q\.processor\(ctx, task\)[\s\S]*ObserveWorkerJobDuration[\s\S]*if err != nil[\s\S]*ObserveWorkerJobResult\("failed"\)[\s\S]*ObserveWorkerJobResult\("success"\)/.test(worker)) {
  missing.push("production-api-worker/internal/worker/queue.go must record duration and classify failed/success worker results");
}

if (missing.length > 0) {
  console.error("worker failure contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "worker failure",
}, null, 2));
