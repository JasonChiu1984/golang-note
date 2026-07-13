#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/observability/observability.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.88`",
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
    "api_request_duration_seconds",
  ],
  "production-api-worker/README.md": [
    "API Latency Metrics Contract",
    "make api-latency-metrics-check",
    "api_request_duration_seconds",
  ],
  "production-api-worker/internal/observability/observability.go": [
    "RequestDuration *prometheus.HistogramVec",
    "api_request_duration_seconds",
    "ObserveHTTPRequestDuration",
  ],
  "production-api-worker/internal/api/handler.go": [
    "time.Now()",
    "ObserveHTTPRequestDuration",
    "time.Since(start).Seconds()",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestAPILatencyMetricsContract",
    "api_request_duration_seconds_bucket",
    "status=\"Accepted\"",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.88",
    "API latency metrics contract",
    "api_request_duration_seconds",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.88",
    "API latency metrics contract",
    "api_request_duration_seconds",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check API latency metrics contract",
    "node scripts/check-api-latency-metrics-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "api-latency-metrics-check",
    "check-api-latency-metrics-contract.mjs",
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
if (!/start := time\.Now\(\)[\s\S]*RequestsTotal\.WithLabelValues\(route, method, status\)\.Inc\(\)[\s\S]*ObserveHTTPRequestDuration\(route, method, status, time\.Since\(start\)\.Seconds\(\)\)/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go must observe request duration with the same route/method/status labels as api_requests_total");
}

if (missing.length > 0) {
  console.error("api latency metrics contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "api latency metrics",
}, null, 2));
