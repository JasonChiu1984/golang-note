#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/internal/api/context.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "Request correlation contract",
    "node scripts/check-request-correlation-contract.mjs",
    "TestRequestIDContract",
  ],
  "production-api-worker/README.md": [
    "Request correlation contract",
    "make request-correlation-check",
    "TestRequestIDContract",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.50",
    "X-Request-ID",
    "request.id",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.50",
    "Request correlation",
    "request.id",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  "production-api-worker/internal/api/context.go": [
    "requestIDHeader",
    "requestIDContextKey",
    "nextRequestID",
    "requestIDFromContext",
  ],
  "production-api-worker/internal/api/handler.go": [
    "requestContextMiddleware",
    "w.Header().Set(requestIDHeader, id)",
    'attribute.String("request.id", requestIDFromContext(ctx))',
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRequestIDContract",
    "TestCreateJobContract",
    "request-from-client",
    "req-",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Request correlation contract",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Request correlation contract gate",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Request correlation contract",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Request correlation contract",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check request correlation contract",
    "node scripts/check-request-correlation-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "request-correlation-check",
    "check-request-correlation-contract.mjs",
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

const openapi = read("production-api-worker/api/openapi.yaml");
const requestIDHeaderCount = (openapi.match(/X-Request-ID/g) || []).length;
if (requestIDHeaderCount < 5) {
  missing.push(`production-api-worker/api/openapi.yaml has too few X-Request-ID references: ${requestIDHeaderCount}`);
}

const handler = read("production-api-worker/internal/api/handler.go");
if (!/requestContextMiddleware[\s\S]*w\.Header\(\)\.Set\(requestIDHeader, id\)[\s\S]*withRequestID/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go does not wire response header and context request id in the same middleware");
}

if (missing.length > 0) {
  console.error("request correlation contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "request correlation",
}, null, 2));
