#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const files = [
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
  "scripts/fix-docs-index-links.mjs",
  "scripts/check-html-home-links.mjs",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.78`",
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
    "node scripts/fix-docs-index-links.mjs --check",
    "node scripts/check-html-home-links.mjs",
  ],
  "production-api-worker/README.md": [
    "Docs Publishing Contract",
    "make docs-publishing-check",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.78",
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
    "fix-docs-index-links.mjs --check",
    "check-html-home-links.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.78",
    "Docs publishing contract gate",
    "check-docs-publishing-contract.mjs",
    "all 46 root contract checker scripts",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  "docs/index.html": [
    "Docs publishing contract gate",
    "node scripts/check-docs-publishing-contract.mjs",
    "ReleaseNote/index.html",
    "主頁教程",
  ],
  "scripts/fix-docs-index-links.mjs": [
    "forbidden docs/index link pattern remains",
    "docs/index has missing local targets",
  ],
  "scripts/check-html-home-links.mjs": [
    "HTML pages missing a link back to docs/index.html",
    "home link check passed",
  ],
  "production-api-worker/Makefile": [
    "docs-publishing-check",
    "node scripts/check-docs-publishing-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check docs publishing contract",
    "node scripts/check-docs-publishing-contract.mjs",
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

const docsIndex = existsSync("docs/index.html") ? readFileSync("docs/index.html", "utf8") : "";
for (const forbidden of [
  'href="../docs/',
  'href="../ReleaseNote/',
  'href="../examples/',
  'href="../production-api-worker/',
  'href="/docs/',
  'href="/ReleaseNote/',
  'data-src="../',
]) {
  if (docsIndex.includes(forbidden)) {
    missing.push(`docs/index.html contains forbidden publishing path: ${forbidden}`);
  }
}

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();
if (contractScripts.length !== 46) {
  missing.push(`expected 46 root contract checker scripts, found ${contractScripts.length}`);
}

if (missing.length > 0) {
  console.error("docs publishing contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

execFileSync("node", ["scripts/fix-docs-index-links.mjs", "--check"], { stdio: "inherit" });
execFileSync("node", ["scripts/check-html-home-links.mjs"], { stdio: "inherit" });

console.log(JSON.stringify({
  status: "ok",
  contract: "docs publishing",
  rootContractCheckers: contractScripts.length,
  files: files.length,
}, null, 2));
