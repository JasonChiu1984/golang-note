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
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  workflow: ".github/workflows/ci.yml",
  makefile: "production-api-worker/Makefile",
};

const missing = [];

function requireTerms(file, terms) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    return;
  }
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

const contractTerms = [
  "Operational runbook scope freshness contract gate",
  "node scripts/check-operational-runbook-scope-contract.mjs",
  "API contract scope coverage",
  "Docs publishing contract gate",
  "Release artifact chain contract gate",
  "Go ReleaseNote freshness evidence",
  "Secret handling governance contract gate",
  "Supply chain artifact governance contract gate",
  "Platform promotion policy contract gate",
  "Alertmanager routing governance contract gate",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.93`",
  "57 個 root contract checker",
  ...contractTerms,
]);

requireTerms(files.productionReadme, [
  "Operational Runbook Scope Freshness Contract",
  "make operational-runbook-scope-check",
  ...contractTerms,
]);

requireTerms(files.runbook, [
  "文件日期：2026-07-20",
  "完整日期時間：2026-07-20 06:08:55 CST +0800",
  "版本：v1.0.93",
  ...contractTerms,
]);

requireTerms(files.apiContract, [
  "版本：v1.0.93",
  ...contractTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.93",
  "Operational runbook scope freshness contract gate",
  "check-operational-runbook-scope-contract.mjs",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Operational runbook scope freshness contract gate",
    "node scripts/check-operational-runbook-scope-contract.mjs",
  ]);
}

requireTerms(files.workflow, [
  "Check operational runbook scope contract",
  "node scripts/check-operational-runbook-scope-contract.mjs",
]);

requireTerms(files.makefile, [
  "operational-runbook-scope-check",
  "node scripts/check-operational-runbook-scope-contract.mjs",
]);

if (missing.length > 0) {
  console.error("operational runbook scope contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "operational runbook scope freshness",
  files: Object.keys(files).length,
}, null, 2));
