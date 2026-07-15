#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const releaseMinors = Array.from({ length: 26 }, (_, index) => index + 1);
const rootPages = [
  "ReleaseNote/index.html",
  ...releaseMinors.map((minor) => `ReleaseNote/go1.${minor}-release-note.html`),
];
const docsPages = [
  "docs/ReleaseNote/index.html",
  ...releaseMinors.map((minor) => `docs/ReleaseNote/go1.${minor}-release-note.html`),
];

const files = [
  "scripts/generate-go-release-notes.mjs",
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
  ...rootPages,
  ...docsPages,
];

const required = {
  "scripts/generate-go-release-notes.mjs": [
    "const OUT_DIR = path.join(ROOT, \"ReleaseNote\")",
    "Go 1.26.5",
    "go1.26.5",
    "go1.25.12",
    "Patch Revisions",
    "supportStatus",
    "OFFICIAL_HISTORY",
  ],
  "README.md": [
    "教材版本：`v1.0.90`",
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
    "54 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "Go ReleaseNote Contract",
    "make go-release-notes-check",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.90",
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
    "54 個 root contract checker",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.90",
    "Go ReleaseNote contract gate",
    "check-go-release-notes-contract.mjs",
    "all 54 root contract checker scripts",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Go ReleaseNote contract gate",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "go-release-notes-check",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check Go release notes contract",
    "node scripts/check-go-release-notes-contract.mjs",
  ],
  "ReleaseNote/index.html": [
    "Go 1.1-1.26",
    "support-status-chart",
    "Go 1.25",
    "Go 1.26",
    "go1.25-release-note.html",
    "go1.26-release-note.html",
  ],
  "ReleaseNote/go1.25-release-note.html": [
    "go1.25.12",
    "2026-07-07",
    "https://go.dev/doc/go1.25",
    "Patch Revisions",
  ],
  "ReleaseNote/go1.26-release-note.html": [
    "go1.26.5",
    "2026-07-07",
    "https://go.dev/doc/go1.26",
    "Patch Revisions",
  ],
};

const requiredPageSections = [
  "Executive Summary",
  "官方段落覆蓋矩陣",
  "新增功能列表",
  "Patch Revisions",
  "Verification",
  "Troubleshooting",
  "Best Practices",
  "主頁教程",
];

const missing = [];

function normalizePublishedReleaseNote(text) {
  return text
    .replaceAll('href="../docs/index.html"', 'href="../index.html"')
    .replaceAll('href="../index.html"', 'href="../index.html"');
}

for (const file of files) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const term of required[file] ?? []) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

for (const minor of releaseMinors) {
  const rootFile = `ReleaseNote/go1.${minor}-release-note.html`;
  const docsFile = `docs/ReleaseNote/go1.${minor}-release-note.html`;
  if (!existsSync(rootFile) || !existsSync(docsFile)) continue;

  const rootText = readFileSync(rootFile, "utf8");
  for (const term of requiredPageSections) {
    if (!rootText.includes(term)) {
      missing.push(`${rootFile} missing report section: ${term}`);
    }
  }
  if (!rootText.includes(`https://go.dev/doc/go1.${minor}`)) {
    missing.push(`${rootFile} missing official Go release note URL`);
  }

  const rootHash = createHash("sha256").update(normalizePublishedReleaseNote(rootText)).digest("hex");
  const docsHash = createHash("sha256").update(normalizePublishedReleaseNote(readFileSync(docsFile, "utf8"))).digest("hex");
  if (rootHash !== docsHash) {
    missing.push(`${rootFile} differs from ${docsFile}`);
  }
}

const rootHtmlCount = existsSync("ReleaseNote")
  ? readdirSync("ReleaseNote").filter((file) => file.endsWith(".html")).length
  : 0;
const docsHtmlCount = existsSync("docs/ReleaseNote")
  ? readdirSync("docs/ReleaseNote").filter((file) => file.endsWith(".html")).length
  : 0;
if (rootHtmlCount !== 27) missing.push(`expected 27 root ReleaseNote HTML files, found ${rootHtmlCount}`);
if (docsHtmlCount !== 27) missing.push(`expected 27 docs ReleaseNote HTML files, found ${docsHtmlCount}`);

const contractScripts = readdirSync("scripts")
  .filter((file) => /^check-.*-contract\.mjs$/.test(file))
  .sort();
if (contractScripts.length !== 54) {
  missing.push(`expected 54 root contract checker scripts, found ${contractScripts.length}`);
}

if (missing.length > 0) {
  console.error("Go ReleaseNote contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "Go ReleaseNote generated reports",
  releaseNotes: rootHtmlCount,
  docsReleaseNotes: docsHtmlCount,
  rootContractCheckers: contractScripts.length,
}, null, 2));
