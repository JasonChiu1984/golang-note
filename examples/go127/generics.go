package modern

// Go 1.27+
type Converter struct{}

func (Converter) Map[T, U any](in []T, f func(T) U) []U {
	out := make([]U, len(in))
	for i, value := range in {
		out[i] = f(value)
	}
	return out
}
