package migration

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestSQLFilesReturnsSortedSQLFilesOnly(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, "002_add_index.sql")
	writeFile(t, dir, "001_init.sql")
	writeFile(t, dir, "README.md")
	if err := os.Mkdir(filepath.Join(dir, "003_nested.sql"), 0o755); err != nil {
		t.Fatal(err)
	}

	files, err := SQLFiles(dir)
	if err != nil {
		t.Fatalf("SQLFiles returned error: %v", err)
	}

	want := []string{
		filepath.Join(dir, "001_init.sql"),
		filepath.Join(dir, "002_add_index.sql"),
	}
	if !reflect.DeepEqual(files, want) {
		t.Fatalf("files = %#v, want %#v", files, want)
	}
}

func TestVersionFromFile(t *testing.T) {
	version, err := VersionFromFile("/tmp/migrations/001_init.sql")
	if err != nil {
		t.Fatalf("VersionFromFile returned error: %v", err)
	}
	if version != "001_init" {
		t.Fatalf("version = %q, want 001_init", version)
	}
}

func TestVersionFromFileRejectsInvalidNames(t *testing.T) {
	tests := []struct {
		path      string
		wantError string
	}{
		{path: "/tmp/migrations/001_init.txt", wantError: "must use .sql extension"},
		{path: "/tmp/migrations/.sql", wantError: "empty version"},
		{path: "/tmp/migrations/001 init.sql", wantError: "must not contain whitespace"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			_, err := VersionFromFile(tt.path)
			if err == nil {
				t.Fatal("VersionFromFile returned nil error")
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("error = %q, want containing %q", err.Error(), tt.wantError)
			}
		})
	}
}

func writeFile(t *testing.T, dir, name string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte("-- migration\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}
