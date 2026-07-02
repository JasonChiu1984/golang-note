#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Panic recovery contract",
    "TestPanicRecoveryContract",
    "node scripts/check-panic-recovery-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Panic Recovery Contract",
    "make panic-recovery-check",
    "TestPanicRecoveryContract",
  ],
  "production-api-worker/internal/api/handler.go": [
    "recoverMiddleware",
    "panic recovered",
    '"internal_error"',
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestPanicRecoveryContract",
    "panic-request",
    '"internal_error"',
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.77",
    "panic recovery",
    "internal_error",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.77",
    "Panic recovery gate",
    "node scripts/check-panic-recovery-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Panic recovery contract",
    "node scripts/check-panic-recovery-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Panic recovery contract gate",
    "node scripts/check-panic-recovery-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Panic recovery contract",
    "check-panic-recovery-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "panic-recovery-check",
    "node scripts/check-panic-recovery-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check panic recovery contract",
    "node scripts/check-panic-recovery-contract.mjs",
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

const handler = read("production-api-worker/internal/api/handler.go");
if (!/recoverMiddleware[\s\S]*recover\(\)[\s\S]*panic recovered[\s\S]*internal_error/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go must recover panic and return the stable internal_error envelope");
}

if (missing.length > 0) {
  console.error("panic recovery contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "panic recovery",
}, null, 2));
