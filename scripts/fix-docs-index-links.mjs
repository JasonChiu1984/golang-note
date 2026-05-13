#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const indexPath = path.join(docsDir, "index.html");
const sourcePath = path.join(root, "圖解筆記3-4整合", "golang-complete-visual-course.html");
const shouldSyncSource = process.argv.includes("--sync-source");
const shouldCheckOnly = process.argv.includes("--check");

if (!existsSync(indexPath)) {
  throw new Error(`missing docs index: ${path.relative(root, indexPath)}`);
}

if (shouldSyncSource) {
  if (!existsSync(sourcePath)) {
    throw new Error(`missing source index: ${path.relative(root, sourcePath)}`);
  }
  if (!shouldCheckOnly) {
    writeFileSync(indexPath, readFileSync(sourcePath, "utf8"));
  }
}

const replacements = [
  ["../docs/golang-syntax-application-svg.html", "golang-syntax-application-svg.html"],
  ["../docs/golang-third-party-modules.html", "golang-third-party-modules.html"],
  ["../docs/c-python-go-performance-supplement.html", "c-python-go-performance-supplement.html"],
  ["../docs/golang-assembly-microservice.html", "golang-assembly-microservice.html"],
  ["../docs/golang-assembly-tutorial.html", "golang-assembly-tutorial.html"],
  ["../docs/golang-microservice-tutorial.html", "golang-microservice-tutorial.html"],
  ["../ReleaseNote/index.html", "ReleaseNote/index.html"],
  ["../examples/performance-comparison/README.md", "c-python-go-performance-supplement.html#verification"],
  ["../production-api-worker/cmd/api-worker/main.go", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/cmd/api-worker/main.go"],
  ["../production-api-worker/internal/app/service.go", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/internal/app/service.go"],
  ["../production-api-worker/internal/repository/postgres.go", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/internal/repository/postgres.go"],
  ["../production-api-worker/internal/observability/observability.go", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/internal/observability/observability.go"],
  ["../production-api-worker/docker-compose.yml", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/docker-compose.yml"],
  ["../production-api-worker/scripts/compose-smoke.sh", "https://github.com/JasonChiu1984/golang-note/blob/main/production-api-worker/scripts/compose-smoke.sh"],
  ["../圖解筆記3/golang-visual-course.html#syntax-index", "#syntax-from-note3"],
  ["../圖解筆記3/golang-visual-course.html#project", "#project-from-note3"],
  ["../圖解筆記3/golang-visual-course.html#engineering-decisions", "#project-from-note3"],
  ["../圖解筆記3/golang-visual-course.html#cases", "#examples-200"],
  ["../圖解筆記4/golang-production-advanced.html#syntax-index", "#production-advanced"],
  ["../圖解筆記4/golang-production-advanced.html#modern-stdlib", "#production-advanced"],
  ["../圖解筆記4/golang-production-advanced.html#database-layer", "#database-layer"],
  ["../圖解筆記4/golang-production-advanced.html#observability", "#observability"],
];

let html = readFileSync(indexPath, "utf8");
const before = html;
const applied = [];

for (const [from, to] of replacements) {
  if (html.includes(from)) {
    html = html.split(from).join(to);
    applied.push(`${from} -> ${to}`);
  }
}

const forbiddenPatterns = [
  "href=\"../docs/",
  "href=\"../ReleaseNote/",
  "href=\"../examples/",
  "href=\"../production-api-worker/",
  "href=\"/docs/",
  "href=\"/ReleaseNote/",
  "data-src=\"../",
];

const remainingForbidden = forbiddenPatterns.filter((pattern) => html.includes(pattern));
if (remainingForbidden.length > 0) {
  throw new Error(`forbidden docs/index link pattern remains: ${remainingForbidden.join(", ")}`);
}

const hrefs = [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
const missing = [];

for (const href of hrefs) {
  if (
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    continue;
  }
  const withoutHash = href.split("#")[0];
  if (withoutHash === "") {
    continue;
  }
  const target = path.normalize(path.join(docsDir, withoutHash));
  if (!target.startsWith(docsDir + path.sep) && target !== docsDir) {
    missing.push(`${href} escapes docs root`);
    continue;
  }
  if (!existsSync(target)) {
    missing.push(href);
  }
}

if (missing.length > 0) {
  throw new Error(`docs/index has missing local targets:\n${missing.map((item) => `- ${item}`).join("\n")}`);
}

if (html !== before && !shouldCheckOnly) {
  writeFileSync(indexPath, html);
}

console.log(JSON.stringify({
  file: "docs/index.html",
  mode: shouldCheckOnly ? "check" : "fix",
  syncedFromSource: shouldSyncSource,
  changed: html !== before,
  replacements: applied,
  checkedLocalLinks: hrefs.length,
}, null, 2));
