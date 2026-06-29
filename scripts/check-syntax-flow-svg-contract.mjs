#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "docs/golang-syntax-application-svg.html",
  "圖解筆記3-4整合/golang-syntax-application-svg.html",
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
    "教材版本：`v1.0.73`",
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
    "node scripts/check-syntax-flow-svg.mjs",
  ],
  "production-api-worker/README.md": [
    "Syntax Flow SVG Contract",
    "make syntax-flow-svg-check",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.73",
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.73",
    "Syntax flow SVG contract gate",
    "check-syntax-flow-svg-contract.mjs",
  ],
  "docs/golang-syntax-application-svg.html": [
    "標準程式流程圖符號",
    "aria-labelledby",
    "drawFlowNode",
  ],
  "圖解筆記3-4整合/golang-syntax-application-svg.html": [
    "標準程式流程圖符號",
    "aria-labelledby",
    "drawFlowNode",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Syntax flow SVG contract gate",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "syntax-flow-svg-check",
    "node scripts/check-syntax-flow-svg-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check syntax flow SVG contract",
    "node scripts/check-syntax-flow-svg-contract.mjs",
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

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();
if (contractScripts.length !== 42) {
  missing.push(`expected 42 root contract checker scripts, found ${contractScripts.length}`);
}

if (missing.length > 0) {
  console.error("syntax flow SVG contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

execFileSync("node", ["scripts/check-syntax-flow-svg.mjs"], { stdio: "inherit" });

console.log(JSON.stringify({
  status: "ok",
  contract: "syntax flow SVG",
  rootContractCheckers: contractScripts.length,
  files: files.length,
}, null, 2));
