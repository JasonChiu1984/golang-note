#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "README.md",
  "production-api-worker/README.md",
  "production-api-worker/internal/config/config.go",
  "production-api-worker/internal/config/config_test.go",
  "production-api-worker/internal/api/handler.go",
  "production-api-worker/internal/api/handler_test.go",
  "production-api-worker/internal/api/rate_limit.go",
  "production-api-worker/docker-compose.yml",
  "production-api-worker/api/openapi.yaml",
  "production-api-worker/docs/api-contract.md",
  "production-api-worker/docs/operational-runbook.md",
  "chapters/07-large-project-concurrent-crawler.md",
  "chapters/11-advanced-testing.md",
  "Cheatsheet/cheatsheet-advanced.md",
  "圖解筆記3-4整合/golang-complete-visual-course.html",
  "production-api-worker/Makefile",
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Trusted proxy client IP contract gate",
    "TRUSTED_PROXY_CIDRS",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Trusted Proxy Client IP Contract",
    "make trusted-proxy-check",
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/internal/config/config.go": [
    "TrustedProxyCIDRs",
    "TRUSTED_PROXY_CIDRS",
    "parseCIDRList",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "TrustedProxyCIDRs",
    "trusted proxy cidr is invalid",
    "10.0.0.0/8",
  ],
  "production-api-worker/internal/api/handler.go": [
    "WithTrustedProxyCIDRs",
    "trustedProxyConfig",
    "rateLimitMiddleware",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRateLimitTrustedProxyContract",
    "X-Forwarded-For",
    "10.0.0.0/8",
  ],
  "production-api-worker/internal/api/rate_limit.go": [
    "func clientIP",
    "type trustedProxyConfig",
    "X-Forwarded-For",
    "RemoteAddr",
  ],
  "production-api-worker/docker-compose.yml": [
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.84",
    "trusted proxy client IP behavior",
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/docs/api-contract.md": [
    "版本：v1.0.84",
    "Trusted proxy client IP contract gate",
    "TRUSTED_PROXY_CIDRS",
    "X-Forwarded-For",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "Trusted proxy client IP contract gate",
    "TRUSTED_PROXY_CIDRS",
    "X-Forwarded-For",
  ],
  "chapters/07-large-project-concurrent-crawler.md": [
    "Trusted proxy client IP contract gate",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  "chapters/11-advanced-testing.md": [
    "Trusted proxy client IP contract gate",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  "Cheatsheet/cheatsheet-advanced.md": [
    "Trusted proxy client IP contract gate",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  "圖解筆記3-4整合/golang-complete-visual-course.html": [
    "Trusted proxy client IP contract gate",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  "production-api-worker/Makefile": [
    "trusted-proxy-check",
    "node scripts/check-trusted-proxy-contract.mjs",
  ],
  ".github/workflows/ci.yml": [
    "Check trusted proxy contract",
    "node scripts/check-trusted-proxy-contract.mjs",
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

const config = read("production-api-worker/internal/config/config.go");
if (!/parseCIDRList\("TRUSTED_PROXY_CIDRS"[\s\S]*TrustedProxyCIDRs:\s+trustedProxyCIDRs/.test(config)) {
  missing.push("production-api-worker/internal/config/config.go must parse TRUSTED_PROXY_CIDRS into Config.TrustedProxyCIDRs");
}

const rateLimit = read("production-api-worker/internal/api/rate_limit.go");
if (!/func clientIP\(r \*http\.Request, proxies trustedProxyConfig\) string[\s\S]*if proxies\.trusts\(r\.RemoteAddr\)[\s\S]*return forwardedClientIP\(r\)[\s\S]*return remoteClientIP\(r\.RemoteAddr\)/.test(rateLimit)) {
  missing.push("production-api-worker/internal/api/rate_limit.go must use X-Forwarded-For first IP only when RemoteAddr is trusted");
}
if (!/func forwardedClientIP\(r \*http\.Request\) string[\s\S]*Header\.Get\("X-Forwarded-For"\)[\s\S]*strings\.Split\(forwarded, ","\)[\s\S]*strings\.TrimSpace\(parts\[0\]\)/.test(rateLimit)) {
  missing.push("production-api-worker/internal/api/rate_limit.go must read the first X-Forwarded-For IP");
}
if (!/func remoteClientIP\(remoteAddr string\) string[\s\S]*net\.SplitHostPort\(remoteAddr\)[\s\S]*return strings\.TrimSpace\(remoteAddr\)/.test(rateLimit)) {
  missing.push("production-api-worker/internal/api/rate_limit.go must fall back to RemoteAddr for untrusted sources");
}

const handlerTest = read("production-api-worker/internal/api/handler_test.go");
if (!/TestRateLimitTrustedProxyContract[\s\S]*untrusted[\s\S]*X-Forwarded-For[\s\S]*http\.StatusTooManyRequests[\s\S]*trusted[\s\S]*WithTrustedProxyCIDRs\(\[\]string\{"10\.0\.0\.0\/8"\}\)/.test(handlerTest)) {
  missing.push("production-api-worker/internal/api/handler_test.go must prove untrusted X-Forwarded-For is ignored and trusted proxy CIDR is honored");
}

if (missing.length > 0) {
  console.error("trusted proxy contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "trusted proxy client IP",
}, null, 2));
