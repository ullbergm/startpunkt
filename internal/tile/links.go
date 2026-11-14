package tile

import (
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"unicode"
)

// ValidURL reports whether an address is an absolute HTTP or HTTPS URL.
// Cluster links may name private hosts, but must not invoke another scheme.
func ValidURL(address string) bool {
	address = strings.TrimSpace(address)
	if address == "" || strings.ContainsAny(address, "\\") || strings.ContainsFunc(address, unicode.IsControl) {
		return false
	}
	u, err := url.Parse(address)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || strings.ContainsFunc(u.Hostname(), unicode.IsSpace) {
		return false
	}
	if strings.HasSuffix(u.Host, ":") {
		return false
	}
	if strings.HasPrefix(u.Host, "[") {
		// Brackets denote an IPv6 literal, optionally with a zone.
		host, _, _ := strings.Cut(u.Hostname(), "%")
		if !strings.Contains(host, ":") || net.ParseIP(host) == nil {
			return false
		}
	} else if strings.Count(u.Host, ":") > 1 {
		return false
	}
	if port := u.Port(); port != "" {
		n, err := strconv.Atoi(port)
		if err != nil || n < 1 || n > 65535 {
			return false
		}
	}
	return true
}

// ValidateLinks applies the same limits to local and remote secondary links.
func ValidateLinks(links []Link) error {
	if len(links) > 8 {
		return fmt.Errorf("links may contain at most 8 entries")
	}
	for i, link := range links {
		if strings.TrimSpace(link.Name) == "" || len(link.Name) > 80 {
			return fmt.Errorf("links[%d].name must contain 1 to 80 bytes", i)
		}
		if len(link.URL) > 4096 || !ValidURL(link.URL) {
			return fmt.Errorf("links[%d].url must be an http or https address of at most 4096 bytes", i)
		}
	}
	return nil
}
