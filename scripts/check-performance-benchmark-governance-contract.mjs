#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter10: "chapters/10-performance-and-memory.md",
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

requireTerms(files.readme, [
  "教材版本：`v1.0.70`",
  "Performance benchmark governance contract gate",
  "node scripts/check-performance-benchmark-governance-contract.mjs",
  "go test -run='^$' -bench=. -benchmem -count=10 ./...",
  "benchstat old.txt new.txt",
  "pprof",
  "metrics",
  "39 個 root contract checker",
]);

requireTerms(files.productionReadme, [
  "Performance Benchmark Governance Contract",
  "make performance-benchmark-governance-check",
  "benchmark A/B",
  "benchstat old.txt new.txt",
  "pprof",
  "metrics",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.70",
  "Performance benchmark governance contract",
  "node scripts/check-performance-benchmark-governance-contract.mjs",
  "benchmark A/B",
  "benchstat old.txt new.txt",
  "39 個 root contract checker",
]);

requireTerms(files.openapi, [
  "version: v1.0.70",
  "Performance benchmark governance contract",
  "check-performance-benchmark-governance-contract.mjs",
  "benchmark A/B",
  "benchstat old.txt new.txt",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter10, files.chapter11, files.cheatsheet]) {
  requireTerms(file, [
    "Performance benchmark governance contract",
    "node scripts/check-performance-benchmark-governance-contract.mjs",
  ]);
}

requireTerms(files.visualCourse, [
  "Performance benchmark governance contract",
  "node scripts/check-performance-benchmark-governance-contract.mjs",
  "make performance-benchmark-governance-check",
]);

requireTerms(files.makefile, [
  "performance-benchmark-governance-check",
  "node scripts/check-performance-benchmark-governance-contract.mjs",
]);

requireTerms(files.workflow, [
  "Check performance benchmark governance contract",
  "node scripts/check-performance-benchmark-governance-contract.mjs",
]);

if (missing.length > 0) {
  console.error("performance benchmark governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "performance benchmark governance",
  checkedFiles: Object.keys(files).length,
}, null, 2));
