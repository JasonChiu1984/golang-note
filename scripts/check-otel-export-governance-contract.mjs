#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  runbook: "production-api-worker/docs/operational-runbook.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter10: "chapters/10-performance-and-memory.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  workflow: ".github/workflows/ci.yml",
  makefile: "production-api-worker/Makefile",
};

const required = {
  [files.readme]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
    "sampling rate",
    "retention window",
    "sensitive attribute redaction",
  ],
  [files.productionReadme]: [
    "OTLP Export Governance Contract",
    "make otel-export-governance-check",
    "Tempo、Jaeger、OTLP backend 或雲端 APM",
    "sampling rate",
    "retention window",
    "sensitive attribute redaction",
  ],
  [files.runbook]: [
    "OTLP export governance contract gate",
    "Tempo、Jaeger、OTLP backend 或雲端 APM",
    "sampling rate",
    "retention window",
    "sensitive attribute redaction",
    "trace data owner",
  ],
  [files.apiContract]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
    "sampling rate",
    "retention window",
    "sensitive attribute redaction",
  ],
  [files.openapi]: [
    "OTLP export governance contract gate",
    "check-otel-export-governance-contract.mjs",
    "sampling rate",
    "retention window",
    "sensitive attribute redaction",
  ],
  [files.chapter07]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
    "sampling rate",
  ],
  [files.chapter09]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
    "retention window",
  ],
  [files.chapter10]: [
    "OTLP export governance contract gate",
    "sensitive attribute redaction",
  ],
  [files.chapter11]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
  ],
  [files.cheatsheet]: [
    "OTLP export governance contract gate",
    "node scripts/check-otel-export-governance-contract.mjs",
  ],
  [files.visualCourse]: [
    "OTLP export governance contract gate",
    "check-otel-export-governance-contract.mjs",
    "sampling rate",
  ],
  [files.workflow]: [
    "Check OTLP export governance contract",
    "node scripts/check-otel-export-governance-contract.mjs",
  ],
  [files.makefile]: [
    "otel-export-governance-check",
    "node scripts/check-otel-export-governance-contract.mjs",
  ],
};

const missing = [];

for (const file of Object.values(files)) {
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
  console.error("otel export governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "otel export governance",
  files: Object.keys(files).length,
}, null, 2));
