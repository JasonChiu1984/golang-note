#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/.github/workflows/production-api-worker.yml",
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
    "教材版本：`v1.0.67`",
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
    "production-api-worker/.github/workflows/production-api-worker.yml",
  ],
  "production-api-worker/README.md": [
    "Production Workflow Contract",
    "make production-workflow-check",
    "production-api-worker/.github/workflows/production-api-worker.yml",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.67",
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
    "production-api-worker/.github/workflows/production-api-worker.yml",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.67",
    "Production workflow contract gate",
    "production-api-worker/.github/workflows/production-api-worker.yml",
  ],
  "production-api-worker/.github/workflows/production-api-worker.yml": [
    "production-api-worker/**",
    "go-version-file: production-api-worker/go.mod",
    "go mod download",
    "go mod verify",
    "make ci-contract",
    "go test -race -cover ./... -count=1",
    "go build ./cmd/api-worker",
    "go build ./cmd/migrate",
    "go install golang.org/x/vuln/cmd/govulncheck@latest",
    "govulncheck ./...",
    "docker build -t production-api-worker:standalone .",
    "docker compose up -d --build",
    "./scripts/compose-smoke.sh",
    "docker compose logs --no-color",
    "docker compose down -v",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Production workflow contract gate",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "production-workflow-check",
    "node scripts/check-production-workflow-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check production workflow contract",
    "node scripts/check-production-workflow-contract.mjs",
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

const workflow = existsSync("production-api-worker/.github/workflows/production-api-worker.yml")
  ? readFileSync("production-api-worker/.github/workflows/production-api-worker.yml", "utf8")
  : "";

const workflowChecks = [
  [/paths:\n[\s\S]*production-api-worker\/\*\*/, "path trigger"],
  [/working-directory: production-api-worker/, "production working directory"],
  [/go mod download[\s\S]*go mod verify/, "dependency verification"],
  [/make ci-contract/, "production contract bundle"],
  [/go test -race -cover \.\/\.\.\. -count=1/, "race coverage"],
  [/govulncheck \.\/\.\.\./, "vulnerability scan"],
  [/docker build -t production-api-worker:standalone \./, "docker build"],
  [/docker compose up -d --build[\s\S]*\.\/scripts\/compose-smoke\.sh/, "compose smoke"],
  [/if: failure\(\)[\s\S]*docker compose logs --no-color/, "failure logs"],
  [/if: always\(\)[\s\S]*docker compose down -v/, "compose cleanup"],
];

for (const [pattern, label] of workflowChecks) {
  if (!pattern.test(workflow)) {
    missing.push(`production-api-worker/.github/workflows/production-api-worker.yml missing workflow shape: ${label}`);
  }
}

if (missing.length > 0) {
  console.error("production workflow contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "production workflow",
  files: files.length,
}, null, 2));
