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
  ".github/workflows/ci.yml",
];

const required = {
  "README.md": [
    "Rate limit contract",
    "RATE_LIMIT_REQUESTS_PER_MINUTE",
    "node scripts/check-rate-limit-contract.mjs",
  ],
  "production-api-worker/README.md": [
    "Rate Limit Contract",
    "RATE_LIMIT_REQUESTS_PER_MINUTE",
    "TestRateLimitContract",
  ],
  "production-api-worker/internal/config/config.go": [
    "DefaultRateLimitPerMinute",
    "RateLimitPerMinute",
    "RATE_LIMIT_REQUESTS_PER_MINUTE",
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/internal/config/config_test.go": [
    "RateLimitPerMinute",
    "rate limit is not positive",
    "trusted proxy cidr is invalid",
  ],
  "production-api-worker/internal/api/handler.go": [
    "WithRateLimit",
    "WithTrustedProxyCIDRs",
    "rateLimitMiddleware",
    "rate_limited",
  ],
  "production-api-worker/internal/api/handler_test.go": [
    "TestRateLimitContract",
    "TestRateLimitTrustedProxyContract",
    "http.StatusTooManyRequests",
  ],
  "production-api-worker/internal/api/rate_limit.go": [
    "type rateLimiter struct",
    "func clientIP",
    "type trustedProxyConfig",
  ],
  "production-api-worker/docker-compose.yml": [
    "RATE_LIMIT_REQUESTS_PER_MINUTE",
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/api/openapi.yaml": [
    "version: v1.0.51",
    "429",
    "rate_limited",
  ],
  "production-api-worker/docs/api-contract.md": [
    "Rate limit",
    "429 rate_limited",
    "RATE_LIMIT_REQUESTS_PER_MINUTE",
    "TRUSTED_PROXY_CIDRS",
  ],
  "production-api-worker/docs/operational-runbook.md": [
    "TRUSTED_PROXY_CIDRS",
    "X-Forwarded-For",
    "trusted proxy",
  ],
  ".github/workflows/ci.yml": [
    "Check rate limit contract",
    "node scripts/check-rate-limit-contract.mjs",
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
  console.error("rate limit contract check failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  files: files.length,
  contract: "rate limit",
}, null, 2));
