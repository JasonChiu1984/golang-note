.PHONY: test test-race ci ci-contract openapi-check readiness-check request-decoding-check panic-recovery-check request-correlation-check api-security-check worker-failure-check retry-cancellation-check request-timeout-check queue-backpressure-check db-pool-check migration-check runbook-check prometheus-check operational-observability-check pprof-check rate-limit-check trusted-proxy-check cors-check request-body-limit-check http-timeout-check startup-config-check shutdown-signal-check ci-quality-gate-check ci-contract-parity-check contract-gate-inventory-check docs-publishing-check compose-smoke-check otel-check docker-build compose-smoke run migrate docker-up docker-down

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
	go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract|TestRequestBodyLimitContract|TestRequestTimeoutContract|TestRateLimitContract|TestCORSAllowedOriginsContract' -count=1
	go test ./cmd/api-worker -run 'TestMonitoredSignalsContract|TestHTTPServerTimeoutContract' -count=1
	go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
	go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic|TestWorkerFailureResultContract|TestQueueBackpressureContract' -count=1

openapi-check:
	cd .. && node scripts/check-openapi-contract.mjs

readiness-check:
	cd .. && node scripts/check-readiness-contract.mjs

request-decoding-check:
	cd .. && node scripts/check-request-decoding-contract.mjs

panic-recovery-check:
	cd .. && node scripts/check-panic-recovery-contract.mjs

request-correlation-check:
	cd .. && node scripts/check-request-correlation-contract.mjs

api-security-check:
	cd .. && node scripts/check-api-security-contract.mjs

worker-failure-check:
	cd .. && node scripts/check-worker-failure-contract.mjs

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

prometheus-check:
	cd .. && node scripts/check-prometheus-config.mjs

operational-observability-check:
	cd .. && node scripts/check-operational-observability-contract.mjs

pprof-check:
	cd .. && node scripts/check-pprof-contract.mjs

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

compose-smoke-check:
	cd .. && node scripts/check-compose-smoke-contract.mjs

otel-check:
	cd .. && node scripts/check-otel-collector-contract.mjs

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
