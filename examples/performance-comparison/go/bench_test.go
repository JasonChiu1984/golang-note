package performancecomparison

import "testing"

const iterations = 50_000_000

func run(iterations int) uint64 {
	var acc uint64 = 1469598103934665603
	for i := 0; i < iterations; i++ {
		acc ^= uint64(i) + 0x9e3779b97f4a7c15
		acc *= 1099511628211
		acc ^= acc >> 32
	}
	return acc
}

func BenchmarkRun(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = run(iterations)
	}
}

func TestRunIsStable(t *testing.T) {
	got := run(1024)
	if got == 0 {
		t.Fatal("run returned zero")
	}
}
