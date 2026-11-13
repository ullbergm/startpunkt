// Package startpunkt holds what is embedded from the root of the repository.
package startpunkt

import _ "embed"

// Changelog is CHANGELOG.md as it was when the binary was built. A release
// is built from the commit that adds its entry, so the running version is
// in it.
//
//go:embed CHANGELOG.md
var Changelog string
