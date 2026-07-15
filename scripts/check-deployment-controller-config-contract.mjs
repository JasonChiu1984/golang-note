#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  runbook: "production-api-worker/docs/operational-runbook.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
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

const controllerTerms = [
  "Deployment controller config contract gate",
  "node scripts/check-deployment-controller-config-contract.mjs",
  "deployment controller",
  "cloud environment template",
  "environment manifest",
  "progressive rollout controller",
  "health gate",
  "rollback trigger",
  "promotion evidence",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.90`",
  "54 個 root contract checker",
  ...controllerTerms,
]);

requireTerms(files.productionReadme, [
  "Deployment Controller Config Contract",
  "make deployment-controller-config-check",
  ...controllerTerms,
]);

requireTerms(files.runbook, [
  "Deployment controller config contract gate",
  "deployment controller",
  "cloud environment template",
  "environment manifest",
  "health gate",
  "rollback trigger",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.90",
  ...controllerTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.90",
  "Deployment controller config contract gate",
  "check-deployment-controller-config-contract.mjs",
  "deployment controller",
  "cloud environment template",
  "environment manifest",
  "progressive rollout controller",
]);

for (const file of [files.chapter09, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Deployment controller config contract gate",
    "node scripts/check-deployment-controller-config-contract.mjs",
    "make deployment-controller-config-check",
    "rollback trigger",
  ]);
}

requireTerms(files.workflow, [
  "Check deployment controller config contract",
  "node scripts/check-deployment-controller-config-contract.mjs",
]);

requireTerms(files.makefile, [
  "deployment-controller-config-check",
  "node scripts/check-deployment-controller-config-contract.mjs",
]);

if (missing.length > 0) {
  console.error("deployment controller config contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "deployment controller config",
  files: Object.keys(files).length,
}, null, 2));
