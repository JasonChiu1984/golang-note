#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter07: "chapters/07-large-project-concurrent-crawler.md",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  compose: "production-api-worker/docker-compose.yml",
  makefile: "production-api-worker/Makefile",
  workflow: ".github/workflows/ci.yml",
};

const missing = [];

for (const file of Object.values(files)) {
  if (!existsSync(file)) missing.push(`missing file: ${file}`);
}

function requireTerms(file, terms) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

const composeRuntimeTerms = [
  "Compose runtime env contract",
  "docker-compose.yml",
  "DATABASE_URL",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "API_KEY",
  "REQUEST_BODY_LIMIT_BYTES",
  "TRUSTED_PROXY_CIDRS",
  "CORS_ALLOWED_ORIGINS",
  "monitoring",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.92`",
  "Compose runtime env contract gate",
  "node scripts/check-compose-runtime-env-contract.mjs",
  "56 個 root contract checker",
  ...composeRuntimeTerms,
]);

requireTerms(files.productionReadme, [
  "Compose Runtime Env Contract",
  "make compose-runtime-env-check",
  "node scripts/check-compose-runtime-env-contract.mjs",
  ...composeRuntimeTerms,
]);

requireTerms(files.apiContract, [
  "版本：v1.0.92",
  "Compose runtime env contract",
  "node scripts/check-compose-runtime-env-contract.mjs",
  "56 個 root contract checker",
  ...composeRuntimeTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.92",
  "Compose runtime env contract",
  "check-compose-runtime-env-contract.mjs",
  "DATABASE_URL",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "REQUEST_BODY_LIMIT_BYTES",
  "TRUSTED_PROXY_CIDRS",
  "CORS_ALLOWED_ORIGINS",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter11, files.cheatsheet]) {
  requireTerms(file, [
    "Compose runtime env contract",
    "node scripts/check-compose-runtime-env-contract.mjs",
    "make compose-runtime-env-check",
  ]);
}

requireTerms(files.visualCourse, [
  "Compose runtime env contract",
  "node scripts/check-compose-runtime-env-contract.mjs",
  "make compose-runtime-env-check",
]);

requireTerms(files.compose, [
  "postgres:",
  "image: postgres:16",
  "condition: service_healthy",
  "otel-collector:",
  "OTEL_EXPORTER_OTLP_ENDPOINT: otel-collector:4317",
  "DATABASE_URL: postgres://app:app@postgres:5432/app?sslmode=disable",
  "QUEUE_SIZE: \"64\"",
  "WORKERS: \"4\"",
  "API_KEY: ${API_KEY:-}",
  "ENABLE_PPROF: ${ENABLE_PPROF:-false}",
  "PPROF_TOKEN: ${PPROF_TOKEN:-}",
  "RATE_LIMIT_REQUESTS_PER_MINUTE: ${RATE_LIMIT_REQUESTS_PER_MINUTE:-120}",
  "REQUEST_BODY_LIMIT_BYTES: ${REQUEST_BODY_LIMIT_BYTES:-1048576}",
  "TRUSTED_PROXY_CIDRS: ${TRUSTED_PROXY_CIDRS:-}",
  "CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-}",
  "condition: service_completed_successfully",
  "condition: service_started",
  "prometheus:",
  "profiles:",
  "- monitoring",
]);

requireTerms(files.makefile, [
  "compose-runtime-env-check",
  "node scripts/check-compose-runtime-env-contract.mjs",
]);

requireTerms(files.workflow, [
  "Check Compose runtime env contract",
  "node scripts/check-compose-runtime-env-contract.mjs",
]);

if (missing.length > 0) {
  console.error("compose runtime env contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "compose runtime env",
  checkedFiles: Object.keys(files).length,
}, null, 2));
