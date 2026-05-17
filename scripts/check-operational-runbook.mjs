#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "production-api-worker/docs/operational-runbook.md",
  "configs/prometheus/production-api-worker-alerts.yml",
  "production-api-worker/README.md",
  "README.md",
  ".github/workflows/ci.yml",
];

const requiredRunbookTerms = [
  "SLI / SLO",
  "api_requests_total",
  "worker_queue_depth",
  "worker_job_duration_seconds",
  "X-Request-ID",
  "Incident workflow",
  "Compose smoke",
  "Risk Notes",
];

const requiredAlertTerms = [
  "ProductionAPIWorkerHigh5xxRate",
  "ProductionAPIWorkerCritical5xxRate",
  "ProductionAPIWorkerQueueDepthHigh",
  "ProductionAPIWorkerWorkerLatencyHigh",
  "ProductionAPIWorkerMetricsMissing",
  "severity: warning",
  "severity: critical",
  "runbook_url:",
  "histogram_quantile",
  "absent(api_requests_total)",
];

const requiredReadmeTerms = [
  "Operational runbook",
  "production-api-worker/docs/operational-runbook.md",
  "configs/prometheus/production-api-worker-alerts.yml",
  "node scripts/check-operational-runbook.mjs",
];

const missing = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
  }
}

function requireTerms(file, terms) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

requireTerms("production-api-worker/docs/operational-runbook.md", requiredRunbookTerms);
requireTerms("configs/prometheus/production-api-worker-alerts.yml", requiredAlertTerms);
requireTerms("README.md", requiredReadmeTerms);
requireTerms("production-api-worker/README.md", requiredReadmeTerms);
requireTerms(".github/workflows/ci.yml", ["Check operational runbook", "node scripts/check-operational-runbook.mjs"]);

if (missing.length > 0) {
  console.error("operational runbook check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  checkedFiles: requiredFiles.length,
  alertRules: requiredAlertTerms.filter((term) => term.startsWith("ProductionAPIWorker")).length,
}, null, 2));
