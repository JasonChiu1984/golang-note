#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/docs/operational-runbook.md",
  "configs/prometheus/prometheus.yml",
  "configs/prometheus/production-api-worker-alerts.yml",
  "production-api-worker/docker-compose.yml",
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
    "教材版本：`v1.0.63`",
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
    "API key scrape auth 風險",
  ],
  "production-api-worker/README.md": [
    "Operational Observability Contract",
    "make operational-observability-check",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.63",
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
    "API key scrape auth",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "SLI / SLO",
    "api_requests_total",
    "worker_queue_depth",
    "worker_job_duration_seconds",
    "Incident workflow",
    "Prometheus scrape config",
    "API_KEY",
  ],
  "configs/prometheus/prometheus.yml": [
    "scrape_interval: 15s",
    "rule_files:",
    "/etc/prometheus/rules/production-api-worker-alerts.yml",
    "job_name: production-api-worker",
    "metrics_path: /metrics",
    "api:8080",
  ],
  "configs/prometheus/production-api-worker-alerts.yml": [
    "ProductionAPIWorkerHigh5xxRate",
    "ProductionAPIWorkerCritical5xxRate",
    "ProductionAPIWorkerQueueDepthHigh",
    "ProductionAPIWorkerWorkerLatencyHigh",
    "ProductionAPIWorkerMetricsMissing",
    "runbook_url:",
  ],
  "production-api-worker/docker-compose.yml": [
    "prometheus:",
    "../configs/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro",
    "../configs/prometheus/production-api-worker-alerts.yml:/etc/prometheus/rules/production-api-worker-alerts.yml:ro",
    "monitoring",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Operational observability contract gate",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "operational-observability-check",
    "node scripts/check-operational-observability-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check operational observability contract",
    "node scripts/check-operational-observability-contract.mjs",
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
  console.error("operational observability contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "operational observability",
  files: files.length,
  gates: ["runbook", "prometheus", "alerts", "compose monitoring profile"],
}, null, 2));
