#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const version = readFileSync("VERSION", "utf8").trim();
const expectedVersion = "v1.0.89";
const artifactTimestamp = "2026-07-15-060246";

const files = [
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
  `審查報告/${artifactTimestamp}-資深工程師審查報告.md`,
  `內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`,
  `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`,
];

const required = {
  "README.md": [
    "教材版本：`v1.0.89`",
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "CHANGELOG.md": [
    "## v1.0.89 - 2026-07-15",
    "Release publish recovery continuation",
    "check-release-publish-reconciliation-contract.mjs",
    "53 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Release Artifact Chain Contract",
    "make release-artifact-chain-check",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.89",
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.89",
    "Release artifact chain contract gate",
    "check-release-artifact-chain-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Release artifact chain contract gate",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  "docs/index.html": [
    "Release artifact chain contract gate",
    "check-release-artifact-chain-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "release-artifact-chain-check",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check release artifact chain contract",
    "node scripts/check-release-artifact-chain-contract.mjs",
  ],
  [`審查報告/${artifactTimestamp}-資深工程師審查報告.md`]: [
    "Release publish recovery continuation",
    "v1.0.89",
    "2026-07-15 06:02:46 CST +0800",
  ],
  [`內容需要更新的部分/${artifactTimestamp}-內容需要更新的部分.md`]: [
    "Release publish recovery continuation",
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "v1.0.89",
  ],
  [`更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`]: [
    "Release publish recovery continuation",
    "scripts/check-release-publish-reconciliation-contract.mjs",
    "docs/index.html",
    "GitHub push",
  ],
};

const missing = [];

if (version !== expectedVersion) {
  missing.push(`VERSION expected ${expectedVersion}, found ${version}`);
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

const artifactDirs = [
  ["審查報告", `${artifactTimestamp}-資深工程師審查報告.md`],
  ["內容需要更新的部分", `${artifactTimestamp}-內容需要更新的部分.md`],
  ["更新資料", `${artifactTimestamp}-${expectedVersion}-更新紀錄.md`],
];

for (const [dir, expected] of artifactDirs) {
  const latest = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .at(-1);
  if (latest !== expected) {
    missing.push(`${dir} latest artifact expected ${expected}, found ${latest}`);
  }
}

const updateRecord = `更新資料/${artifactTimestamp}-${expectedVersion}-更新紀錄.md`;
if (existsSync(updateRecord)) {
  const text = readFileSync(updateRecord, "utf8");
  const artifactNames = artifactDirs.map(([, file]) => basename(file));
  for (const artifactName of artifactNames) {
    if (!text.includes(artifactName)) {
      missing.push(`${updateRecord} missing artifact reference: ${artifactName}`);
    }
  }
}

if (missing.length > 0) {
  console.error("release artifact chain contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "release artifact chain",
  version: expectedVersion,
  artifactTimestamp,
  files: files.length,
}, null, 2));
