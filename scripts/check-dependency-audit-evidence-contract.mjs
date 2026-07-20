#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/operational-runbook.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.94`",
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "release evidence retention",
    "module proxy / vulnerability database",
  ],
  "production-api-worker/README.md": [
    "Dependency Audit Evidence Freshness Contract",
    "make dependency-audit-evidence-check",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "release evidence retention",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.94",
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "module proxy / vulnerability database",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.94",
    "Dependency audit evidence freshness contract gate",
    "check-dependency-audit-evidence-contract.mjs",
    "release evidence retention",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "Dependency audit evidence freshness contract gate",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "release evidence retention",
  ],
  "chapters/09-build-and-deploy.md": [
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "module proxy / vulnerability database",
  ],
  "chapters/11-advanced-testing.md": [
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "待補掃描",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "release evidence retention",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Dependency audit evidence freshness contract gate",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
    "module proxy / vulnerability database",
  ],
  "production-api-worker/Makefile": [
    "dependency-audit-evidence-check",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check dependency audit evidence freshness contract",
    "node scripts/check-dependency-audit-evidence-contract.mjs",
  ],
};

const missing = [];

for (const file of files) {
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
  console.error("dependency audit evidence freshness contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "dependency audit evidence freshness",
  files: files.length,
}, null, 2));
