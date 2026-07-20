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
    "教材版本：`v1.0.94`",
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "availability SLO",
    "error budget policy",
    "incident commander",
    "postmortem action owner",
    "58 個 root contract checker",
  ],
  "production-api-worker/README.md": [
    "SLO Incident Response Governance Contract",
    "make slo-incident-response-governance-check",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "incident commander",
    "customer impact note",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.94",
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "availability SLO",
    "error budget policy",
    "mitigation decision",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "SLO incident response governance contract gate",
    "availability SLO",
    "error budget policy",
    "incident commander",
    "escalation policy",
    "customer impact note",
    "postmortem action owner",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.94",
    "SLO incident response governance contract gate",
    "check-slo-incident-response-governance-contract.mjs",
    "incident commander",
    "postmortem action owner",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "incident commander",
  ],
  "chapters/09-build-and-deploy.md": [
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "error budget policy",
  ],
  "chapters/11-advanced-testing.md": [
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "postmortem action owner",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "availability SLO",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "SLO incident response governance contract gate",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
    "customer impact note",
  ],
  "production-api-worker/Makefile": [
    "slo-incident-response-governance-check",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check SLO incident response governance contract",
    "node scripts/check-slo-incident-response-governance-contract.mjs",
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
  console.error("SLO incident response governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "SLO incident response governance",
  files: files.length,
}, null, 2));
