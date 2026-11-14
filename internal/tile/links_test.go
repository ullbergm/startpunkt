package tile

import (
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
