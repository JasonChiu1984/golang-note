#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  collector: "production-api-worker/otel-collector.yaml",
  compose: "production-api-worker/docker-compose.yml",
  runbook: "production-api-worker/docs/operational-runbook.md",
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter10: "chapters/10-performance-and-memory.md",
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

requireTerms(files.collector, [
  "receivers:",
  "otlp:",
  "grpc:",
  "endpoint: 0.0.0.0:4317",
  "exporters:",
  "debug:",
  "verbosity: basic",
  "pipelines:",
  "traces:",
  "receivers: [otlp]",
  "exporters: [debug]",
]);

requireTerms(files.compose, [
  "otel-collector:",
  "otel/opentelemetry-collector:",
  "./otel-collector.yaml:/etc/otelcol/config.yaml:ro",
  "\"4317:4317\"",
  "OTEL_EXPORTER_OTLP_ENDPOINT: otel-collector:4317",
]);

requireTerms(files.runbook, [
  "OTLP collector contract",
  "production-api-worker/otel-collector.yaml",
  "0.0.0.0:4317",
  "debug exporter",
  "node scripts/check-otel-collector-contract.mjs",
]);

requireTerms(files.readme, [
  "OTLP collector contract",
  "production-api-worker/otel-collector.yaml",
  "node scripts/check-otel-collector-contract.mjs",
]);

requireTerms(files.productionReadme, [
  "OTLP Collector Contract",
  "make otel-check",
  "debug exporter",
  "OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317",
]);

requireTerms(files.chapter07, [
  "OTLP collector contract",
  "production-api-worker/otel-collector.yaml",
  "debug exporter",
]);

requireTerms(files.chapter10, [
  "OTLP collector contract",
  "node scripts/check-otel-collector-contract.mjs",
]);

requireTerms(files.workflow, [
  "Check OTLP collector contract",
  "node scripts/check-otel-collector-contract.mjs",
]);

if (missing.length > 0) {
  console.error("otel collector contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  checkedFiles: Object.keys(files).length,
  collector: "production-api-worker",
  receiver: "otlp/grpc",
  endpoint: "0.0.0.0:4317",
  exporter: "debug",
}, null, 2));
