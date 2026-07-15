#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  runbook: "production-api-worker/docs/operational-runbook.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  compose: "production-api-worker/docker-compose.yml",
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

const governanceTerms = [
  "Secret handling governance contract gate",
  "node scripts/check-secret-handling-governance-contract.mjs",
  "API_KEY",
  "PPROF_TOKEN",
  "secret rotation owner",
  "no hard-coded production credentials",
  "incident artifact redaction",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.90`",
  "54 個 root contract checker",
  ...governanceTerms,
]);

requireTerms(files.productionReadme, [
  "Secret Handling Governance Contract",
  "make secret-handling-governance-check",
  "bearer token file",
  "secret mount",
  ...governanceTerms,
]);

requireTerms(files.runbook, [
  "Secret handling governance contract gate",
  "secret manager",
  "secret mount",
  "bearer token file",
  "incident artifact redaction",
  "secret rotation owner",
  "no hard-coded production credentials",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.90",
  "Secret handling governance contract gate",
  "node scripts/check-secret-handling-governance-contract.mjs",
  "no hard-coded production credentials",
]);

requireTerms(files.openapi, [
  "version: v1.0.90",
  "Secret handling governance contract gate",
  "check-secret-handling-governance-contract.mjs",
  "secret rotation owner",
  "incident artifact redaction",
]);

requireTerms(files.compose, [
  "API_KEY: ${API_KEY:-}",
  "PPROF_TOKEN: ${PPROF_TOKEN:-}",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter10, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Secret handling governance contract gate",
    "node scripts/check-secret-handling-governance-contract.mjs",
  ]);
}

requireTerms(files.workflow, [
  "Check secret handling governance contract",
  "node scripts/check-secret-handling-governance-contract.mjs",
]);

requireTerms(files.makefile, [
  "secret-handling-governance-check",
  "node scripts/check-secret-handling-governance-contract.mjs",
]);

if (missing.length > 0) {
  console.error("secret handling governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "secret handling governance",
  files: Object.keys(files).length,
}, null, 2));
