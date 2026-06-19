package domain

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

type JobStatus string

const (
	JobPending    JobStatus = "pending"
	JobProcessing JobStatus = "processing"
	JobDone       JobStatus = "done"
	JobFailed     JobStatus = "failed"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrNotFound     = errors.New("not found")
	ErrQueueFull    = errors.New("queue full")
	ErrDeadlock     = errors.New("deadlock detected")
)

type JobInput struct {
	Name           string `json:"name"`
	Payload        string `json:"payload"`
	IdempotencyKey string `json:"-"`
}

type Job struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Payload        string    `json:"payload"`
	IdempotencyKey string    `json:"-"`
	Status         JobStatus `json:"status"`
	Attempts       int       `json:"attempts"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func ValidateJobInput(input JobInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return fmt.Errorf("name is required: %w", ErrInvalidInput)
	}
	if len(input.Payload) > 4096 {
		return fmt.Errorf("payload too large: %w", ErrInvalidInput)
	}
	if err := ValidateIdempotencyKey(input.IdempotencyKey); err != nil {
		return err
	}
	return nil
}

func ValidateIdempotencyKey(key string) error {
	if key == "" {
		return nil
	}
	if strings.TrimSpace(key) != key {
		return fmt.Errorf("idempotency key must not have surrounding whitespace: %w", ErrInvalidInput)
	}
	if len(key) > 128 {
		return fmt.Errorf("idempotency key is too long: %w", ErrInvalidInput)
	}
	if strings.ContainsAny(key, " \t\r\n") {
		return fmt.Errorf("idempotency key must not contain whitespace: %w", ErrInvalidInput)
	}
	return nil
}
