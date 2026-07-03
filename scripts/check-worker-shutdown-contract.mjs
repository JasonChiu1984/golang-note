#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  queue: "production-api-worker/internal/worker/queue.go",
  tests: "production-api-worker/internal/worker/queue_test.go",
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  makefile: "production-api-worker/Makefile",
  workflow: ".github/workflows/ci.yml",
};

const missing = [];

for (const file of Object.values(files)) {
  if (!existsSync(file)) missing.push(`missing file: ${file}`);
}

function requireTerms(file, terms) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

requireTerms(files.queue, [
  "var ErrClosed = errors.New(\"queue closed\")",
  "mu        sync.Mutex",
  "closed    bool",
  "func (q *Queue) Enqueue(ctx context.Context, task Task) error",
  "q.mu.Lock()",
  "if q.closed",
  "return ErrClosed",
  "q.jobs <- task",
  "func (q *Queue) ShutdownContext(ctx context.Context) error",
  "q.closed = true",
  "close(q.jobs)",
  "q.wg.Wait()",
]);

requireTerms(files.tests, [
  "TestEnqueueAfterShutdownReturnsClosedError",
  "TestConcurrentEnqueueAndShutdownDoesNotPanic",
  "errors.Is(err, ErrClosed)",
  "queue.ShutdownContext(context.Background())",
]);

requireTerms(files.readme, [
  "教材版本：`v1.0.78`",
  "Worker shutdown contract",
  "TestConcurrentEnqueueAndShutdownDoesNotPanic",
  "node scripts/check-worker-shutdown-contract.mjs",
  "46 個 root contract checker",
]);

requireTerms(files.productionReadme, [
  "Worker Shutdown Contract",
  "make worker-shutdown-check",
  "TestConcurrentEnqueueAndShutdownDoesNotPanic",
  "node scripts/check-worker-shutdown-contract.mjs",
  "46 個 root contract checker",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.78",
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
  "TestConcurrentEnqueueAndShutdownDoesNotPanic",
  "46 個 root contract checker",
]);

requireTerms(files.openapi, [
  "version: v1.0.78",
  "Worker shutdown contract",
  "check-worker-shutdown-contract.mjs",
]);

requireTerms(files.chapter07, [
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
]);

requireTerms(files.chapter09, [
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
]);

requireTerms(files.chapter11, [
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
  "make worker-shutdown-check",
]);

requireTerms(files.cheatsheet, [
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
  "make worker-shutdown-check",
]);

requireTerms(files.visualCourse, [
  "Worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
  "make worker-shutdown-check",
]);

requireTerms(files.makefile, [
  "worker-shutdown-check",
  "node scripts/check-worker-shutdown-contract.mjs",
  "Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic",
]);

requireTerms(files.workflow, [
  "Check worker shutdown contract",
  "node scripts/check-worker-shutdown-contract.mjs",
  "Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic",
]);

if (missing.length > 0) {
  console.error("worker shutdown contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "worker shutdown",
  tests: [
    "TestEnqueueAfterShutdownReturnsClosedError",
    "TestConcurrentEnqueueAndShutdownDoesNotPanic",
  ],
  checkedFiles: Object.keys(files).length,
}, null, 2));
