.PHONY: test test-race run migrate docker-up docker-down

test:
	go test ./...

test-race:
	go test -race ./...

run:
	go run ./cmd/api-worker

migrate:
	go run ./cmd/migrate

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v

