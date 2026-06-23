#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.68`",
    "Startup config contract gate",
    "node scripts/check-startup-config-contract.mjs",
    "PORT",
    "QUEUE_SIZE",
    "WORKERS",
  ],
  "production-api-worker/README.md": [
    "Startup Configuration Contract",
    "make startup-config-check",
    "PORT",
    "QUEUE_SIZE",
    "WORKERS",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.68",
    "Startup configuration contract gate",
    "node scripts/check-startup-config-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.68",
    "Startup configuration contract gate",
    "check-startup-config-contract.mjs",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultPort",
    "DefaultQueueSize",
    "DefaultWorkers",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "parsePort",
    "parsePositiveInt",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "TestLoadFromLookupDefaults",
    "TestLoadFromLookupUsesEnvironment",
    "PORT must be a TCP port number",
    "QUEUE_SIZE must be a positive integer",
    "WORKERS must be a positive integer",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Startup config contract gate",
    "node scripts/check-startup-config-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Startup config contract gate",
    "node scripts/check-startup-config-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Startup config contract gate",
    "node scripts/check-startup-config-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Startup config contract gate",
    "node scripts/check-startup-config-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "startup-config-check",
    "node scripts/check-startup-config-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check startup config contract",
    "node scripts/check-startup-config-contract.mjs",
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

const config = read("production-api-worker/internal/config/config.go");
const configChecks = [
  [/parsePort\("PORT"[\s\S]*DefaultPort/, "parse PORT with default"],
  [/parsePositiveInt\("QUEUE_SIZE"[\s\S]*DefaultQueueSize/, "parse QUEUE_SIZE with default"],
  [/parsePositiveInt\("WORKERS"[\s\S]*DefaultWorkers/, "parse WORKERS with default"],
  [/OTLPEndpoint:\s+strings\.TrimSpace\(readString\(lookup, "OTEL_EXPORTER_OTLP_ENDPOINT", ""\)\)/, "trim OTEL_EXPORTER_OTLP_ENDPOINT"],
  [/parsePositiveInt\(name, value string\)[\s\S]*must be a positive integer/, "positive integer fail-fast helper"],
  [/parsePort\(name, value string\)[\s\S]*must be a TCP port number/, "TCP port fail-fast helper"],
];

for (const [pattern, label] of configChecks) {
  if (!pattern.test(config)) {
    missing.push(`production-api-worker/internal/config/config.go must ${label}`);
  }
}

const tests = read("production-api-worker/internal/config/config_test.go");
const testCases = [
  "PORT",
  "QUEUE_SIZE",
  "WORKERS",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "port is not a number",
  "port is out of range",
  "queue size is not positive",
  "workers is not positive",
];

for (const testCase of testCases) {
  if (!tests.includes(testCase)) {
    missing.push(`production-api-worker/internal/config/config_test.go missing startup config test case: ${testCase}`);
  }
}

if (missing.length > 0) {
  console.error("startup config contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "startup config",
}, null, 2));
