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

const governanceTerms = [
  "Supply chain artifact governance contract gate",
  "node scripts/check-supply-chain-artifact-governance-contract.mjs",
  "SBOM",
  "image signing",
  "provenance / attestation",
  "artifact retention",
  "promotion approval",
  "release evidence owner",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.83`",
  "49 個 root contract checker",
  ...governanceTerms,
]);

requireTerms(files.productionReadme, [
  "Supply Chain Artifact Governance Contract",
  "make supply-chain-artifact-governance-check",
  ...governanceTerms,
]);

requireTerms(files.runbook, [
  "Supply chain artifact governance contract gate",
  "SBOM",
  "image signing",
  "provenance / attestation",
  "artifact retention",
  "promotion approval",
  "release evidence owner",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.83",
  ...governanceTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.83",
  "Supply chain artifact governance contract gate",
  "check-supply-chain-artifact-governance-contract.mjs",
  "SBOM",
  "image signing",
  "provenance / attestation",
  "artifact retention",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Supply chain artifact governance contract gate",
    "node scripts/check-supply-chain-artifact-governance-contract.mjs",
    "SBOM",
    "image signing",
  ]);
}

requireTerms(files.workflow, [
  "Check supply chain artifact governance contract",
  "node scripts/check-supply-chain-artifact-governance-contract.mjs",
]);

requireTerms(files.makefile, [
  "supply-chain-artifact-governance-check",
  "node scripts/check-supply-chain-artifact-governance-contract.mjs",
]);

if (missing.length > 0) {
  console.error("supply chain artifact governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "supply chain artifact governance",
  files: Object.keys(files).length,
}, null, 2));
