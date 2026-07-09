#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .map((file) => `scripts/${file}`)
  .sort();

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
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.84`",
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
    "50 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Contract Gate Inventory",
    "make contract-gate-inventory-check",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.84",
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
    "50 個 root contract checker",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.84",
    "Contract gate inventory",
    "check-contract-gate-inventory-contract.mjs",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Contract gate inventory",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "contract-gate-inventory-check",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check contract gate inventory contract",
    "node scripts/check-contract-gate-inventory-contract.mjs",
  ],
};

const missing = [];

if (contractScripts.length !== 50) {
  missing.push(`expected 50 root contract checker scripts, found ${contractScripts.length}`);
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
  if (!workflow.includes(`node ${script}`)) {
    missing.push(`.github/workflows/ci.yml missing contract checker call: node ${script}`);
  }
}

if (missing.length > 0) {
  console.error("contract gate inventory check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "contract gate inventory",
  scripts: contractScripts.length,
  files: files.length,
}, null, 2));
