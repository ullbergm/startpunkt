// Package tile defines the normalized item shown on the start page.
package tile

import (
	"strconv"
	"strings"
	"time"
)

// Kind distinguishes applications from bookmarks.
type Kind string

// Tile kinds.
const (
	KindApplication Kind = "application"
	KindBookmark    Kind = "bookmark"
)

// Source identifies the object a tile was derived from.
type Source struct {
	// Type is the resource type as "<plural>.<group>", or "<plural>" for the
	// core group. It does not include the version, so tile ids stay the same
	// when the watched version changes.
	Type      string `json:"type"`
	Kind      string `json:"kind,omitempty"`
	Version   string `json:"version"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

// Link is a named secondary HTTP or HTTPS address on a tile.
type Link struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// Workload is readiness of the Deployments or StatefulSets behind a tile.
// It is separate from whether the HTTP address answers.
type Workload struct {
	State   string `json:"state"`
	Ready   int64  `json:"ready"`
	Desired int64  `json:"desired"`
}

// WorkloadRef is an internal dependency, filled from a source object. It
// never leaves the controller over JSON; the resulting readiness does.
type WorkloadRef struct {
	Resource  string
	Namespace string
	Name      string
}

// Tile is one application or bookmark. It is the unit held by the store and
// sent to clients, and its JSON form is part of the versioned API.
type Tile struct {
	ID           string        `json:"id"`
	Kind         Kind          `json:"kind"`
	Cluster      string        `json:"cluster"`
	Name         string        `json:"name"`
	Group        string        `json:"group"`
	URL          string        `json:"url"`
	Icon         string        `json:"icon,omitempty"`
	IconColor    string        `json:"iconColor,omitempty"`
	Info         string        `json:"info,omitempty"`
	Links        []Link        `json:"links,omitempty"`
	ConsoleURL   string        `json:"consoleURL,omitempty"`
	Workload     *Workload     `json:"workload,omitempty"`
	WorkloadRefs []WorkloadRef `json:"-"`
	TargetBlank  bool          `json:"targetBlank"`
	Location     int           `json:"location"`
	Tags         []string      `json:"tags"`
	Source       Source        `json:"source"`
	Editable     bool          `json:"editable"`
	Available    *bool         `json:"available,omitempty"`
	// LastProbe is the probe that established Available, not the latest
	// check. Repeated checks with the same result do not change it.
	LastProbe *time.Time `json:"lastProbe,omitempty"`
}

// ID builds the stable identity of a tile. The index distinguishes several
// tiles derived from one object and is omitted for the first.
func ID(cluster string, src Source, index int) string {
	id := strings.Join([]string{cluster, src.Type, src.Namespace, src.Name}, "/")
	if index > 0 {
		id += "/" + strconv.Itoa(index)
	}
	return id
}

// Equal reports whether two tiles are identical in every field.
func Equal(a, b Tile) bool {
	if a.ID != b.ID || a.Kind != b.Kind || a.Cluster != b.Cluster || a.Name != b.Name ||
		a.Group != b.Group || a.URL != b.URL || a.Icon != b.Icon ||
		a.IconColor != b.IconColor || a.Info != b.Info || a.TargetBlank != b.TargetBlank ||
		a.Location != b.Location || a.Source != b.Source || a.Editable != b.Editable || a.ConsoleURL != b.ConsoleURL {
		return false
	}
	if (a.Workload == nil) != (b.Workload == nil) || (a.Workload != nil && *a.Workload != *b.Workload) {
		return false
	}
	if !SameWorkloadRefs(a.WorkloadRefs, b.WorkloadRefs) {
		return false
	}
	if len(a.Links) != len(b.Links) {
		return false
	}
	for i := range a.Links {
		if a.Links[i] != b.Links[i] {
			return false
		}
	}
	if len(a.Tags) != len(b.Tags) {
		return false
	}
	for i := range a.Tags {
		if a.Tags[i] != b.Tags[i] {
			return false
		}
	}
	if (a.Available == nil) != (b.Available == nil) ||
		(a.Available != nil && *a.Available != *b.Available) {
		return false
	}
	if (a.LastProbe == nil) != (b.LastProbe == nil) ||
		(a.LastProbe != nil && !a.LastProbe.Equal(*b.LastProbe)) {
		return false
	}
	return true
}

// Less orders tiles for display: by location, then name, then id.
func Less(a, b Tile) bool {
	if a.Location != b.Location {
		return a.Location < b.Location
	}
	if an, bn := strings.ToLower(a.Name), strings.ToLower(b.Name); an != bn {
		return an < bn
	}
	return a.ID < b.ID
}

// SameWorkloadRefs reports whether internal dependencies are unchanged.
func SameWorkloadRefs(a, b []WorkloadRef) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
