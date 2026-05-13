package lifecycle

import "sync/atomic"

type Readiness struct {
	draining atomic.Bool
}

func NewReadiness() *Readiness {
	return &Readiness{}
}

func (r *Readiness) Ready() bool {
	return !r.draining.Load()
}

func (r *Readiness) MarkDraining() {
	r.draining.Store(true)
}
