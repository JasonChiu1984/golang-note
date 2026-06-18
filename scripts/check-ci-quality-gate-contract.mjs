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
];

const required = {
  "README.md": [
    "教材版本：`v1.0.63`",
    "CI quality gate contract",
    "node scripts/check-ci-quality-gate-contract.mjs",
    "go mod verify",
    "go test -race -cover",
    "govulncheck ./...",
  ],
  "production-api-worker/README.md": [
    "CI Quality Gate Contract",
    "make ci-quality-gate-check",
    "go test -race -cover",
    "govulncheck ./...",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.63",
    "CI quality gate contract",
    "node scripts/check-ci-quality-gate-contract.mjs",
    "go mod verify",
    "govulncheck ./...",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.63",
    "CI quality gate contract",
    "go mod verify",
    "go test -race -cover",
    "govulncheck ./...",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "CI quality gate static gate",
    "node scripts/check-ci-quality-gate-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "CI quality gate static gate",
    "node scripts/check-ci-quality-gate-contract.mjs",
    "go mod verify",
    "govulncheck ./...",
  ],
  "chapters/11-advanced-testing.md": [
    "CI quality gate static gate",
    "node scripts/check-ci-quality-gate-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "CI quality gate static gate",
    "node scripts/check-ci-quality-gate-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "CI quality gate contract",
    "node scripts/check-ci-quality-gate-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "ci-quality-gate-check",
    "node scripts/check-ci-quality-gate-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check CI quality gate contract",
    "node scripts/check-ci-quality-gate-contract.mjs",
    "go mod verify",
    "go test -race -cover ./... -count=1",
    "govulncheck ./...",
    "docker build -t production-api-worker:ci ./production-api-worker",
    "docker compose up -d --build",
    "./scripts/compose-smoke.sh",
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

const workflow = existsSync(".github/workflows/ci.yml")
  ? readFileSync(".github/workflows/ci.yml", "utf8")
  : "";

const workflowChecks = [
  [/jobs:\n[\s\S]*root-course:/, "root-course job"],
  [/production-contract:[\s\S]*go test -race -cover \.\/\.\.\. -count=1/, "production race coverage"],
  [/vulnerability-scan:[\s\S]*govulncheck \.\/\.\.\./, "vulnerability scan"],
  [/docker-build:[\s\S]*docker build -t production-api-worker:ci \.\/production-api-worker/, "docker build"],
  [/docker-build:[\s\S]*\.\/scripts\/compose-smoke\.sh/, "compose smoke"],
];

for (const [pattern, label] of workflowChecks) {
  if (!pattern.test(workflow)) {
    missing.push(`.github/workflows/ci.yml missing workflow shape: ${label}`);
  }
}

if (missing.length > 0) {
  console.error("ci quality gate contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "ci quality gate",
}, null, 2));
