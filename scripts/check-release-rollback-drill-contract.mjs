#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  makefile: "production-api-worker/Makefile",
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

const rollbackTerms = [
  "Release rollback drill contract",
  "rollback decision",
  "previous image restore",
  "migration rollback boundary",
  "health verification",
  "metrics verification",
  "postmortem evidence",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.91`",
  "Release rollback drill contract gate",
  "node scripts/check-release-rollback-drill-contract.mjs",
  "55 個 root contract checker",
  ...rollbackTerms,
]);

requireTerms(files.productionReadme, [
  "Release Rollback Drill Contract",
  "make release-rollback-drill-check",
  ...rollbackTerms,
]);

requireTerms(files.apiContract, [
  "版本：v1.0.91",
  "Release rollback drill contract",
  "node scripts/check-release-rollback-drill-contract.mjs",
  ...rollbackTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.91",
  "Release rollback drill contract",
  "check-release-rollback-drill-contract.mjs",
  "previous image restore",
  "migration rollback boundary",
  "postmortem evidence",
]);

for (const file of [files.chapter09, files.chapter11, files.cheatsheet]) {
  requireTerms(file, [
    "Release rollback drill contract",
    "node scripts/check-release-rollback-drill-contract.mjs",
    "make release-rollback-drill-check",
  ]);
}

requireTerms(files.visualCourse, [
  "Release rollback drill contract",
  "node scripts/check-release-rollback-drill-contract.mjs",
  "make release-rollback-drill-check",
  "previous image restore",
]);

requireTerms(files.makefile, [
  "release-rollback-drill-check",
  "node scripts/check-release-rollback-drill-contract.mjs",
]);

requireTerms(files.workflow, [
  "Check release rollback drill contract",
  "node scripts/check-release-rollback-drill-contract.mjs",
]);

if (missing.length > 0) {
  console.error("release rollback drill contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release rollback drill",
  checkedFiles: Object.keys(files).length,
}, null, 2));
