.PHONY: test test-race ci ci-contract openapi-check readiness-check request-decoding-check idempotency-key-check api-latency-metrics-check service-transaction-boundary-check panic-recovery-check request-correlation-check api-security-check worker-failure-check worker-shutdown-check retry-cancellation-check request-timeout-check queue-backpressure-check db-pool-check migration-check runbook-check operational-runbook-scope-check prometheus-check operational-observability-check alertmanager-routing-check pprof-check trace-shutdown-check rate-limit-check trusted-proxy-check cors-check request-body-limit-check http-timeout-check startup-config-check shutdown-signal-check ci-quality-gate-check ci-contract-parity-check contract-gate-inventory-check docs-publishing-check production-workflow-check syntax-flow-svg-check go-release-notes-check go-release-notes-freshness-check release-version-consistency-check release-artifact-chain-check release-publish-reconciliation-check dependency-governance-check performance-benchmark-governance-check release-rollback-drill-check docker-build-check compose-smoke-check compose-runtime-env-check otel-check otel-export-governance-check secret-handling-governance-check supply-chain-artifact-governance-check platform-promotion-policy-check deployment-controller-config-check docker-build compose-smoke run migrate docker-up docker-down

test:
	go test ./...

test-race:
	go test -race ./...

ci:
	go mod verify
	go test ./...
	go test -race -cover ./...

ci-contract:
	go test ./internal/config ./internal/migration -count=1
	go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract|TestRequestBodyLimitContract|TestRequestTimeoutContract|TestRateLimitContract|TestCORSAllowedOriginsContract|TestIdempotencyKeyContract|TestAPILatencyMetricsContract' -count=1
	go test ./cmd/api-worker -run 'TestMonitoredSignalsContract|TestHTTPServerTimeoutContract' -count=1
	go test ./internal/observability -run 'TestTraceShutdownContract' -count=1
	go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled|TestCreateJobIdempotencyKeyContract|TestServiceTransactionBoundaryContract' -count=1
	go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic|TestWorkerFailureResultContract|TestQueueBackpressureContract' -count=1

openapi-check:
	cd .. && node scripts/check-openapi-contract.mjs

readiness-check:
	cd .. && node scripts/check-readiness-contract.mjs

request-decoding-check:
	cd .. && node scripts/check-request-decoding-contract.mjs

idempotency-key-check:
	cd .. && node scripts/check-idempotency-key-contract.mjs

api-latency-metrics-check:
	cd .. && node scripts/check-api-latency-metrics-contract.mjs

service-transaction-boundary-check:
	cd .. && node scripts/check-service-transaction-boundary-contract.mjs

panic-recovery-check:
	cd .. && node scripts/check-panic-recovery-contract.mjs

request-correlation-check:
	cd .. && node scripts/check-request-correlation-contract.mjs

api-security-check:
	cd .. && node scripts/check-api-security-contract.mjs

worker-failure-check:
	cd .. && node scripts/check-worker-failure-contract.mjs

worker-shutdown-check:
	cd .. && node scripts/check-worker-shutdown-contract.mjs
	go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1

retry-cancellation-check:
	cd .. && node scripts/check-retry-cancellation-contract.mjs

request-timeout-check:
	cd .. && node scripts/check-request-timeout-contract.mjs

queue-backpressure-check:
	cd .. && node scripts/check-queue-backpressure-contract.mjs

db-pool-check:
	cd .. && node scripts/check-db-pool-contract.mjs

migration-check:
	cd .. && node scripts/check-migration-contract.mjs

runbook-check:
	cd .. && node scripts/check-operational-runbook.mjs

operational-runbook-scope-check:
	cd .. && node scripts/check-operational-runbook-scope-contract.mjs

prometheus-check:
	cd .. && node scripts/check-prometheus-config.mjs
	cd .. && node scripts/check-prometheus-config-contract.mjs

operational-observability-check:
	cd .. && node scripts/check-operational-observability-contract.mjs

alertmanager-routing-check:
	cd .. && node scripts/check-alertmanager-routing-contract.mjs

pprof-check:
	cd .. && node scripts/check-pprof-contract.mjs

trace-shutdown-check:
	cd .. && node scripts/check-trace-shutdown-contract.mjs
	go test ./internal/observability -run 'TestTraceShutdownContract' -count=1

rate-limit-check:
	cd .. && node scripts/check-rate-limit-contract.mjs

trusted-proxy-check:
	cd .. && node scripts/check-trusted-proxy-contract.mjs

cors-check:
	cd .. && node scripts/check-cors-contract.mjs

request-body-limit-check:
	cd .. && node scripts/check-request-body-limit-contract.mjs

http-timeout-check:
	cd .. && node scripts/check-http-timeout-contract.mjs

startup-config-check:
	cd .. && node scripts/check-startup-config-contract.mjs

shutdown-signal-check:
	cd .. && node scripts/check-shutdown-signal-contract.mjs

ci-quality-gate-check:
	cd .. && node scripts/check-ci-quality-gate-contract.mjs

ci-contract-parity-check:
	cd .. && node scripts/check-ci-contract-parity-contract.mjs

contract-gate-inventory-check:
	cd .. && node scripts/check-contract-gate-inventory-contract.mjs

docs-publishing-check:
	cd .. && node scripts/check-docs-publishing-contract.mjs

production-workflow-check:
	cd .. && node scripts/check-production-workflow-contract.mjs

syntax-flow-svg-check:
	cd .. && node scripts/check-syntax-flow-svg-contract.mjs

go-release-notes-check:
	cd .. && node scripts/check-go-release-notes-contract.mjs

go-release-notes-freshness-check:
	cd .. && node scripts/check-go-release-notes-freshness-contract.mjs

release-version-consistency-check:
	cd .. && node scripts/check-release-version-consistency-contract.mjs

release-artifact-chain-check:
	cd .. && node scripts/check-release-artifact-chain-contract.mjs

release-publish-reconciliation-check:
	cd .. && node scripts/check-release-publish-reconciliation-contract.mjs

dependency-governance-check:
	cd .. && node scripts/check-dependency-governance-contract.mjs

performance-benchmark-governance-check:
	cd .. && node scripts/check-performance-benchmark-governance-contract.mjs

release-rollback-drill-check:
	cd .. && node scripts/check-release-rollback-drill-contract.mjs

docker-build-check:
	cd .. && node scripts/check-docker-build-contract.mjs
	docker build -t production-api-worker:local .

compose-smoke-check:
	cd .. && node scripts/check-compose-smoke-contract.mjs

compose-runtime-env-check:
	cd .. && node scripts/check-compose-runtime-env-contract.mjs

otel-check:
	cd .. && node scripts/check-otel-collector-contract.mjs

otel-export-governance-check:
	cd .. && node scripts/check-otel-export-governance-contract.mjs

secret-handling-governance-check:
	cd .. && node scripts/check-secret-handling-governance-contract.mjs

supply-chain-artifact-governance-check:
	cd .. && node scripts/check-supply-chain-artifact-governance-contract.mjs

platform-promotion-policy-check:
	cd .. && node scripts/check-platform-promotion-policy-contract.mjs

deployment-controller-config-check:
	cd .. && node scripts/check-deployment-controller-config-contract.mjs

docker-build:
	docker build -t production-api-worker:local .

compose-smoke:
	./scripts/compose-smoke.sh

run:
	go run ./cmd/api-worker

migrate:
	go run ./cmd/migrate

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v
