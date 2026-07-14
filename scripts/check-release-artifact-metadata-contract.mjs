#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const expectedVersion = "v1.0.89";
const releaseDate = "2026-07-15";
const fullDateTime = "2026-07-15 06:02:46 CST +0800";
const artifactTimestamp = "2026-07-15-060246";
const releaseTopic = "Release publish recovery continuation";

const artifacts = {
  review: `審查報告/${artifactTimestamp}-資深工程師審查報告.md`,
  needed: `內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`,
  record: `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
};

const required = {
  [artifacts.review]: [
    `審查日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    "審查版本基準：v1.0.88",
    "官方 Go Release History 查核",
    "go1.26.5",
    "go1.25.12",
    expectedVersion,
    releaseTopic,
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "53 個 root contract checker",
  ],
  [artifacts.needed]: [
    `產生日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `依據審查報告：\`${artifacts.review}\``,
    `目標版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "release-publish-reconciliation-check",
    "53 個 root contract checker",
  ],
  [artifacts.record]: [
    `更新日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    `${artifactTimestamp}-資深工程師審查報告.md`,
    `${artifactTimestamp}-內容需要更新的部分.md`,
    `${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "release-publish-reconciliation-check",
    "53 個 root contract checker",
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
    "node scripts/check-release-artifact-metadata-contract.mjs",
    "53 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Release Artifact Metadata Consistency Contract",
    "make release-artifact-metadata-check",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "Release artifact metadata consistency contract gate",
    "check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    releaseTopic,
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "docs/index.html": [
    "Release artifact metadata consistency contract gate",
    "check-release-artifact-metadata-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "release-artifact-metadata-check",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check release artifact metadata consistency contract",
    "node scripts/check-release-artifact-metadata-contract.mjs",
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
