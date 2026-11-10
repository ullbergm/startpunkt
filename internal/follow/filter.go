package follow

import (
	"fmt"
	"path"
	"slices"
	"strings"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// Selector describes a set of tiles. A field that is empty says nothing; a
// tile is in the set when every field that is given matches it.
type Selector struct {
	// Names are patterns for the tile's name, such as "grafana" or "home*".
	// A "*" stands for any text and "?" for one character. Case is ignored.
	Names []string `json:"names,omitempty"`
	// Groups are patterns for the tile's group, written the same way.
	Groups []string `json:"groups,omitempty"`
	// Tags match a tile that carries at least one of them.
	Tags []string `json:"tags,omitempty"`
	// Kinds are "application" and "bookmark".
	Kinds []string `json:"kinds,omitempty"`
}

// Filter chooses which of a remote's tiles are taken over.
type Filter struct {
	// Include, when it says anything, limits the import to the tiles it
	// describes.
	Include Selector `json:"include"`
	// Exclude leaves out the tiles it describes, also among the included.
	Exclude Selector `json:"exclude"`
}

func (s Selector) empty() bool {
	return len(s.Names) == 0 && len(s.Groups) == 0 && len(s.Tags) == 0 && len(s.Kinds) == 0
}

// Validate reports patterns that cannot be read and kinds that do not exist.
func (s Selector) Validate() error {
	for _, pattern := range append(slices.Clone(s.Names), s.Groups...) {
		if _, err := path.Match(strings.ToLower(pattern), ""); err != nil {
			return fmt.Errorf("pattern %q: %w", pattern, err)
		}
	}
	for _, kind := range s.Kinds {
		if kind != string(tile.KindApplication) && kind != string(tile.KindBookmark) {
			return fmt.Errorf("kind %q is not application or bookmark", kind)
		}
	}
	return nil
}

// Validate checks both selectors.
func (f Filter) Validate() error {
	if err := f.Include.Validate(); err != nil {
		return fmt.Errorf("include: %w", err)
	}
	if err := f.Exclude.Validate(); err != nil {
		return fmt.Errorf("exclude: %w", err)
	}
	return nil
}

func matchAny(patterns []string, value string) bool {
	value = strings.ToLower(value)
	for _, pattern := range patterns {
		if ok, _ := path.Match(strings.ToLower(pattern), value); ok {
			return true
		}
	}
	return false
}

func (s Selector) matches(t tile.Tile) bool {
	if len(s.Names) > 0 && !matchAny(s.Names, t.Name) {
		return false
	}
	if len(s.Groups) > 0 && !matchAny(s.Groups, t.Group) {
		return false
	}
	if len(s.Kinds) > 0 && !slices.Contains(s.Kinds, string(t.Kind)) {
		return false
	}
	if len(s.Tags) > 0 {
		found := false
		for _, tag := range s.Tags {
			if slices.Contains(t.Tags, strings.ToLower(strings.TrimSpace(tag))) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// Allows reports whether a tile is taken over.
func (f Filter) Allows(t tile.Tile) bool {
	if !f.Include.empty() && !f.Include.matches(t) {
		return false
	}
	return f.Exclude.empty() || !f.Exclude.matches(t)
}
