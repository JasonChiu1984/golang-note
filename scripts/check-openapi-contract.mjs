#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const specPath = "production-api-worker/api/openapi.yaml";
const readmePath = "README.md";
const productionReadmePath = "production-api-worker/README.md";
const apiContractPath = "production-api-worker/docs/api-contract.md";
const ciPath = ".github/workflows/ci.yml";

const requiredFiles = [
  specPath,
  readmePath,
  productionReadmePath,
  apiContractPath,
  ciPath,
];

const specTerms = [
  "openapi: 3.1.0",
  "title: production-api-worker API",
  "version: v1.0.61",
  "API security uses optional API_KEY",
  "Worker failure handling keeps failed jobs visible through worker_jobs_total",
  "Retry cancellation keeps deadlock retry backoff bound to request or shutdown context",
  "CORS allowlist",
  "CORS_ALLOWED_ORIGINS",
  "REQUEST_BODY_LIMIT_BYTES",
  "PayloadTooLarge",
  "/jobs:",
  "post:",
  "/jobs/{id}:",
  "get:",
  "/livez:",
  "/readyz:",
  "/metrics:",
  "bearerAuth:",
  "X-Request-ID",
  "additionalProperties: false",
  "invalid_input",
  "not_found",
  "queue_full",
  "request_timeout",
  "rate_limited",
  "unauthorized",
  "internal_error",
  "pending",
  "processing",
  "done",
  "failed",
];

const docTerms = [
  "production-api-worker/api/openapi.yaml",
  "node scripts/check-openapi-contract.mjs",
  "OpenAPI contract",
];

const missing = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
  }
}

function read(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function requireTerms(file, terms) {
  const text = read(file);
  for (const term of terms) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

requireTerms(specPath, specTerms);
requireTerms(readmePath, docTerms);
requireTerms(productionReadmePath, docTerms);
requireTerms(apiContractPath, ["OpenAPI", "production-api-worker/api/openapi.yaml"]);
requireTerms(ciPath, ["Check OpenAPI contract", "node scripts/check-openapi-contract.mjs"]);

const spec = read(specPath);
const routePatterns = [
  [/^  \/jobs:\n    post:/m, "POST /jobs"],
  [/^  \/jobs\/\{id\}:\n    get:/m, "GET /jobs/{id}"],
  [/^  \/livez:\n    get:/m, "GET /livez"],
  [/^  \/readyz:\n    get:/m, "GET /readyz"],
  [/^  \/metrics:\n    get:/m, "GET /metrics"],
];

for (const [pattern, label] of routePatterns) {
  if (!pattern.test(spec)) {
    missing.push(`${specPath} missing route shape: ${label}`);
  }
}

const responseCodes = ["202", "200", "400", "401", "404", "429", "503", "504", "500"];
for (const code of responseCodes) {
  if (!spec.includes(`"${code}":`)) {
    missing.push(`${specPath} missing response code: ${code}`);
  }
}

if (!/JobInput:[\s\S]*required:\n\s+- name/.test(spec)) {
  missing.push(`${specPath} missing JobInput required name`);
}

if (!/JobStatus:[\s\S]*enum:\n\s+- pending\n\s+- processing\n\s+- done\n\s+- failed/.test(spec)) {
  missing.push(`${specPath} missing JobStatus enum`);
}

if (missing.length > 0) {
  console.error("openapi contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  spec: specPath,
  routes: routePatterns.length,
  responseCodes: responseCodes.length,
}, null, 2));
