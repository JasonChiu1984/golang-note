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
  "production-api-worker/docs/operational-runbook.md",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Pprof diagnostics contract",
    "node scripts/check-pprof-contract.mjs",
    "ENABLE_PPROF",
    "PPROF_TOKEN",
  ],
  "production-api-worker/README.md": [
    "Diagnostics / pprof contract",
    "ENABLE_PPROF",
    "PPROF_TOKEN",
    "TestPprofDiagnosticsContract",
  ],
  "production-api-worker/internal/config/config.go": [
    "PprofEnabled",
    "PprofToken",
    "ENABLE_PPROF requires PPROF_TOKEN or API_KEY",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "pprof enabled without token",
    "pprof flag is not boolean",
  ],
  "production-api-worker/internal/api/handler.go": [
    "net/http/pprof",
    "WithPprof",
    "/debug/pprof/",
    "isPprofPath",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestPprofDiagnosticsContract",
    "Types of profiles available",
  ],
  "production-api-worker/docker-compose.yml": [
    "ENABLE_PPROF",
    "PPROF_TOKEN",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "pprof diagnostics",
    "ENABLE_PPROF=true",
    "Authorization: Bearer",
  ],
  ".github/workflows/ci.yml": [
    "Check pprof diagnostics contract",
    "node scripts/check-pprof-contract.mjs",
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
  console.error("pprof contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "pprof diagnostics",
}, null, 2));
