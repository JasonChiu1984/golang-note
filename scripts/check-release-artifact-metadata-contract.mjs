#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const expectedVersion = "v1.0.93";
const releaseDate = "2026-07-20";
const fullDateTime = "2026-07-20 06:08:55 CST +0800";
const artifactTimestamp = "2026-07-20-060855";
const releaseTopic = "SLO incident response governance contract gate";

const artifacts = {
  review: `審查報告/${artifactTimestamp}-資深工程師審查報告.md`,
  needed: `內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`,
  record: `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
};

const required = {
  [artifacts.review]: [
    `審查日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    "基準版本：v1.0.92",
    "官方 Go Release History 查核",
    "go1.26.5",
    "go1.25.12",
    expectedVersion,
    releaseTopic,
    "scripts/check-slo-incident-response-governance-contract.mjs",
    "57 個 root contract checker",
  ],
  [artifacts.needed]: [
    `更新日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `來源審查報告：\`${artifacts.review}\``,
    `對應版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    "scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  [artifacts.record]: [
    `更新日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    `${artifactTimestamp}-資深工程師審查報告.md`,
    `${artifactTimestamp}-內容需要更新的部分.md`,
    `${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
    "scripts/check-slo-incident-response-governance-contract.mjs",
    "slo-incident-response-governance-check",
    "57 個 root contract checker",
  ],
};

const surfaceFiles = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "docs/index.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const surfaceRequired = {
  "README.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "57 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Release Artifact Metadata Consistency Contract",
    "make slo-incident-response-governance-check",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "SLO incident response governance contract gate",
    "check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    releaseTopic,
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  "docs/index.html": [
    "SLO incident response governance contract gate",
    "check-release-artifact-metadata-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "release-artifact-metadata-check",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check release artifact continuity index contract",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
};

const missing = [];

for (const [file, terms] of Object.entries(required)) {
  if (!existsSync(file)) {
    missing.push(`missing artifact: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

for (const file of surfaceFiles) {
  if (!existsSync(file)) {
    missing.push(`missing surface file: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of surfaceRequired[file]) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

if (missing.length > 0) {
  console.error("release artifact metadata consistency contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release artifact metadata consistency",
  version: expectedVersion,
  artifactTimestamp,
  artifacts: Object.keys(artifacts).length,
  surfaceFiles: surfaceFiles.length,
}, null, 2));
