FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api-worker ./cmd/api-worker
RUN CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=build /out/api-worker /app/api-worker
COPY --from=build /out/migrate /app/migrate
COPY migrations /app/migrations
EXPOSE 8080
ENTRYPOINT ["/app/api-worker"]

