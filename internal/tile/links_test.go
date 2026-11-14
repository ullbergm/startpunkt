package tile

import (
	"strings"
	"testing"
)

func TestValidURL(t *testing.T) {
	for _, address := range []string{"https://grafana.example.com/dashboards?q=1#view", "http://service.namespace.svc:8080", "http://[::1]:8080/path", " HTTPS://example.com "} {
		if !ValidURL(address) {
			t.Errorf("ValidURL(%q) = false", address)
		}
	}
	for _, address := range []string{"", "/relative", "//example.com", "javascript:alert(1)", "data:text/plain,x", "file:///tmp/x", "ftp://example.com", "https://", "http://:8080", "http://example.com:70000", "http://example.com:no", "http://example.com:", "http://[not-an-ip]", "http://[127.0.0.1]", "http://a\u2003b", "http://::1", "http://example.com/\npath", `http://example.com\@evil.com`} {
		if ValidURL(address) {
			t.Errorf("ValidURL(%q) = true", address)
		}
	}
}

func TestValidateLinks(t *testing.T) {
	good := []Link{{Name: "Documentation", URL: "https://docs.example.com"}}
	if err := ValidateLinks(good); err != nil {
		t.Fatal(err)
	}
	for name, links := range map[string][]Link{
		"missing name": {{URL: "https://example.com"}},
		"long name":    {{Name: strings.Repeat("x", 81), URL: "https://example.com"}},
		"bad address":  {{Name: "Logs", URL: "javascript:alert(1)"}},
		"long address": {{Name: "Logs", URL: "https://example.com/" + strings.Repeat("x", 4096)}},
		"too many":     make([]Link, 9),
	} {
		t.Run(name, func(t *testing.T) {
			if err := ValidateLinks(links); err == nil {
				t.Error("expected invalid secondary links to be refused")
			}
		})
	}
}

func TestEqualIncludesSecondaryLinks(t *testing.T) {
	a := Tile{ID: "x", Links: []Link{{Name: "Docs", URL: "https://docs.example.com"}}}
	b := Tile{ID: "x", Links: []Link{{Name: "Docs", URL: "https://docs.example.com"}}}
	if !Equal(a, b) {
		t.Fatal("equal links should produce equal tiles")
	}
	b.Links[0].URL = "https://other.example.com"
	if Equal(a, b) {
		t.Error("a secondary destination change must produce a tile update")
	}
	b.Links = nil
	if Equal(a, b) {
		t.Error("removing secondary links must produce a tile update")
	}
}
