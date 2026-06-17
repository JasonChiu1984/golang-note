#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/scripts/compose-smoke.sh",
  "production-api-worker/docker-compose.yml",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/docs/operational-runbook.md",
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
    "教材版本：`v1.0.62`",
    "Compose smoke contract gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Compose Smoke Contract",
    "make compose-smoke-check",
    "scripts/compose-smoke.sh",
  ],
  "production-api-worker/scripts/compose-smoke.sh": [
    "wait_for_ready",
    "$base_url/readyz",
    "$base_url/livez",
    "$base_url/jobs",
    "$base_url/metrics",
    "api_requests_total",
    "Authorization: Bearer $api_key",
  ],
  "production-api-worker/docker-compose.yml": [
    "api-worker",
    "postgres",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.62",
    "Compose smoke contract",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "Compose smoke",
    "make compose-smoke",
    "docker compose logs --no-color",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.62",
    "Compose smoke contract",
    "POST /jobs",
    "GET /jobs/{id}",
    "/metrics",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Compose smoke static gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Compose smoke static gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Compose smoke static gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Compose smoke static gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Compose smoke contract gate",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "compose-smoke-check",
    "node scripts/check-compose-smoke-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check Compose smoke contract",
    "node scripts/check-compose-smoke-contract.mjs",
    "docker compose up -d --build",
    "./scripts/compose-smoke.sh",
    "docker compose logs --no-color",
    "docker compose down -v",
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

if (missing.length > 0) {
  console.error("compose smoke contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "compose smoke",
}, null, 2));
