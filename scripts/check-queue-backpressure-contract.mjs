#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/worker/queue.go",
  "production-api-worker/internal/worker/queue_test.go",
  "production-api-worker/internal/api/handler_test.go",
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
    "Queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
    "TestQueueBackpressureContract",
  ],
  "production-api-worker/README.md": [
    "Queue Backpressure Contract",
    "make queue-backpressure-check",
    "TestQueueBackpressureContract",
  ],
  "production-api-worker/internal/worker/queue.go": [
    "domain.ErrQueueFull",
    'ObserveWorkerJobResult("dropped")',
    "ObserveWorkerQueueDepth",
  ],
  "production-api-worker/internal/worker/queue_test.go": [
    "TestQueueBackpressureContract",
    "domain.ErrQueueFull",
    'resultCount("dropped")',
    "lastDepth",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "queue full",
    "http.StatusServiceUnavailable",
    "queue_full",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.85",
    "Queue backpressure contract",
    "queue_full",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.85",
    "Queue backpressure returns 503 queue_full",
    "QueueFull",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check queue backpressure contract",
    "node scripts/check-queue-backpressure-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "queue-backpressure-check",
    "check-queue-backpressure-contract.mjs",
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

const queue = read("production-api-worker/internal/worker/queue.go");
if (!/default:[\s\S]*ObserveWorkerJobResult\("dropped"\)[\s\S]*return domain\.ErrQueueFull/.test(queue)) {
  missing.push("production-api-worker/internal/worker/queue.go must record dropped result and return domain.ErrQueueFull when bounded queue is full");
}

const tests = read("production-api-worker/internal/worker/queue_test.go");
if (!/TestQueueBackpressureContract[\s\S]*New\(1,[\s\S]*errors\.Is\(err, domain\.ErrQueueFull\)[\s\S]*resultCount\("dropped"\)[\s\S]*lastDepth\(\)/.test(tests)) {
  missing.push("production-api-worker/internal/worker/queue_test.go must prove bounded queue full returns ErrQueueFull, records dropped, and preserves depth");
}

if (missing.length > 0) {
  console.error("queue backpressure contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "queue backpressure",
}, null, 2));
