#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/app/service.go",
  "production-api-worker/internal/app/service_test.go",
  "production-api-worker/docs/api-contract.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
    "TestCreateJobStopsDeadlockRetryWhenContextCanceled",
  ],
  "production-api-worker/README.md": [
    "Retry Cancellation Contract",
    "make retry-cancellation-check",
    "TestCreateJobStopsDeadlockRetryWhenContextCanceled",
  ],
  "production-api-worker/internal/app/service.go": [
    "withDeadlockRetry",
    "time.NewTimer(backoff)",
    "case <-ctx.Done():",
    "return ctx.Err()",
  ],
  "production-api-worker/internal/app/service_test.go": [
    "TestCreateJobStopsDeadlockRetryWhenContextCanceled",
    "cancelingDeadlockStore",
    "job should not be enqueued after canceled retry",
    "WithTx calls",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.57",
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check retry cancellation contract",
    "node scripts/check-retry-cancellation-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "retry-cancellation-check",
    "check-retry-cancellation-contract.mjs",
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
if (!/func \(s \*Service\) withDeadlockRetry\(ctx context\.Context, fn func\(\) error\) error[\s\S]*time\.NewTimer\(backoff\)[\s\S]*select \{[\s\S]*case <-timer\.C:[\s\S]*case <-ctx\.Done\(\):[\s\S]*return ctx\.Err\(\)/.test(service)) {
  missing.push("production-api-worker/internal/app/service.go deadlock retry backoff must select on ctx.Done and return ctx.Err");
}

const tests = read("production-api-worker/internal/app/service_test.go");
if (!/TestCreateJobStopsDeadlockRetryWhenContextCanceled[\s\S]*context\.WithCancel[\s\S]*cancelingDeadlockStore[\s\S]*errors\.Is\(err, context\.Canceled\)[\s\S]*store\.calls != 1[\s\S]*len\(queue\.got\) != 0/.test(tests)) {
  missing.push("production-api-worker/internal/app/service_test.go must prove canceled deadlock retry stops after one transaction and does not enqueue");
}

if (missing.length > 0) {
  console.error("retry cancellation contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "retry cancellation",
}, null, 2));
