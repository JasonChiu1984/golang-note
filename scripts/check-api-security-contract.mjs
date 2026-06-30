#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  ".github/workflows/ci.yml",
  "production-api-worker/Makefile",
];

const required = {
  "README.md": [
    "API security contract",
    "node scripts/check-api-security-contract.mjs",
    "TestAPIKeyAuthContract",
    "TestSecurityHeadersContract",
  ],
  "production-api-worker/README.md": [
    "API Security Contract",
    "make api-security-check",
    "TestAPIKeyAuthContract",
    "TestSecurityHeadersContract",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.75",
    "API security uses optional API_KEY",
    "bearerAuth:",
    "Required only when API_KEY is configured",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.75",
    "API security gate",
    "node scripts/check-api-security-contract.mjs",
    "TestAPIKeyAuthContract",
    "TestSecurityHeadersContract",
  ],
  "production-api-worker/internal/api/handler.go": [
    "authMiddleware",
    "securityHeadersMiddleware",
    'w.Header().Set("X-Content-Type-Options", "nosniff")',
    'w.Header().Set("X-Frame-Options", "DENY")',
    'w.Header().Set("Referrer-Policy", "no-referrer")',
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestAPIKeyAuthContract",
    "TestSecurityHeadersContract",
    "protected post without token",
    "protected metrics without token",
    "health stays public",
    "protected post with token",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "API security contract gate",
    "node scripts/check-api-security-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "API security contract gate",
    "node scripts/check-api-security-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "API security contract gate",
    "node scripts/check-api-security-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "API security contract",
    "node scripts/check-api-security-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check API security contract",
    "node scripts/check-api-security-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "api-security-check",
    "check-api-security-contract.mjs",
  ],
};

const missing = [];

function read(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

for (const file of files) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    continue;
  }
  const text = read(file);
  for (const term of required[file]) {
    if (!text.includes(term)) {
      missing.push(`${file} missing term: ${term}`);
    }
  }
}

const handler = read("production-api-worker/internal/api/handler.go");
if (!/func \(h \*Handler\) authMiddleware[\s\S]*Authorization[\s\S]*func requiresAuth/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go auth middleware does not wire Authorization before requiresAuth");
}
if (!/func requiresAuth\(path string\) bool[\s\S]*path == "\/metrics"[\s\S]*path == "\/jobs" \|\| strings\.HasPrefix\(path, "\/jobs\/"\)[\s\S]*return false/.test(handler)) {
  missing.push("production-api-worker/internal/api/handler.go requiresAuth must protect metrics/jobs and leave other paths, including health probes, public");
}

const tests = read("production-api-worker/internal/api/handler_test.go");
if (!/TestAPIKeyAuthContract[\s\S]*protected post without token[\s\S]*protected metrics without token[\s\S]*health stays public[\s\S]*protected post with token/.test(tests)) {
  missing.push("production-api-worker/internal/api/handler_test.go does not cover API key protected/public endpoint matrix");
}

const openapi = read("production-api-worker/api/openapi.yaml");
if (!/\/livez:[\s\S]*security: \[\]/.test(openapi) || !/\/readyz:[\s\S]*security: \[\]/.test(openapi)) {
  missing.push("production-api-worker/api/openapi.yaml must keep liveness/readiness security empty");
}
if (!/\/metrics:[\s\S]*security:\n\s+- bearerAuth:\s*\[\][\s\S]*- \{\}/.test(openapi)) {
  missing.push("production-api-worker/api/openapi.yaml must document optional bearer auth for metrics");
}

if (missing.length > 0) {
  console.error("api security contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "api security",
}, null, 2));
