package crawler

import (
	"net/url"
	"regexp"
	"strings"
)

type LinkParser struct{}

var (
	titlePattern = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)
	hrefPattern  = regexp.MustCompile(`(?is)href\s*=\s*["']([^"']+)["']`)
)

func (LinkParser) Parse(page FetchedPage) (ParsedPage, error) {
	html := string(page.Body)
	title := strings.TrimSpace(stripSpaces(firstMatch(titlePattern, html)))
	links := make([]string, 0)

	base, _ := url.Parse(page.URL)
	for _, match := range hrefPattern.FindAllStringSubmatch(html, -1) {
		raw := strings.TrimSpace(match[1])
		if raw == "" || strings.HasPrefix(raw, "#") {
			continue
		}
		parsed, err := url.Parse(raw)
		if err != nil {
			continue
		}
		if base != nil {
			parsed = base.ResolveReference(parsed)
		}
		if parsed.Scheme == "http" || parsed.Scheme == "https" {
			links = append(links, parsed.String())
		}
	}

	return ParsedPage{Title: title, Links: links}, nil
}

func firstMatch(pattern *regexp.Regexp, value string) string {
	match := pattern.FindStringSubmatch(value)
	if len(match) < 2 {
		return ""
	}
	return match[1]
}

func stripSpaces(value string) string {
	return strings.Join(strings.Fields(value), " ")
}
