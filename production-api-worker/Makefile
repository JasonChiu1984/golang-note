.PHONY: test test-race ci ci-contract docker-build run migrate docker-up docker-down

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

docker-build:
	docker build -t production-api-worker:local .

run:
	go run ./cmd/api-worker

migrate:
	go run ./cmd/migrate

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v
