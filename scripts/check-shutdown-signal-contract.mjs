#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/cmd/api-worker/main.go",
  "production-api-worker/cmd/api-worker/main_test.go",
  "production-api-worker/docs/api-contract.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Shutdown signal contract",
    "SIGINT/SIGTERM",
    "node scripts/check-shutdown-signal-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Shutdown Signal Contract",
    "SIGINT",
    "SIGTERM",
    "TestMonitoredSignalsContract",
  ],
  "production-api-worker/cmd/api-worker/main.go": [
    "signal.NotifyContext(context.Background(), monitoredSignals()...)",
    "syscall.SIGTERM",
    "func monitoredSignals() []os.Signal",
  ],
  "production-api-worker/cmd/api-worker/main_test.go": [
    "TestMonitoredSignalsContract",
    "os.Interrupt",
    "syscall.SIGTERM",
  ],
  "production-api-worker/docs/api-contract.md": [
    "Shutdown signal",
    "SIGINT",
    "SIGTERM",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Shutdown signal contract",
    "SIGTERM",
  ],
  "chapters/11-advanced-testing.md": [
    "Shutdown signal",
    "TestMonitoredSignalsContract",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Shutdown signal",
    "SIGINT/SIGTERM",
  ],
  ".github/workflows/ci.yml": [
    "Check shutdown signal contract",
    "node scripts/check-shutdown-signal-contract.mjs",
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
  console.error("shutdown signal contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "shutdown signal",
}, null, 2));
