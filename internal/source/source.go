// Package source turns Kubernetes objects into tiles. Each supported resource
// type has one adapter behind the Source interface.
package source

import (
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// Ref names another object that a tile's content is read from.
type Ref struct {
	// APIVersion is "group/version", or "version" for the core group.
	APIVersion string
	Kind       string
	Namespace  string
	Name       string
}

// Lookup returns the object a Ref points at, or nil when it does not exist.
// The caller of Tiles watches every object that was looked up and converts
// the source object again when one of them changes.
type Lookup func(Ref) (*unstructured.Unstructured, error)

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
	Tiles(obj *unstructured.Unstructured, lookup Lookup) ([]tile.Tile, error)
}

// Type returns the version-independent name of a source's resource type, as
// used in tile ids.
func Type(s Source) string {
	if s.Group() == "" {
		return s.Resource()
	}
	return s.Resource() + "." + s.Group()
}

// Options selects and configures the built-in adapters.
type Options struct {
	Application    Toggle
	Bookmark       Toggle
	Route          Annotated
	Ingress        IngressOptions
	HTTPRoute      Routed
	VirtualService Routed
}

// Toggle turns a source on or off.
type Toggle struct {
	Enabled bool
}

// Annotated configures a source whose objects are published with
// annotations.
type Annotated struct {
	Enabled bool
	// OnlyAnnotated limits the source to objects that carry the annotation
	// startpunkt.ullberg.us/enable: "true".
	OnlyAnnotated bool
}

// IngressOptions configures the Ingress source.
type IngressOptions struct {
	Annotated
	// ClassNames limits the source to these ingress classes. Empty means
	// every class.
	ClassNames []string
	// IncludeUnclassified keeps Ingresses without a class when ClassNames
	// is set.
	IncludeUnclassified bool
}

// Routed configures a source whose objects do not say whether they are
// served over TLS.
type Routed struct {
	Annotated
	// DefaultProtocol is the URL scheme used when the object does not set
	// one with the protocol annotation.
	DefaultProtocol string
}

// DefaultOptions enables every source the way 4.x does: custom resources
// always, other types only when annotated.
func DefaultOptions() Options {
	annotated := Annotated{Enabled: true, OnlyAnnotated: true}
	return Options{
		Application:    Toggle{Enabled: true},
		Bookmark:       Toggle{Enabled: true},
		Route:          annotated,
		Ingress:        IngressOptions{Annotated: annotated, IncludeUnclassified: true},
		HTTPRoute:      Routed{Annotated: annotated, DefaultProtocol: "http"},
		VirtualService: Routed{Annotated: annotated, DefaultProtocol: "http"},
	}
}

// Builtin returns the enabled adapters compiled into the binary.
func Builtin(o Options) []Source {
	var out []Source
	if o.Application.Enabled {
		out = append(out, Application{})
	}
	if o.Bookmark.Enabled {
		out = append(out, Bookmark{})
	}
	if o.Route.Enabled {
		out = append(out, Route{Options: o.Route})
	}
	if o.Ingress.Enabled {
		out = append(out, Ingress{Options: o.Ingress})
	}
	if o.HTTPRoute.Enabled {
		out = append(out, HTTPRoute{Options: o.HTTPRoute})
	}
	if o.VirtualService.Enabled {
		out = append(out, VirtualService{Options: o.VirtualService})
	}
	return out
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
