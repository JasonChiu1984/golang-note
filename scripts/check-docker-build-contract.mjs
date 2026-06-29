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
  dockerfile: "production-api-worker/Dockerfile",
  makefile: "production-api-worker/Makefile",
  workflow: ".github/workflows/ci.yml",
  productionWorkflow: "production-api-worker/.github/workflows/production-api-worker.yml",
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

const dockerBuildTerms = [
  "Docker build contract",
  "Dockerfile",
  "CGO_ENABLED=0",
  "api-worker",
  "migrate",
  "distroless/static-debian12",
  "docker build -t production-api-worker:ci ./production-api-worker",
  "docker build -t production-api-worker:standalone .",
];

requireTerms(files.readme, [
  "教材版本：`v1.0.74`",
  "Docker build contract gate",
  "node scripts/check-docker-build-contract.mjs",
  "43 個 root contract checker",
  ...dockerBuildTerms,
]);

requireTerms(files.productionReadme, [
  "Docker Build Contract",
  "make docker-build-check",
  "node scripts/check-docker-build-contract.mjs",
  ...dockerBuildTerms,
]);

requireTerms(files.apiContract, [
  "版本：v1.0.74",
  "Docker build contract",
  "node scripts/check-docker-build-contract.mjs",
  ...dockerBuildTerms,
]);

requireTerms(files.openapi, [
  "version: v1.0.74",
  "Docker build contract",
  "check-docker-build-contract.mjs",
  "distroless/static-debian12",
  "docker build -t production-api-worker:ci ./production-api-worker",
]);

for (const file of [files.chapter07, files.chapter09, files.chapter11, files.cheatsheet]) {
  requireTerms(file, [
    "Docker build contract",
    "node scripts/check-docker-build-contract.mjs",
    "make docker-build-check",
  ]);
}

requireTerms(files.visualCourse, [
  "Docker build contract",
  "node scripts/check-docker-build-contract.mjs",
  "make docker-build-check",
  "distroless/static-debian12",
]);

requireTerms(files.dockerfile, [
  "FROM golang:1.22 AS build",
  "CGO_ENABLED=0 go build -o /out/api-worker ./cmd/api-worker",
  "CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate",
  "FROM gcr.io/distroless/static-debian12",
  "COPY --from=build /out/api-worker /app/api-worker",
  "COPY --from=build /out/migrate /app/migrate",
  "COPY migrations /app/migrations",
  "ENTRYPOINT [\"/app/api-worker\"]",
]);

requireTerms(files.makefile, [
  "docker-build-check",
  "node scripts/check-docker-build-contract.mjs",
  "docker build -t production-api-worker:local .",
]);

requireTerms(files.workflow, [
  "Check Docker build contract",
  "node scripts/check-docker-build-contract.mjs",
  "docker build -t production-api-worker:ci ./production-api-worker",
]);

requireTerms(files.productionWorkflow, [
  "docker build -t production-api-worker:standalone .",
  "docker compose up -d --build",
  "./scripts/compose-smoke.sh",
]);

if (missing.length > 0) {
  console.error("docker build contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "docker build",
  checkedFiles: Object.keys(files).length,
}, null, 2));
