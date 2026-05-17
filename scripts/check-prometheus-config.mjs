#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  prometheus: "configs/prometheus/prometheus.yml",
  alerts: "configs/prometheus/production-api-worker-alerts.yml",
  compose: "production-api-worker/docker-compose.yml",
  runbook: "production-api-worker/docs/operational-runbook.md",
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  workflow: ".github/workflows/ci.yml",
};

const missing = [];

for (const file of Object.values(files)) {
  if (!existsSync(file)) missing.push(`missing file: ${file}`);
}

function requireTerms(file, terms) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

requireTerms(files.prometheus, [
  "scrape_interval: 15s",
  "evaluation_interval: 15s",
  "rule_files:",
  "/etc/prometheus/rules/production-api-worker-alerts.yml",
  "job_name: production-api-worker",
  "metrics_path: /metrics",
  "api:8080",
  "environment: local-compose",
]);

requireTerms(files.alerts, [
  "ProductionAPIWorkerHigh5xxRate",
  "ProductionAPIWorkerCritical5xxRate",
  "ProductionAPIWorkerQueueDepthHigh",
  "ProductionAPIWorkerWorkerLatencyHigh",
  "ProductionAPIWorkerMetricsMissing",
]);

requireTerms(files.compose, [
  "prometheus:",
  "prom/prometheus:",
  "../configs/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro",
  "../configs/prometheus/production-api-worker-alerts.yml:/etc/prometheus/rules/production-api-worker-alerts.yml:ro",
  "\"9090:9090\"",
  "monitoring",
]);

requireTerms(files.runbook, [
  "Prometheus scrape config",
  "configs/prometheus/prometheus.yml",
  "docker compose --profile monitoring up -d --build",
  "http://localhost:9090",
  "API_KEY",
]);

requireTerms(files.readme, [
  "Prometheus config gate",
  "configs/prometheus/prometheus.yml",
  "node scripts/check-prometheus-config.mjs",
]);

requireTerms(files.productionReadme, [
  "Prometheus Local Monitoring",
  "make prometheus-check",
  "docker compose --profile monitoring up -d --build",
]);

requireTerms(files.workflow, [
  "Check Prometheus config",
  "node scripts/check-prometheus-config.mjs",
]);

if (missing.length > 0) {
  console.error("prometheus config check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  checkedFiles: Object.keys(files).length,
  scrapeJob: "production-api-worker",
  monitoringProfile: true,
}, null, 2));
