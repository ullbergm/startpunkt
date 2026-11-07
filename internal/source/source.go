// Package source turns Kubernetes objects into tiles. Each supported resource
// type has one adapter behind the Source interface.
package source

import (
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// Source converts objects of one resource type into tiles.
type Source interface {
	// Group is the API group of the watched type, empty for the core group.
	Group() string
	// Resource is the plural resource name of the watched type.
	Resource() string
	// Versions lists the versions this source can read, most preferred
	// first. The newest one the API server serves is watched.
	Versions() []string
	// Tiles returns the tiles for one object. It fills the display fields
	// and the kind; identity, cluster and source are set by the caller. An
	// object that yields no tiles is not an error.
	Tiles(obj *unstructured.Unstructured) ([]tile.Tile, error)
}

// Type returns the version-independent name of a source's resource type, as
// used in tile ids.
func Type(s Source) string {
	if s.Group() == "" {
		return s.Resource()
	}
	return s.Resource() + "." + s.Group()
}

// Builtin returns the adapters compiled into the binary.
func Builtin() []Source {
	return []Source{Application{}, Bookmark{}}
}

// splitTags parses a comma-separated tag list into trimmed, lower-case,
// de-duplicated tags. It never returns nil, so the JSON form is always a list.
func splitTags(s string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, part := range strings.Split(s, ",") {
		tag := strings.ToLower(strings.TrimSpace(part))
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		out = append(out, tag)
	}
	return out
}

// appendRootPath joins a root path onto a URL with exactly one slash between
// them.
func appendRootPath(url, rootPath string) string {
	rootPath = strings.TrimSpace(rootPath)
	if url == "" || rootPath == "" {
		return url
	}
	return strings.TrimRight(url, "/") + "/" + strings.TrimLeft(rootPath, "/")
}

// location maps an unset sort position to the default.
func location(n, def int) int {
	if n == 0 {
		return def
	}
	return n
}
