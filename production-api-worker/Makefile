.PHONY: test test-race ci ci-contract openapi-check runbook-check prometheus-check docker-build compose-smoke run migrate docker-up docker-down

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
	go test ./internal/api -run 'Test.*Contract|TestReadinessContract|TestPanicRecoveryContract|TestRequestDecodingContract|TestRequestTimeoutContract' -count=1
	go test ./internal/app -run 'TestCreateJobStopsDeadlockRetryWhenContextCanceled' -count=1
	go test ./internal/worker -run 'Test.*Shutdown|TestConcurrentEnqueueAndShutdownDoesNotPanic' -count=1

openapi-check:
	cd .. && node scripts/check-openapi-contract.mjs

runbook-check:
	cd .. && node scripts/check-operational-runbook.mjs

prometheus-check:
	cd .. && node scripts/check-prometheus-config.mjs

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
