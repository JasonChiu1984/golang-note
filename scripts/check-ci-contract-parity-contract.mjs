#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
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
    "教材版本：`v1.0.65`",
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "TestCORSAllowedOriginsContract",
  ],
  "production-api-worker/README.md": [
    "CI Contract Parity Gate",
    "make ci-contract-parity-check",
    "TestCORSAllowedOriginsContract",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.65",
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "TestCORSAllowedOriginsContract",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.65",
    "CI contract parity gate",
    "TestCORSAllowedOriginsContract",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
  ],
  "chapters/09-build-and-deploy.md": [
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "make ci-contract",
  ],
  "chapters/11-advanced-testing.md": [
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "TestCORSAllowedOriginsContract",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "CI contract parity gate",
    "node scripts/check-ci-contract-parity-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "ci-contract-parity-check",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "TestCORSAllowedOriginsContract",
  ],
  ".github/workflows/ci.yml": [
    "Check CI contract parity contract",
    "node scripts/check-ci-contract-parity-contract.mjs",
    "TestCORSAllowedOriginsContract",
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

const makefile = existsSync("production-api-worker/Makefile")
  ? readFileSync("production-api-worker/Makefile", "utf8")
  : "";
const workflow = existsSync(".github/workflows/ci.yml")
  ? readFileSync(".github/workflows/ci.yml", "utf8")
  : "";

const makefileCiContract = /ci-contract:[\s\S]*go test \.\/internal\/api -run '([^']+)' -count=1/.exec(makefile)?.[1] ?? "";
const workflowCiContract = /Run contract tests[\s\S]*go test \.\/internal\/api -run '([^']+)' -count=1/.exec(workflow)?.[1] ?? "";

for (const term of [
  "TestCORSAllowedOriginsContract",
  "TestRequestBodyLimitContract",
  "TestRequestTimeoutContract",
  "TestRateLimitContract",
]) {
  if (!makefileCiContract.includes(term)) {
    missing.push(`production-api-worker/Makefile ci-contract missing test selector: ${term}`);
  }
  if (!workflowCiContract.includes(term)) {
    missing.push(`.github/workflows/ci.yml production contract missing test selector: ${term}`);
  }
}

if (makefileCiContract !== workflowCiContract) {
  missing.push("production-api-worker/Makefile ci-contract API selector does not match .github/workflows/ci.yml");
}

if (missing.length > 0) {
  console.error("ci contract parity check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "ci contract parity",
}, null, 2));
