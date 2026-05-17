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

type trustedProxyConfig struct {
	ranges []*net.IPNet
}

func newTrustedProxyConfig(cidrs []string) trustedProxyConfig {
	config := trustedProxyConfig{}
	for _, cidr := range cidrs {
		_, network, err := net.ParseCIDR(strings.TrimSpace(cidr))
		if err == nil {
			config.ranges = append(config.ranges, network)
		}
	}
	return config
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

func clientIP(r *http.Request, proxies trustedProxyConfig) string {
	if proxies.trusts(r.RemoteAddr) {
		return forwardedClientIP(r)
	}
	return remoteClientIP(r.RemoteAddr)
}

func forwardedClientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	return remoteClientIP(r.RemoteAddr)
}

func remoteClientIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && strings.TrimSpace(host) != "" {
		return host
	}
	return strings.TrimSpace(remoteAddr)
}

func (c trustedProxyConfig) trusts(remoteAddr string) bool {
	if len(c.ranges) == 0 {
		return false
	}
	ip := net.ParseIP(remoteClientIP(remoteAddr))
	if ip == nil {
		return false
	}
	for _, network := range c.ranges {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}
