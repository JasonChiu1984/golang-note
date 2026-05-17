package api

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type rateLimiter struct {
	limit  int
	window time.Duration
	now    func() time.Time
	mu     sync.Mutex
	hits   map[string]rateLimitWindow
}

type rateLimitWindow struct {
	start time.Time
	count int
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	if limit <= 0 || window <= 0 {
		return nil
	}
	return &rateLimiter{
		limit:  limit,
		window: window,
		now:    time.Now,
		hits:   make(map[string]rateLimitWindow),
	}
}

func (l *rateLimiter) Allow(key string) bool {
	if l == nil || strings.TrimSpace(key) == "" {
		return true
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	window := l.hits[key]
	if window.start.IsZero() || now.Sub(window.start) >= l.window {
		l.hits[key] = rateLimitWindow{start: now, count: 1}
		return true
	}
	if window.count >= l.limit {
		return false
	}
	window.count++
	l.hits[key] = window
	return true
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && strings.TrimSpace(host) != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
