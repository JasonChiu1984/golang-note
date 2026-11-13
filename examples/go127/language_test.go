package modern

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"testing"
)

// Go 1.24: a parameterized alias retains the underlying type's identity.
type Table[K comparable, V any] = map[K]V

// Go 1.26: the constraint may refer to the generic type being declared.
type Summable[T Summable[T]] interface{ Add(T) T }
type amount int

func (a amount) Add(b amount) amount    { return a + b }
func addValues[T Summable[T]](a, b T) T { return a.Add(b) }

func identity[T any](v T) T { return v }

func equalValues[T comparable](a, b T) bool { return a == b }

type languageInner struct{ Value int }
type languageOuter struct{ languageInner }

func TestLanguageChanges(t *testing.T) {
	t.Run("interface-comparable-go120", func(t *testing.T) {
		if !equalValues[any](3, 3) {
			t.Fatal("comparable dynamic ints")
		}
		defer func() {
			if recover() == nil {
				t.Fatal("slice dynamic values must panic on comparison")
			}
		}()
		equalValues[any]([]int{1}, []int{1})
	})
	t.Run("slice-to-array-go120", func(t *testing.T) {
		src := []int{2, 4}
		a := [2]int(src)
		src[0] = 9
		if a != [2]int{2, 4} {
			t.Fatal(a)
		}
	})
	t.Run("builtins-go121", func(t *testing.T) {
		s := []int{2, 3}
		clear(s)
		m := map[int]int{1: 2}
		clear(m)
		if !slices.Equal(s, []int{0, 0}) || len(m) != 0 || min(3, 1) != 1 || max(3, 1) != 3 {
			t.Fatal(s, m)
		}
	})
	t.Run("loop-variables-go122", func(t *testing.T) {
		var declared []func() int
		for i := range 3 {
			declared = append(declared, func() int { return i })
		}
		for i, f := range declared {
			if f() != i {
				t.Fatal(i, f())
			}
		}
		var reused []func() int
		var n int
		for n = range 3 {
			reused = append(reused, func() int { return n })
		}
		for _, f := range reused {
			if f() != 2 {
				t.Fatal(f())
			}
		}
	})
	t.Run("range-function-go123", func(t *testing.T) {
		calls := 0
		seq := func(yield func(int) bool) {
			for i := range 5 {
				calls++
				if !yield(i) {
					return
				}
			}
		}
		var got []int
		for n := range seq {
			got = append(got, n)
			if n == 1 {
				break
			}
		}
		if !slices.Equal(got, []int{0, 1}) || calls != 2 {
			t.Fatal(got, calls)
		}
	})
	t.Run("generic-alias-go124", func(t *testing.T) {
		var m Table[string, int] = map[string]int{"a": 1}
		var plain map[string]int = m
		if plain["a"] != 1 {
			t.Fatal(plain)
		}
	})
	t.Run("new-expression-and-constraint-go126", func(t *testing.T) {
		x := 3
		p := new(x + 4)
		x = 8
		if *p != 7 || x != 8 || addValues(amount(2), amount(3)) != 5 {
			t.Fatal(*p, x)
		}
	})
	t.Run("struct-field-selectors-go127", func(t *testing.T) {
		a := languageOuter{Value: 7}
		b := languageOuter{languageInner: languageInner{Value: 8}}
		if a.Value != 7 || b.Value != 8 {
			t.Fatal(a, b)
		}
	})
	t.Run("function-inference-go127", func(t *testing.T) {
		fs := []func(int) int{identity}
		f := (func(string) string)(identity)
		if fs[0](4) != 4 || f("go") != "go" {
			t.Fatal("inference")
		}
	})
}

// These compiler fixtures have no imports, so -lang tests language rules without
// accidentally depending on standard-library APIs or downloading older tools.
func TestLanguageCompilerBoundaries(t *testing.T) {
	cases := []struct {
		name, source, lang string
		valid              bool
	}{
		{"new-expression-126", "var p = new(3)", "go1.26", true},
		{"new-expression-before126", "var p = new(3)", "go1.25", false},
		{"generic-method-127", "type S struct{}; func(S) F[T any](v T) T{return v}", "go1.27", true},
		{"generic-method-before127", "type S struct{}; func(S) F[T any](v T) T{return v}", "go1.26", false},
		{"interface-generic-method-invalid", "type I interface { F[T any](T) T }", "go1.27", false},
		{"selector-key-127", "type A struct{X int};type B struct{A};var b=B{X:1}", "go1.27", true},
		{"selector-key-before127", "type A struct{X int};type B struct{A};var b=B{X:1}", "go1.26", false},
		{"dotted-key-invalid", "type A struct{X int};type B struct{A};var b=B{A.X:1}", "go1.27", false},
		{"embedded-pointer-invalid", "type A struct{X int};type B struct{*A};var b=B{X:1}", "go1.27", false},
		{"generic-method-interface-invalid", "type I interface{ F(int)int };type S struct{};func(S)F[T any](x T)T{return x};var i I=S{}", "go1.27", false},
		{"generic-function-literal-invalid", "var f=func[T any](x T)T{return x}", "go1.27", false},
		{"duplicate-selector-invalid", "type A struct{X int};type B struct{A};var b=B{A:A{},X:2}", "go1.27", false},
		{"inference-without-target-invalid", "func f[T any](x T)T{return x};var g=f", "go1.27", false},
		{"function-inference-127", "func f[T any](x T) T{return x};var fs=[]func(int)int{f}", "go1.27", true},
	}
	goBinary := filepath.Join(runtime.GOROOT(), "bin", "go")
	if runtime.GOOS == "windows" {
		goBinary += ".exe"
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			src := filepath.Join(dir, "fixture.go")
			if err := os.WriteFile(src, []byte("package fixture\n"+tc.source+"\n"), 0600); err != nil {
				t.Fatal(err)
			}
			cmd := exec.Command(goBinary, "tool", "compile", "-lang="+tc.lang, "-o", filepath.Join(dir, "fixture.o"), src)
			output, err := cmd.CombinedOutput()
			if (err == nil) != tc.valid {
				t.Fatalf("valid=%v, err=%v\n%s", tc.valid, err, output)
			}
			if err != nil {
				if _, ok := err.(*exec.ExitError); !ok {
					t.Fatalf("compiler could not run: %v", err)
				}
			}
		})
	}
}
