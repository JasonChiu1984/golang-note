#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Request body limit contract",
    "REQUEST_BODY_LIMIT_BYTES",
    "node scripts/check-request-body-limit-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Request Body Limit Contract",
    "REQUEST_BODY_LIMIT_BYTES",
    "TestRequestBodyLimitContract",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultRequestBodyLimitBytes",
    "RequestBodyLimitBytes",
    "REQUEST_BODY_LIMIT_BYTES",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "DefaultRequestBodyLimitBytes",
    "REQUEST_BODY_LIMIT_BYTES",
    "request body limit is not positive",
  ],
  "production-api-worker/internal/api/handler.go": [
    "WithRequestBodyLimitBytes",
    "http.MaxBytesReader",
    "payload_too_large",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRequestBodyLimitContract",
    "http.StatusRequestEntityTooLarge",
    "payload_too_large",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.74",
    "REQUEST_BODY_LIMIT_BYTES",
    "PayloadTooLarge",
  ],
  "production-api-worker/docs/api-contract.md": [
    "Request body limit",
    "REQUEST_BODY_LIMIT_BYTES",
    "payload_too_large",
  ],
  ".github/workflows/ci.yml": [
    "Check request body limit contract",
    "node scripts/check-request-body-limit-contract.mjs",
    "TestRequestBodyLimitContract",
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
  console.error("request body limit contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "request body limit",
}, null, 2));
