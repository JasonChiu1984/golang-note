#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/api/context.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.74`",
    "Request timeout contract gate",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Request Timeout Contract",
    "TestRequestTimeoutContract",
    "make request-timeout-check",
  ],
  "production-api-worker/internal/api/context.go": [
    "var contextWithTimeout = context.WithTimeout",
  ],
  "production-api-worker/internal/api/handler.go": [
    "contextWithTimeout(ctx, 2*time.Second)",
    "context.DeadlineExceeded",
    "http.StatusGatewayTimeout",
    "request_timeout",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRequestTimeoutContract",
    "context.WithDeadline(parent, time.Now().Add(-time.Second))",
    "http.StatusGatewayTimeout",
    "timeout-request",
    "request_timeout",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.74",
    "RequestTimeout",
    "request_timeout",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.74",
    "Request timeout gate",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Request timeout static gate",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Request timeout static gate",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "node scripts/check-request-timeout-contract.mjs",
    "make request-timeout-check",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Request timeout contract gate",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "request-timeout-check",
    "node scripts/check-request-timeout-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check request timeout contract",
    "node scripts/check-request-timeout-contract.mjs",
    "TestRequestTimeoutContract",
  ],
};

const missing = [];

for (const file of files) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of required[file]) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

if (missing.length > 0) {
  console.error("request timeout contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "request timeout",
}, null, 2));
