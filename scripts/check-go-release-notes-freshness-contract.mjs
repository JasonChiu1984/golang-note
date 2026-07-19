#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";

const expectedVersion = "v1.0.93";
const expectedCheckerCount = 57;
const freshnessDate = "2026-07-12";
const freshnessTimestamp = "2026-07-12 06:03:15 CST +0800";
const latestPatch = "Go 1.26.5";
const latestPatchTokens = ["go1.26.5", "go1.25.12"];

const files = [
  "scripts/generate-go-release-notes.mjs",
  "ReleaseNote/index.html",
  "docs/ReleaseNote/index.html",
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "scripts/generate-go-release-notes.mjs": [
    'asOf: "2026-07-12"',
    'verifiedAt: "2026-07-12 06:03:15 CST +0800"',
    "Go ReleaseNote freshness evidence",
    "official Go Release History verified",
    latestPatch,
    ...latestPatchTokens,
  ],
  "ReleaseNote/index.html": [
    "Go ReleaseNote freshness evidence",
    freshnessDate,
    freshnessTimestamp,
    "official Go Release History verified",
    latestPatch,
    ...latestPatchTokens,
  ],
  "docs/ReleaseNote/index.html": [
    "Go ReleaseNote freshness evidence",
    freshnessDate,
    freshnessTimestamp,
    "official Go Release History verified",
    latestPatch,
    ...latestPatchTokens,
  ],
  "README.md": [
    `教材版本：\`${expectedVersion}\``,
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
    `${expectedCheckerCount} 個 root contract checker`,
  ],
  "production-api-worker/README.md": [
    "Go ReleaseNote Freshness Evidence Contract",
    "make go-release-notes-freshness-check",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    `版本：${expectedVersion}`,
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
    "official Go Release History verified",
  ],
  "production-api-worker/api/openapi.yaml": [
    `version: ${expectedVersion}`,
    "Go ReleaseNote freshness evidence",
    "check-go-release-notes-freshness-contract.mjs",
    "all 57 root contract checker scripts",
  ],
  "chapters/09-build-and-deploy.md": [
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Go ReleaseNote freshness evidence",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "go-release-notes-freshness-check",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check Go release notes freshness evidence contract",
    "node scripts/check-go-release-notes-freshness-contract.mjs",
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
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();

if (contractScripts.length !== expectedCheckerCount) {
  missing.push(`expected ${expectedCheckerCount} root contract checker scripts, found ${contractScripts.length}`);
}

if (missing.length > 0) {
  console.error("Go ReleaseNote freshness evidence contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "Go ReleaseNote freshness evidence",
  version: expectedVersion,
  verifiedAt: freshnessTimestamp,
  latestPatch,
  latestPatchTokens,
  rootContractCheckers: contractScripts.length,
}, null, 2));
