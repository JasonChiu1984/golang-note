#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

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
  "production-api-worker/.github/workflows/production-api-worker.yml",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.94`",
    "Dependency governance contract gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "go mod tidy",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "production-api-worker/README.md": [
    "Dependency Governance Contract",
    "make dependency-governance-check",
    "go mod tidy",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.94",
    "Dependency governance contract gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.94",
    "Dependency governance contract gate",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Dependency governance static gate",
    "node scripts/check-dependency-governance-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Dependency governance static gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "chapters/11-advanced-testing.md": [
    "Dependency governance static gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "lookup proxy.golang.org: no such host",
    "govulncheck",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Dependency governance static gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "go mod tidy",
    "go mod verify",
    "go list -m -u all",
    "govulncheck ./...",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Dependency governance contract gate",
    "node scripts/check-dependency-governance-contract.mjs",
    "go list -m -u all",
    "govulncheck",
  ],
  "production-api-worker/Makefile": [
    "dependency-governance-check",
    "node scripts/check-dependency-governance-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check dependency governance contract",
    "node scripts/check-dependency-governance-contract.mjs",
    "vulnerability-scan",
    "govulncheck ./...",
  ],
  "production-api-worker/.github/workflows/production-api-worker.yml": [
    "go mod download",
    "go mod verify",
    "go install golang.org/x/vuln/cmd/govulncheck@latest",
    "govulncheck ./...",
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

const rootWorkflow = existsSync(".github/workflows/ci.yml")
  ? readFileSync(".github/workflows/ci.yml", "utf8")
  : "";
const standaloneWorkflow = existsSync("production-api-worker/.github/workflows/production-api-worker.yml")
  ? readFileSync("production-api-worker/.github/workflows/production-api-worker.yml", "utf8")
  : "";

const workflowChecks = [
  [rootWorkflow, /Verify module checksum[\s\S]*go mod verify/, "root go mod verify"],
  [rootWorkflow, /vulnerability-scan:[\s\S]*Scan root module[\s\S]*govulncheck \.\/\.\.\./, "root govulncheck"],
  [rootWorkflow, /vulnerability-scan:[\s\S]*Scan production-api-worker module[\s\S]*govulncheck \.\/\.\.\./, "production govulncheck"],
  [standaloneWorkflow, /Download dependencies[\s\S]*go mod download[\s\S]*Verify module checksum[\s\S]*go mod verify/, "standalone dependency verify"],
  [standaloneWorkflow, /Install govulncheck[\s\S]*govulncheck@latest[\s\S]*Scan production module[\s\S]*govulncheck \.\/\.\.\./, "standalone vulnerability scan"],
];

for (const [text, pattern, label] of workflowChecks) {
  if (!pattern.test(text)) {
    missing.push(`workflow missing dependency governance shape: ${label}`);
  }
}

if (missing.length > 0) {
  console.error("dependency governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "dependency governance",
}, null, 2));
