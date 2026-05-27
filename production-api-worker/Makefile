.PHONY: test test-race ci ci-contract openapi-check request-correlation-check api-security-check worker-failure-check retry-cancellation-check runbook-check prometheus-check pprof-check rate-limit-check cors-check request-body-limit-check http-timeout-check shutdown-signal-check otel-check docker-build compose-smoke run migrate docker-up docker-down

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
	go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract|TestRequestBodyLimitContract|TestRequestTimeoutContract|TestRateLimitContract' -count=1
	go test ./cmd/api-worker -run 'TestMonitoredSignalsContract|TestHTTPServerTimeoutContract' -count=1
	go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
	go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic|TestWorkerFailureResultContract' -count=1

openapi-check:
	cd .. && node scripts/check-openapi-contract.mjs

request-correlation-check:
	cd .. && node scripts/check-request-correlation-contract.mjs

api-security-check:
	cd .. && node scripts/check-api-security-contract.mjs

worker-failure-check:
	cd .. && node scripts/check-worker-failure-contract.mjs

retry-cancellation-check:
	cd .. && node scripts/check-retry-cancellation-contract.mjs

runbook-check:
	cd .. && node scripts/check-operational-runbook.mjs

prometheus-check:
	cd .. && node scripts/check-prometheus-config.mjs

pprof-check:
	cd .. && node scripts/check-pprof-contract.mjs

rate-limit-check:
	cd .. && node scripts/check-rate-limit-contract.mjs

cors-check:
	cd .. && node scripts/check-cors-contract.mjs

request-body-limit-check:
	cd .. && node scripts/check-request-body-limit-contract.mjs

http-timeout-check:
	cd .. && node scripts/check-http-timeout-contract.mjs

shutdown-signal-check:
	cd .. && node scripts/check-shutdown-signal-contract.mjs

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
