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

const policyTerms = [
  "Platform promotion policy contract gate",
  "node scripts/check-platform-promotion-policy-contract.mjs",
  "platform promotion policy",
  "environment approval",
  "progressive rollout",
  "platform-native signing",
  "artifact verification",
  "rollback owner",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.87`",
  "52 個 root contract checker",
  ...policyTerms,
]);

requireTerms(files.productionReadme, [
  "Platform Promotion Policy Contract",
  "make platform-promotion-policy-check",
  ...policyTerms,
]);

requireTerms(files.runbook, [
  "Platform promotion policy contract gate",
  "environment approval",
  "progressive rollout",
  "platform-native signing",
  "artifact verification",
  "rollback owner",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.87",
  ...policyTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.87",
  "Platform promotion policy contract gate",
  "check-platform-promotion-policy-contract.mjs",
  "environment approval",
  "progressive rollout",
  "platform-native signing",
  "artifact verification",
]);

for (const file of [files.chapter09, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Platform promotion policy contract gate",
    "node scripts/check-platform-promotion-policy-contract.mjs",
    "make platform-promotion-policy-check",
    "platform-native signing",
  ]);
}

requireTerms(files.workflow, [
  "Check platform promotion policy contract",
  "node scripts/check-platform-promotion-policy-contract.mjs",
]);

requireTerms(files.makefile, [
  "platform-promotion-policy-check",
  "node scripts/check-platform-promotion-policy-contract.mjs",
]);

if (missing.length > 0) {
  console.error("platform promotion policy contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "platform promotion policy",
  files: Object.keys(files).length,
}, null, 2));
