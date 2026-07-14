#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";

const expectedVersion = "v1.0.89";
const releaseDate = "2026-07-15";
const artifactTimestamp = "2026-07-15-060246";
const expectedCheckerCount = 53;

const version = readFileSync("VERSION", "utf8").trim();
const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();

const files = [
  "VERSION",
  "CHANGELOG.md",
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
  `審查報告/${artifactTimestamp}-資深工程師審查報告.md`,
  `內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`,
  `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
];

const required = {
  "VERSION": [expectedVersion],
  "CHANGELOG.md": [
    `## ${expectedVersion} - ${releaseDate}`,
    "Release publish recovery continuation",
    "check-release-publish-reconciliation-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "README.md": [
    `教材版本：\`${expectedVersion}\``,
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "production-api-worker/README.md": [
    "Release Version Consistency Contract",
    "make release-version-consistency-check",
    "node scripts/check-release-version-consistency-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    `版本：${expectedVersion}`,
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "production-api-worker/api/openapi.yaml": [
    `version: ${expectedVersion}`,
    "Release version consistency contract gate",
    "check-release-version-consistency-contract.mjs",
    `all ${expectedCheckerCount} root contract checker scripts`,
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Release artifact metadata consistency contract gate",
    "node scripts/check-release-artifact-metadata-contract.mjs",
  ],
  "docs/index.html": [
    "Release version consistency contract gate",
    "check-release-version-consistency-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "release-version-consistency-check",
    "node scripts/check-release-version-consistency-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check release version consistency contract",
    "node scripts/check-release-version-consistency-contract.mjs",
  ],
  [`審查報告/${artifactTimestamp}-資深工程師審查報告.md`]: [
    "Release publish recovery continuation",
    expectedVersion,
    "2026-07-15 06:02:46 CST +0800",
  ],
  [`內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`]: [
    "Release publish recovery continuation",
    "scripts/check-release-publish-reconciliation-contract.mjs",
    expectedVersion,
  ],
  [`更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`]: [
    "Release publish recovery continuation",
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "docs/index.html",
  ],
};

const missing = [];

if (version !== expectedVersion) {
  missing.push(`VERSION expected ${expectedVersion}, found ${version}`);
}

if (contractScripts.length !== expectedCheckerCount) {
  missing.push(`expected ${expectedCheckerCount} root contract checker scripts, found ${contractScripts.length}`);
}

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

const workflow = existsSync(".github/workflows/ci.yml")
  ? readFileSync(".github/workflows/ci.yml", "utf8")
  : "";
for (const script of contractScripts) {
  if (!workflow.includes(`node scripts/${script}`)) {
    missing.push(`.github/workflows/ci.yml missing contract checker call: node scripts/${script}`);
  }
}

if (missing.length > 0) {
  console.error("release version consistency contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release version consistency",
  version: expectedVersion,
  rootContractCheckers: contractScripts.length,
  files: files.length,
}, null, 2));
