#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";

const files = {
  alertmanager: "configs/prometheus/alertmanager.yml",
  prometheus: "configs/prometheus/prometheus.yml",
  compose: "production-api-worker/docker-compose.yml",
  readme: "README.md",
  productionReadme: "production-api-worker/README.md",
  runbook: "production-api-worker/docs/operational-runbook.md",
  apiContract: "production-api-worker/docs/api-contract.md",
  openapi: "production-api-worker/api/openapi.yaml",
  chapter09: "chapters/09-build-and-deploy.md",
  chapter11: "chapters/11-advanced-testing.md",
  cheatsheet: "Cheatsheet/cheatsheet-advanced.md",
  visualCourse: "圖解筆記3-4整合/golang-complete-visual-course.html",
  workflow: ".github/workflows/ci.yml",
  makefile: "production-api-worker/Makefile",
};

const missing = [];

function requireTerms(file, terms) {
  if (!existsSync(file)) {
    missing.push(`missing file: ${file}`);
    return;
  }
  const text = readFileSync(file, "utf8");
  for (const term of terms) {
    if (!text.includes(term)) missing.push(`${file} missing term: ${term}`);
  }
}

requireTerms(files.alertmanager, [
  "route:",
  "receiver: teaching-webhook",
  "group_by:",
  "repeat_interval: 4h",
  "webhook_configs:",
  "send_resolved: true",
  "production receiver owner",
  "escalation owner",
  "silence policy",
  "notification evidence",
]);

requireTerms(files.prometheus, [
  "alerting:",
  "alertmanagers:",
  "alertmanager:9093",
  "production-api-worker-alerts.yml",
]);

requireTerms(files.compose, [
  "alertmanager:",
  "prom/alertmanager:",
  "../configs/prometheus/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro",
  "\"9093:9093\"",
  "monitoring",
]);

requireTerms(files.readme, [
  "教材版本：`v1.0.92`",
  "56 個 root contract checker",
  "Alertmanager routing governance contract gate",
  "node scripts/check-alertmanager-routing-contract.mjs",
  "receiver owner",
  "escalation owner",
  "silence policy",
  "notification evidence",
]);

requireTerms(files.productionReadme, [
  "Alertmanager Routing Governance Contract",
  "make alertmanager-routing-check",
  "receiver owner",
  "escalation owner",
  "silence policy",
  "notification evidence",
]);

requireTerms(files.runbook, [
  "版本：v1.0.92",
  "Alertmanager routing governance contract gate",
  "configs/prometheus/alertmanager.yml",
  "receiver owner",
  "escalation owner",
  "silence policy",
  "notification evidence",
]);

requireTerms(files.apiContract, [
  "版本：v1.0.92",
  "Alertmanager routing governance contract gate",
  "node scripts/check-alertmanager-routing-contract.mjs",
]);

requireTerms(files.openapi, [
  "version: v1.0.92",
  "Alertmanager routing governance contract gate",
  "check-alertmanager-routing-contract.mjs",
]);

for (const file of [files.chapter09, files.chapter11, files.cheatsheet, files.visualCourse]) {
  requireTerms(file, [
    "Alertmanager routing governance contract gate",
    "node scripts/check-alertmanager-routing-contract.mjs",
  ]);
}

requireTerms(files.workflow, [
  "Check Alertmanager routing governance contract",
  "node scripts/check-alertmanager-routing-contract.mjs",
]);

requireTerms(files.makefile, [
  "alertmanager-routing-check",
  "node scripts/check-alertmanager-routing-contract.mjs",
]);

const contractScripts = readdirSync("scripts")
  .filter((name) => /^check-.*-contract\.mjs$/.test(name))
  .sort();

if (contractScripts.length !== 56) {
  missing.push(`expected 56 root contract checker scripts, found ${contractScripts.length}`);
}

if (missing.length > 0) {
  console.error("alertmanager routing governance contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  contract: "alertmanager routing governance",
  rootContractCheckers: contractScripts.length,
  route: "teaching-webhook",
}, null, 2));
