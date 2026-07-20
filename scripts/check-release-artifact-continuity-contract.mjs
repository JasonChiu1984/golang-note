#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const expectedVersion = "v1.0.94";
const releaseDate = "2026-07-21";
const fullDateTime = "2026-07-21 06:01:21 CST +0800";
const artifactTimestamp = "2026-07-21-060121";
const expectedCheckerCount = 58;
const releaseTopic = "Structured log schema governance contract gate";

const currentArtifacts = {
  review: `審查報告/${artifactTimestamp}-資深工程師審查報告.md`,
  needed: `內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`,
  record: `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
};

const surfaceFiles = [
  "README.md",
  "CHANGELOG.md",
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

const required = {
  "README.md": [
    `教材版本：\`${expectedVersion}\``,
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "CHANGELOG.md": [
    `## ${expectedVersion} - ${releaseDate}`,
    releaseTopic,
    "check-structured-log-schema-governance-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "production-api-worker/README.md": [
    "Release Artifact Continuity Index Contract",
    "make structured-log-schema-governance-check",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    `版本：${expectedVersion}`,
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "production-api-worker/api/openapi.yaml": [
    `version: ${expectedVersion}`,
    "Structured log schema governance contract gate",
    "check-structured-log-schema-governance-contract.mjs",
    `all ${expectedCheckerCount} root contract checker scripts`,
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    releaseTopic,
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  "docs/index.html": [
    releaseTopic,
    "check-structured-log-schema-governance-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "structured-log-schema-governance-check",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check release artifact continuity index contract",
    "node scripts/check-structured-log-schema-governance-contract.mjs",
  ],
};

const missing = [];
const versionText = readFileSync("VERSION", "utf8").trim();
if (versionText !== expectedVersion) {
  missing.push(`VERSION expected ${expectedVersion}, found ${versionText}`);
}

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();
if (contractScripts.length !== expectedCheckerCount) {
  missing.push(`expected ${expectedCheckerCount} root contract checker scripts, found ${contractScripts.length}`);
}

for (const [file, terms] of Object.entries(required)) {
  if (!existsSync(file)) {
    missing.push(`missing surface file: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

const currentRequired = {
  [currentArtifacts.review]: [
    `審查日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    "基準版本：v1.0.93",
    expectedVersion,
    releaseTopic,
    "go1.26.5",
    "go1.25.12",
  ],
  [currentArtifacts.needed]: [
    `更新日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `來源審查報告：\`${currentArtifacts.review}\``,
    `對應版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    "scripts/check-structured-log-schema-governance-contract.mjs",
  ],
  [currentArtifacts.record]: [
    `更新日期：${releaseDate}`,
    `完整日期時間：${fullDateTime}`,
    `版本：${expectedVersion}`,
    `本輪主題：${releaseTopic}`,
    basename(currentArtifacts.review),
    basename(currentArtifacts.needed),
    basename(currentArtifacts.record),
    "scripts/check-structured-log-schema-governance-contract.mjs",
  ],
};

for (const [file, terms] of Object.entries(currentRequired)) {
  if (!existsSync(file)) {
    missing.push(`missing current artifact: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

const updateRecords = readdirSync("更新資料")
  .filter((file) => /^\d{4}-\d{2}-\d{2}-\d{6}-v\d+\.\d+\.\d+-更新紀錄\.md$/.test(file))
  .sort();

const recentRecords = updateRecords.slice(-10);
let previousPatch = null;
for (const file of recentRecords) {
  const match = file.match(/^(\d{4}-\d{2}-\d{2}-\d{6})-v1\.0\.(\d+)-更新紀錄\.md$/);
  if (!match) {
    missing.push(`unexpected update record version pattern: ${file}`);
    continue;
  }
  const [, timestamp, patchText] = match;
  const patch = Number(patchText);
  if (previousPatch !== null && patch !== previousPatch + 1) {
    missing.push(`non-continuous recent release patch sequence around v1.0.${previousPatch} -> v1.0.${patch}`);
  }
  previousPatch = patch;

  const expectedReview = `審查報告/${timestamp}-資深工程師審查報告.md`;
  const expectedNeeded = `內容需要更新的部分/${timestamp}-內容需要更新的部分.md`;
  const expectedRecord = `更新資料/${file}`;
  for (const artifact of [expectedReview, expectedNeeded, expectedRecord]) {
    if (!existsSync(artifact)) missing.push(`missing paired release artifact: ${artifact}`);
  }
  const recordText = existsSync(expectedRecord) ? readFileSync(expectedRecord, "utf8") : "";
  for (const artifactName of [basename(expectedReview), basename(expectedNeeded), file]) {
    if (!recordText.includes(artifactName)) {
      missing.push(`${expectedRecord} missing continuity reference: ${artifactName}`);
    }
  }
}

if (updateRecords.at(-1) !== `${artifactTimestamp}-${expectedVersion}-更新紀錄.md`) {
  missing.push(`latest update record expected ${artifactTimestamp}-${expectedVersion}-更新紀錄.md, found ${updateRecords.at(-1)}`);
}

if (missing.length > 0) {
  console.error("release artifact continuity index contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release artifact continuity index",
  version: expectedVersion,
  artifactTimestamp,
  recentRecords: recentRecords.length,
  scripts: contractScripts.length,
}, null, 2));
