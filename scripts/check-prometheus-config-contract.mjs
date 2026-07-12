#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  prometheus: "configs/prometheus/prometheus.yml",
  alerts: "configs/prometheus/production-api-worker-alerts.yml",
  compose: "production-api-worker/docker-compose.yml",
  runbook: "production-api-worker/docs/operational-runbook.md",
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter10: "chapters/10-performance-and-memory.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  workflow: ".github/workflows/ci.yml",
  makefile: "production-api-worker/Makefile",
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
  "runbook_url:",
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
  "API_KEY",
  "bearer token file",
  "secret mount",
  "node scripts/check-prometheus-config-contract.mjs",
]);

requireTerms(files.readme, [
  "教材版本：`v1.0.87`",
  "Prometheus config contract gate",
  "configs/prometheus/prometheus.yml",
  "node scripts/check-prometheus-config-contract.mjs",
  "52 個 root contract checker",
]);

requireTerms(files.productionReadme, [
  "Prometheus Config Contract",
  "make prometheus-check",
  "node scripts/check-prometheus-config-contract.mjs",
  "bearer token file",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.87",
  "Prometheus config contract gate",
  "node scripts/check-prometheus-config-contract.mjs",
  "52 個 root contract checker",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter10, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Prometheus config contract gate",
    "node scripts/check-prometheus-config-contract.mjs",
  ]);
}

requireTerms(files.workflow, [
  "Check Prometheus config contract",
  "node scripts/check-prometheus-config-contract.mjs",
]);

requireTerms(files.makefile, [
  "prometheus-check",
  "node scripts/check-prometheus-config-contract.mjs",
]);

if (missing.length > 0) {
  console.error("prometheus config contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "prometheus config",
  checkedFiles: Object.keys(files).length,
  scrapeJob: "production-api-worker",
  monitoringProfile: true,
}, null, 2));
