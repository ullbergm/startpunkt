package source

import (
	"fmt"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/tile"
)

var startpunktVersions = []string{apiv1.Version, apiv1.FallbackVersion}

// spec decodes the spec of a custom resource into out.
func spec(obj *unstructured.Unstructured, out any) error {
	raw, found, err := unstructured.NestedMap(obj.Object, "spec")
	if err != nil {
		return fmt.Errorf("reading spec: %w", err)
	}
	if !found {
		return fmt.Errorf("object has no spec")
	}
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(raw, out); err != nil {
		return fmt.Errorf("decoding spec: %w", err)
	}
	return nil
}

// Application is the adapter for the Startpunkt Application resource.
type Application struct{}

// Group implements Source.
func (Application) Group() string { return apiv1.Group }

// Resource implements Source.
func (Application) Resource() string { return apiv1.ApplicationResource }

// Versions implements Source.
func (Application) Versions() []string { return startpunktVersions }

// Tiles implements Source.
func (Application) Tiles(obj *unstructured.Unstructured, lookup Lookup) ([]tile.Tile, error) {
	var s apiv1.ApplicationSpec
	if err := spec(obj, &s); err != nil {
		return nil, err
	}
	if s.Enabled != nil && !*s.Enabled {
		return nil, nil
	}
	if strings.TrimSpace(s.Name) == "" {
		return nil, fmt.Errorf("spec.name is empty")
	}
	url := strings.TrimSpace(s.URL)
	if s.URLFrom != nil {
		// As in 4.x, a reference that resolves wins over spec.url, and
		// spec.url is the fallback when it does not.
		resolved, err := resolveURLFrom(obj, s.URLFrom, lookup)
		switch {
		case err == nil:
			url = resolved
		case url == "":
			return nil, fmt.Errorf("urlFrom: %w", err)
		}
	}
	if url == "" {
		return nil, nil
	}
	group := strings.TrimSpace(s.Group)
	if group == "" {
		group = obj.GetNamespace()
	}
	// The rootPath and tags annotations are fallbacks for the spec fields.
	ann := obj.GetAnnotations()
	rootPath := s.RootPath
	if strings.TrimSpace(rootPath) == "" {
		rootPath = ann[annRootPath]
	}
	tags := s.Tags
	if strings.TrimSpace(tags) == "" {
		tags = ann[annTags]
	}
	return []tile.Tile{{
		Kind:        tile.KindApplication,
		Name:        s.Name,
		Group:       strings.ToLower(group),
		URL:         appendRootPath(url, rootPath),
		Icon:        s.Icon,
		IconColor:   s.IconColor,
		Info:        s.Info,
		TargetBlank: s.TargetBlank != nil && *s.TargetBlank,
		Location:    location(s.Location, apiv1.DefaultLocation),
		Tags:        splitTags(tags),
		Editable:    true,
	}}, nil
}

// Bookmark is the adapter for the Startpunkt Bookmark resource.
type Bookmark struct{}

// Group implements Source.
func (Bookmark) Group() string { return apiv1.Group }

// Resource implements Source.
func (Bookmark) Resource() string { return apiv1.BookmarkResource }

// Versions implements Source.
func (Bookmark) Versions() []string { return startpunktVersions }

// Tiles implements Source.
func (Bookmark) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	var s apiv1.BookmarkSpec
	if err := spec(obj, &s); err != nil {
		return nil, err
	}
	if strings.TrimSpace(s.Name) == "" {
		return nil, fmt.Errorf("spec.name is empty")
	}
	url := strings.TrimSpace(s.URL)
	if url == "" {
		return nil, fmt.Errorf("spec.url is empty")
	}
	group := strings.TrimSpace(s.Group)
	if group == "" {
		group = obj.GetNamespace()
	}
	return []tile.Tile{{
		Kind:        tile.KindBookmark,
		Name:        s.Name,
		Group:       strings.ToLower(group),
		URL:         url,
		Icon:        s.Icon,
		Info:        s.Info,
		TargetBlank: s.TargetBlank != nil && *s.TargetBlank,
		Location:    location(s.Location, apiv1.DefaultLocation),
		Tags:        []string{},
		Editable:    true,
	}}, nil
}
