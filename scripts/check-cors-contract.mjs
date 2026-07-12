#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/docker-compose.yml",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "CORS allowlist contract",
    "CORS_ALLOWED_ORIGINS",
    "node scripts/check-cors-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "CORS Allowlist Contract",
    "CORS_ALLOWED_ORIGINS",
    "TestCORSAllowedOriginsContract",
  ],
  "production-api-worker/internal/config/config.go": [
    "CORSAllowedOrigins",
    "CORS_ALLOWED_ORIGINS",
    "parseOrigins",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "CORSAllowedOrigins",
    "cors origin is not http or https",
    "cors origin contains path",
    "cors origin contains user info",
    "cors origin contains empty query marker",
  ],
  "production-api-worker/internal/api/handler.go": [
    "WithCORSAllowedOrigins",
    "corsMiddleware",
    "Access-Control-Allow-Origin",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestCORSAllowedOriginsContract",
    "http.StatusNoContent",
    "http.StatusForbidden",
  ],
  "production-api-worker/docker-compose.yml": [
    "CORS_ALLOWED_ORIGINS",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.87",
    "CORS allowlist",
    "CORS_ALLOWED_ORIGINS",
  ],
  "production-api-worker/docs/api-contract.md": [
    "CORS allowlist",
    "CORS_ALLOWED_ORIGINS",
    "Access-Control-Allow-Origin",
  ],
  ".github/workflows/ci.yml": [
    "Check CORS contract",
    "node scripts/check-cors-contract.mjs",
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
  console.error("cors contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "cors allowlist",
}, null, 2));
