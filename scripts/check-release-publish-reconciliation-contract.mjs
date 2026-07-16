#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  makefile: "production-api-worker/Makefile",
  workflow: ".github/workflows/ci.yml",
  previousUpdateRecord: "更新資料/2026-07-09-060302-v1.0.83-更新紀錄.md",
  blockedUpdateRecord: "更新資料/2026-07-10-060242-v1.0.84-更新紀錄.md",
  v1088UpdateRecord: "更新資料/2026-07-14-060143-v1.0.88-更新紀錄.md",
  currentUpdateRecord: "更新資料/2026-07-15-060246-v1.0.89-更新紀錄.md",
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

const gateTerms = [
  "Release publish reconciliation contract gate",
  "node scripts/check-release-publish-reconciliation-contract.mjs",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.91`",
  ...gateTerms,
  "force-with-lease",
]);

requireTerms(files.productionReadme, [
  "Release Publish Reconciliation Contract",
  "make release-publish-reconciliation-check",
  ...gateTerms,
]);

requireTerms(files.apiContract, [
  "版本：v1.0.91",
  ...gateTerms,
  "HEAD",
  "origin/main",
  "tag^{}",
]);

requireTerms(files.openapi, [
  "version: v1.0.91",
  "Release publish reconciliation contract gate",
  "check-release-publish-reconciliation-contract.mjs",
  "force-with-lease",
]);

for (const file of [
  files.chapter07,
  files.chapter09,
  files.chapter11,
  files.cheatsheet,
  files.visualCourse,
]) {
  requireTerms(file, gateTerms);
}

requireTerms(files.makefile, [
  "release-publish-reconciliation-check",
  "node scripts/check-release-publish-reconciliation-contract.mjs",
]);

requireTerms(files.workflow, [
  "Check release publish reconciliation contract",
  "node scripts/check-release-publish-reconciliation-contract.mjs",
]);

requireTerms(files.previousUpdateRecord, [
  "remote v1.0.83 created / final release-record amend local-only",
  "HEAD",
  "origin/main",
  "v1.0.83^{}",
  "force-with-lease",
  "git push --force-with-lease=main:ce24a9a94a8304d391b59c09be3f43e64e52252a origin main",
  "git push --force origin refs/tags/v1.0.83",
]);

requireTerms(files.blockedUpdateRecord, [
  "local release complete / remote push blocked",
  "git push origin main refs/tags/v1.0.84",
  "Could not resolve host: github.com",
  "main...origin/main",
]);

requireTerms(files.currentUpdateRecord, [
  "Release publish recovery continuation",
  "2026-07-15 06:02:46 CST +0800",
  "2026-07-15-060246-v1.0.89-更新紀錄.md",
  "v1.0.88 final release-record amend recovery",
  "git push --force-with-lease=main:43d607a3f5bdef4076709f079e41aca0c78f07cc origin main refs/tags/v1.0.88 --force",
  "43d607a...45a26b6 main -> main (forced update)",
  "0090050...5b0d3c0 v1.0.88 -> v1.0.88 (forced update)",
  "45a26b6cdceb3e7561190cd5d08d3c93fb87c1b0",
  "v1.0.88^{}",
  "force-with-lease",
]);

requireTerms(files.v1088UpdateRecord, [
  "remote initial publish succeeded / final release-record amend push blocked",
  "git push origin main --force-with-lease",
  "git push origin refs/tags/v1.0.88 --force",
  "main...origin/main [ahead 1, behind 1]",
]);

if (missing.length > 0) {
  console.error("release publish reconciliation contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release publish reconciliation",
  version: "v1.0.91",
  previousRelease: "v1.0.88",
  evidence: "final release-record amend recovered, continuation recorded",
}, null, 2));
