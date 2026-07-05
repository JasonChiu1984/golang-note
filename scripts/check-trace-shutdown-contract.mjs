#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/internal/observability/observability.go",
  "production-api-worker/internal/observability/observability_test.go",
  "production-api-worker/cmd/api-worker/main.go",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/09-build-and-deploy.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
];

const required = {
  "README.md": [
    "教材版本：`v1.0.80`",
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
    "TestTraceShutdownContract",
  ],
  "production-api-worker/README.md": [
    "Trace Shutdown Contract",
    "make trace-shutdown-check",
    "TestTraceShutdownContract",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.80",
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.80",
    "Trace shutdown contract",
    "check-trace-shutdown-contract.mjs",
  ],
  "production-api-worker/internal/observability/observability.go": [
    "func (o *Observability) Shutdown(ctx context.Context) error",
    "context.WithTimeout(ctx, 3*time.Second)",
    "return o.shutdown(shutdownCtx)",
  ],
  "production-api-worker/internal/observability/observability_test.go": [
    "TestTraceShutdownContract",
    "shutdown context has no deadline",
    "bounded by 3s",
  ],
  "production-api-worker/cmd/api-worker/main.go": [
    "defer obs.Shutdown(context.Background())",
  ],
  "production-api-worker/Makefile": [
    "trace-shutdown-check",
    "check-trace-shutdown-contract.mjs",
    "TestTraceShutdownContract",
  ],
  ".github/workflows/ci.yml": [
    "Check trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
    "TestTraceShutdownContract",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Trace shutdown contract",
    "node scripts/check-trace-shutdown-contract.mjs",
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

const observability = read("production-api-worker/internal/observability/observability.go");
if (!/func \(o \*Observability\) Shutdown\(ctx context\.Context\) error \{[\s\S]*context\.WithTimeout\(ctx, 3\*time\.Second\)[\s\S]*defer cancel\(\)[\s\S]*return o\.shutdown\(shutdownCtx\)/.test(observability)) {
  missing.push("production-api-worker/internal/observability/observability.go must bound trace provider shutdown by 3 seconds");
}

const workflow = read(".github/workflows/ci.yml");
if (!/go test \.\/internal\/observability -run 'TestTraceShutdownContract' -count=1/.test(workflow)) {
  missing.push(".github/workflows/ci.yml production contract job must run TestTraceShutdownContract");
}

if (missing.length > 0) {
  console.error("trace shutdown contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "trace shutdown",
}, null, 2));
