#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const roots = [
  "docs",
  "ReleaseNote",
  "圖解筆記3-4整合",
  "圖解筆記3",
  "圖解筆記4",
  "圖解筆記/網頁檔案",
];

const root = process.cwd();
const homeTarget = path.resolve(root, "docs/index.html");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file, files);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(file);
    }
  }
  return files;
}

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
}

function isHomeHref(file, href) {
  if (/^(https?:)?\/\//.test(href) || href.startsWith("#") || href.startsWith("mailto:")) return false;
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return false;
  return path.resolve(path.dirname(file), clean) === homeTarget;
}

const files = roots.flatMap((dir) => walk(path.join(root, dir))).sort();
const missing = [];

for (const file of files) {
  if (path.resolve(file) === homeTarget) continue;
  const html = fs.readFileSync(file, "utf8");
  if (!hrefs(html).some((href) => isHomeHref(file, href))) {
    missing.push(path.relative(root, file));
  }
}

if (missing.length > 0) {
  console.error("HTML pages missing a link back to docs/index.html:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`home link check passed: ${files.length - 1} pages link back to docs/index.html`);
