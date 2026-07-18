#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/docs/operational-runbook.md",
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
    "教材版本：`v1.0.92`",
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "OAuth2 / OIDC issuer",
    "mTLS boundary",
    "API Gateway / WAF policy",
    "56 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "API Edge Security Policy Governance Contract",
    "make api-edge-security-policy-check",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "gateway owner",
    "TLS termination owner",
    "trusted header forwarding",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.92",
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "OAuth2 / OIDC issuer",
    "mTLS boundary",
    "identity propagation",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "API edge security policy governance contract gate",
    "API Gateway / WAF policy",
    "OAuth2 / OIDC issuer",
    "mTLS boundary",
    "evidence retention",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.92",
    "API edge security policy governance contract gate",
    "check-api-edge-security-policy-contract.mjs",
    "OAuth2 / OIDC issuer",
    "mTLS boundary",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "trusted header forwarding",
  ],
  "chapters/09-build-and-deploy.md": [
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "API Gateway / WAF policy",
  ],
  "chapters/11-advanced-testing.md": [
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "identity propagation",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "gateway owner",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "API edge security policy governance contract gate",
    "node scripts/check-api-edge-security-policy-contract.mjs",
    "OAuth2 / OIDC issuer",
    "mTLS boundary",
  ],
  "production-api-worker/Makefile": [
    "api-edge-security-policy-check",
    "node scripts/check-api-edge-security-policy-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check API edge security policy governance contract",
    "node scripts/check-api-edge-security-policy-contract.mjs",
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
  console.error("api edge security policy governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "api edge security policy governance",
  files: files.length,
}, null, 2));
