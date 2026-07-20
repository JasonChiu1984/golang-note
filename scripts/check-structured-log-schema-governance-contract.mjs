#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/docs/operational-runbook.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.94`",
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "request_id",
    "trace_id",
    "log retention owner",
    "58 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Structured Log Schema Governance Contract",
    "make structured-log-schema-governance-check",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "audit log review cadence",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.94",
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "log redaction policy",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "Structured log schema governance contract gate",
    "request_id",
    "trace_id",
    "severity",
    "error_code",
    "route",
    "log retention owner",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.94",
    "Structured log schema governance contract gate",
    "check-structured-log-schema-governance-contract.mjs",
    "audit log review cadence",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "log retention owner",
  ],
  "chapters/09-build-and-deploy.md": [
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "audit log review cadence",
  ],
  "chapters/11-advanced-testing.md": [
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "log redaction policy",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "request_id",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Structured log schema governance contract gate",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    "trace_id",
  ],
  "production-api-worker/Makefile": [
    "structured-log-schema-governance-check",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check structured log schema governance contract",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
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
  console.error("structured log schema governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "structured log schema governance",
  files: files.length,
}, null, 2));
