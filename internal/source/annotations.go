package source

import (
	"fmt"
	"strconv"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// Annotations that publish an object as an application. All of them start
// with AnnotationPrefix.
const (
	AnnotationPrefix = apiv1.Group + "/"

	annEnable      = AnnotationPrefix + "enable"
	annAppName     = AnnotationPrefix + "appName"
	annGroup       = AnnotationPrefix + "group"
	annIcon        = AnnotationPrefix + "icon"
	annIconColor   = AnnotationPrefix + "iconColor"
	annInfo        = AnnotationPrefix + "info"
	annLocation    = AnnotationPrefix + "location"
	annPort        = AnnotationPrefix + "port"
	annProtocol    = AnnotationPrefix + "protocol"
	annRootPath    = AnnotationPrefix + "rootPath"
	annTags        = AnnotationPrefix + "tags"
	annTargetBlank = AnnotationPrefix + "targetBlank"
	annURL         = AnnotationPrefix + "url"
	annLinks       = AnnotationPrefix + "links"
)

// endpoint is one place an object is served at, before annotations are
// applied to it.
type endpoint struct {
	host string
	path string
	// tls is whether the object itself says the host is served over TLS.
	// It is nil when the object cannot tell.
	tls *bool
	// url, when set, is the whole address and the other fields are not
	// used. The protocol and port annotations do not apply to it.
	url string
}

// display is what a tile shows when the object has no annotation for it.
// An empty field means the usual fallback: the object's name, its
// namespace, or nothing.
type display struct {
	name, group, icon, info string
}

// annotatedTiles builds the tiles of an object that is published through
// annotations. The endpoints come from the object's own spec; the url
// annotation replaces all of them with a single one.
//
// The result is one tile per endpoint, all sharing the display fields.
func annotatedTiles(
	obj *unstructured.Unstructured, o Annotated, defaultProtocol string, endpoints []endpoint,
) ([]tile.Tile, error) {
	return annotatedTilesWith(obj, o, defaultProtocol, endpoints, func() (display, error) { return display{}, nil })
}

// annotatedTilesWith is annotatedTiles with fallbacks for the display
// fields. They are only asked for when the object is going to be shown.
func annotatedTilesWith(
	obj *unstructured.Unstructured, o Annotated, defaultProtocol string, endpoints []endpoint,
	fallbacks func() (display, error),
) ([]tile.Tile, error) {
	ann := obj.GetAnnotations()

	enable, hasEnable := ann[annEnable]
	enabled, err := strconv.ParseBool(strings.TrimSpace(enable))
	switch {
	case hasEnable && err != nil:
		return nil, fmt.Errorf("annotation %s: %q is not true or false", annEnable, enable)
	case hasEnable && !enabled:
		return nil, nil
	case !hasEnable && o.OnlyAnnotated:
		return nil, nil
	}

	var urls []string
	if u := strings.TrimSpace(ann[annURL]); u != "" {
		urls = []string{u}
	} else {
		port, err := portAnnotation(ann)
		if err != nil {
			return nil, err
		}
		protocol := strings.TrimSuffix(strings.TrimSpace(ann[annProtocol]), "://")
		seen := map[string]bool{}
		for _, e := range endpoints {
			if e.url != "" {
				if !seen[e.url] {
					seen[e.url] = true
					urls = append(urls, e.url)
				}
				continue
			}
			if e.host == "" || strings.Contains(e.host, "*") {
				// A wildcard names no single place to link to.
				continue
			}
			scheme := protocol
			if scheme == "" {
				switch {
				case e.tls == nil:
					scheme = defaultProtocol
				case *e.tls:
					scheme = "https"
				default:
					scheme = "http"
				}
			}
			u := buildURL(scheme, e.host, port, e.path)
			if !seen[u] {
				seen[u] = true
				urls = append(urls, u)
			}
		}
	}
	if len(urls) == 0 {
		return nil, nil
	}

	fallback, err := fallbacks()
	if err != nil {
		return nil, err
	}
	first := func(values ...string) string {
		for _, v := range values {
			if v = strings.TrimSpace(v); v != "" {
				return v
			}
		}
		return ""
	}
	name := first(ann[annAppName], fallback.name, obj.GetName())
	group := first(ann[annGroup], fallback.group, obj.GetNamespace())
	info := ann[annInfo]
	if strings.TrimSpace(info) == "" {
		info = fallback.info
	}
	loc := 0
	if v, ok := ann[annLocation]; ok {
		if loc, err = strconv.Atoi(strings.TrimSpace(v)); err != nil {
			return nil, fmt.Errorf("annotation %s: %q is not a number", annLocation, v)
		}
	}
	targetBlank := false
	if v, ok := ann[annTargetBlank]; ok {
		if targetBlank, err = strconv.ParseBool(strings.TrimSpace(v)); err != nil {
			return nil, fmt.Errorf("annotation %s: %q is not true or false", annTargetBlank, v)
		}
	}

	links, err := secondaryLinks(nil, ann)
	if err != nil {
		return nil, err
	}
	tiles := make([]tile.Tile, 0, len(urls))
	for _, u := range urls {
		u = appendRootPath(u, ann[annRootPath])
		if !tile.ValidURL(u) {
			return nil, fmt.Errorf("url must be an http or https address")
		}
		tiles = append(tiles, tile.Tile{
			Kind:        tile.KindApplication,
			Name:        name,
			Group:       strings.ToLower(group),
			URL:         u,
			Icon:        first(ann[annIcon], fallback.icon),
			IconColor:   strings.TrimSpace(ann[annIconColor]),
			Info:        info,
			Links:       links,
			TargetBlank: targetBlank,
			Location:    location(loc, apiv1.DefaultLocation),
			Tags:        splitTags(ann[annTags]),
		})
	}
	return tiles, nil
}

// portAnnotation returns the port override, or 0 when there is none.
func portAnnotation(ann map[string]string) (int, error) {
	v, ok := ann[annPort]
	if !ok {
		return 0, nil
	}
	port, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || port < 1 || port > 65535 {
		return 0, fmt.Errorf("annotation %s: %q is not a port between 1 and 65535", annPort, v)
	}
	return port, nil
}

// buildURL assembles a URL, leaving out the port when it is the default of
// the scheme.
func buildURL(scheme, host string, port int, path string) string {
	if scheme == "" {
		scheme = "http"
	}
	var b strings.Builder
	b.WriteString(scheme)
	b.WriteString("://")
	b.WriteString(host)
	standard := (strings.EqualFold(scheme, "http") && port == 80) ||
		(strings.EqualFold(scheme, "https") && port == 443)
	if port != 0 && !standard {
		b.WriteByte(':')
		b.WriteString(strconv.Itoa(port))
	}
	if path != "" {
		if !strings.HasPrefix(path, "/") {
			b.WriteByte('/')
		}
		b.WriteString(path)
	}
	return b.String()
}

func boolPtr(b bool) *bool { return &b }

// stringList reads a list of strings from an object, ignoring other values.
func stringList(obj *unstructured.Unstructured, fields ...string) []string {
	list, _, _ := unstructured.NestedStringSlice(obj.Object, fields...)
	return list
}
