#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/lifecycle/readiness.go",
  "production-api-worker/internal/lifecycle/readiness_test.go",
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
    "Readiness lifecycle contract",
    "TestReadinessContract",
    "node scripts/check-readiness-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Readiness Lifecycle Contract",
    "make readiness-check",
    "TestReadinessContract",
  ],
  "production-api-worker/internal/lifecycle/readiness.go": [
    "type Readiness",
    "Ready() bool",
    "MarkDraining",
  ],
  "production-api-worker/internal/lifecycle/readiness_test.go": [
    "TestReadinessSwitchesToDraining",
    "new readiness state must start ready",
    "readiness must be false after draining starts",
  ],
  "production-api-worker/internal/api/handler.go": [
    "GET /livez",
    "GET /readyz",
    "http.StatusServiceUnavailable",
    "draining",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestReadinessContract",
    "http.StatusOK",
    "http.StatusServiceUnavailable",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.75",
    "Readiness lifecycle keeps /livez public",
    "Service is draining and should stop receiving new traffic",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.75",
    "Readiness lifecycle gate",
    "node scripts/check-readiness-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Readiness lifecycle contract",
    "node scripts/check-readiness-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Readiness lifecycle contract gate",
    "node scripts/check-readiness-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Readiness lifecycle contract",
    "check-readiness-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "readiness-check",
    "node scripts/check-readiness-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check readiness contract",
    "node scripts/check-readiness-contract.mjs",
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
if (!/^  \/livez:\n    get:[\s\S]*?security: \[\][\s\S]*?"200":\n          description: Process is alive/m.test(openapi)) {
  missing.push("production-api-worker/api/openapi.yaml must keep /livez public with a 200 response");
}

if (!/^  \/readyz:\n    get:[\s\S]*?security: \[\][\s\S]*?"200":[\s\S]*?"503":/m.test(openapi)) {
  missing.push("production-api-worker/api/openapi.yaml must keep /readyz public with 200 and 503 responses");
}

const handler = read("production-api-worker/internal/api/handler.go");
if (!/mux\.HandleFunc\("GET \/livez"[\s\S]*mux\.HandleFunc\("GET \/readyz", h\.readyz\)/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go must register /livez and /readyz routes");
}

if (!/func \(h \*Handler\) readyz[\s\S]*!h\.ready\(\)[\s\S]*http\.StatusServiceUnavailable[\s\S]*http\.StatusOK/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go must map draining readiness to 503 and ready state to 200");
}

if (missing.length > 0) {
  console.error("readiness contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "readiness lifecycle",
}, null, 2));
