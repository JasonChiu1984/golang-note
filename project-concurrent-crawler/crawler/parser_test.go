package crawler

import "testing"

func TestLinkParserParsesTitleAndLinks(t *testing.T) {
	parser := LinkParser{}
	got, err := parser.Parse(FetchedPage{
		URL:  "https://example.test/docs/index.html",
		Body: []byte(`<html><head><title> Go Docs </title></head><body><a href="/about">About</a><a href="https://example.test/api">API</a><a href="#top">Top</a></body></html>`),
	})
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if got.Title != "Go Docs" {
		t.Fatalf("Title = %q, want %q", got.Title, "Go Docs")
	}
	if len(got.Links) != 2 {
		t.Fatalf("len(Links) = %d, want 2: %#v", len(got.Links), got.Links)
	}
	if got.Links[0] != "https://example.test/about" {
		t.Fatalf("Links[0] = %q", got.Links[0])
	}
}
