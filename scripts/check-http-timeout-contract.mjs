#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/cmd/api-worker/main.go",
  "production-api-worker/cmd/api-worker/main_test.go",
  "production-api-worker/docs/api-contract.md",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "HTTP server timeout contract",
    "HTTP_READ_HEADER_TIMEOUT",
    "node scripts/check-http-timeout-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "HTTP Server Timeout Contract",
    "HTTP_READ_HEADER_TIMEOUT",
    "TestHTTPServerTimeoutContract",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultHTTPReadHeaderTimeout",
    "HTTPReadTimeout",
    "QUEUE_DRAIN_TIMEOUT",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "HTTP_READ_HEADER_TIMEOUT",
    "HTTP_SHUTDOWN_TIMEOUT",
    "QUEUE_DRAIN_TIMEOUT",
  ],
  "production-api-worker/cmd/api-worker/main.go": [
    "serverTimeouts",
    "ReadHeaderTimeout",
    "WriteTimeout",
    "IdleTimeout",
  ],
  "production-api-worker/cmd/api-worker/main_test.go": [
    "TestHTTPServerTimeoutContract",
    "HTTPReadHeaderTimeout",
    "QueueDrainTimeout",
  ],
  "production-api-worker/docs/api-contract.md": [
    "HTTP Server Timeout",
    "HTTP_READ_HEADER_TIMEOUT",
    "QUEUE_DRAIN_TIMEOUT",
  ],
  ".github/workflows/ci.yml": [
    "Check HTTP timeout contract",
    "node scripts/check-http-timeout-contract.mjs",
    "TestHTTPServerTimeoutContract",
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
  console.error("http timeout contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "http server timeout",
}, null, 2));
