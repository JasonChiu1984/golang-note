#!/usr/bin/env node
import { readFileSync } from "node:fs";

const targets = [
  "docs/golang-syntax-application-svg.html",
  "圖解筆記3-4整合/golang-syntax-application-svg.html",
];

const expectedKeys = [
  "package",
  "import",
  "const",
  "var",
  "type",
  "func",
  "if",
  "else",
  "switch",
  "case",
  "default",
  "for",
  "range",
  "break",
  "continue",
  "fallthrough",
  "goto",
  "defer",
  "return",
  "interface",
  "struct",
  "map",
  "chan",
  "go",
  "select",
];

const requiredTerms = [
  "標準程式流程圖符號",
  "Start/End",
  "Process",
  "Decision",
  "Input/Output",
  "appendSvgMetadata",
  "drawFlowNode",
  "svgParallelogram",
  "svgDiamond",
  "aria-labelledby",
];

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

for (const file of targets) {
  const html = readFileSync(file, "utf8");
  for (const term of requiredTerms) {
    if (!html.includes(term)) fail(file, `missing required term: ${term}`);
  }

  const flowCount = countMatches(html, /^\s*key: "/gm);
  const blueprintCount = countMatches(html, /^\s*flowTitle: "/gm);
  if (flowCount !== expectedKeys.length) {
    fail(file, `expected ${expectedKeys.length} syntax flow entries, got ${flowCount}`);
  }
  if (blueprintCount !== expectedKeys.length) {
    fail(file, `expected ${expectedKeys.length} flow blueprints, got ${blueprintCount}`);
  }

  for (const key of expectedKeys) {
    if (!html.includes(`key: "${key}"`)) fail(file, `missing syntax flow key: ${key}`);
    if (!html.includes(`${key}：`)) fail(file, `missing blueprint title for: ${key}`);
  }

  if (!html.includes("const nodes = flowSource.flowNodes")) {
    fail(file, "dynamic renderer is not using blueprint flow nodes");
  }
  if (html.includes("城市路線圖風格")) {
    fail(file, "old city-route wording should not remain in the flowchart section");
  }
}

console.log(`syntax flow SVG check passed: ${targets.length} files, ${expectedKeys.length} flows each`);
