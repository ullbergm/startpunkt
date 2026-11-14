package tile

import (
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
