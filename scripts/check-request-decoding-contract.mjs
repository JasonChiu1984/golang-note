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
    "Request decoding contract",
    "TestRequestDecodingContract",
    "node scripts/check-request-decoding-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Request Decoding Contract",
    "TestRequestDecodingContract",
    "make request-decoding-check",
  ],
  "production-api-worker/internal/api/handler.go": [
    "DisallowUnknownFields",
    "multiple JSON values",
    "decodeJobInput",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRequestDecodingContract",
    "unknown field",
    "trailing json value",
    "invalid_input",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.64",
    "unknown field",
    "trailing JSON value",
    "invalid_input",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.64",
    "Request decoding gate",
    "node scripts/check-request-decoding-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Request decoding contract",
    "node scripts/check-request-decoding-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Request decoding contract gate",
    "node scripts/check-request-decoding-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Request decoding contract",
    "check-request-decoding-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "request-decoding-check",
    "node scripts/check-request-decoding-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check request decoding contract",
    "node scripts/check-request-decoding-contract.mjs",
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
  console.error("request decoding contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "request decoding",
}, null, 2));
