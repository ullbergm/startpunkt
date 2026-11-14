package v1

import (
	"encoding/json"
	"fmt"
	"time"
)

// The settings of an instance. They are the spec of the Startpunkt resource
// and, with the same names, the sections of the configuration file.

// NamespaceSelector chooses the namespaces resources are read from.
type NamespaceSelector struct {
	// Any reads every namespace. It must be false for MatchNames to apply.
	// Environment: STARTPUNKT_NAMESPACESELECTOR_ANY.
	Any bool `json:"any"`
	// MatchNames lists the namespaces to read when Any is false.
	// Environment: STARTPUNKT_NAMESPACESELECTOR_MATCHNAMES, comma-separated.
	MatchNames []string `json:"matchNames"`
}

// Namespaces returns the namespaces to watch, or nil for all of them.
func (n NamespaceSelector) Namespaces() []string {
	if n.Any {
		return nil
	}
	return n.MatchNames
}

// Sources configures the resource types tiles are built from. The
// environment variable of a setting is STARTPUNKT_SOURCES_<SOURCE>_<SETTING>
// in upper case, for example STARTPUNKT_SOURCES_INGRESS_ONLYANNOTATED.
type Sources struct {
	// Presets enables ready-made CEL mappings by name: traefik and contour.
	// Each reads only resources annotated startpunkt.ullberg.us/enable: "true".
	// Environment: STARTPUNKT_SOURCES_PRESETS, comma-separated.
	// +optional
	// +listType=set
	// +kubebuilder:validation:items:Enum=traefik;contour
	Presets        []string      `json:"presets,omitempty"`
	Application    Source        `json:"application"`
	Bookmark       Source        `json:"bookmark"`
	Route          Annotated     `json:"route"`
	Ingress        IngressSource `json:"ingress"`
	HTTPRoute      RoutedSource  `json:"httpRoute"`
	VirtualService RoutedSource  `json:"virtualService"`
	// Custom adds resource types that have no source of their own. In the
	// environment the list is JSON, in STARTPUNKT_SOURCES_CUSTOM.
	// +optional
	// +listType=map
	// +listMapKey=name
	Custom []CustomSource `json:"custom,omitempty"`
}

// CustomSource makes tiles from a resource type that Startpunkt has no
// source for, such as a Traefik IngressRoute. An expression says where an
// object is served; everything else works as for the built-in sources: the
// startpunkt.ullberg.us annotations name the tile, group it and can hide
// it.
//
// Expressions are written in CEL. The object is available as "object".
type CustomSource struct {
	// Name of the mapping, for messages. Unique among the custom sources.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Name string `json:"name"`
	// APIGroup of the resource type, empty for the core group.
	APIGroup string `json:"apiGroup,omitempty"`
	// Version of the resource type to read, for example v1alpha1.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Version string `json:"version"`
	// Resource is the plural, lower-case name of the resource type, as in
	// "kubectl get <resource>", for example ingressroutes. The type has to
	// be namespaced.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	Resource string `json:"resource"`
	// OnlyAnnotated limits the source to objects annotated with
	// startpunkt.ullberg.us/enable: "true". It is on unless set to false.
	OnlyAnnotated *bool `json:"onlyAnnotated,omitempty"`
	// DefaultProtocol is http or https, used for a host that the url
	// expression returns without a scheme, unless the object sets the
	// protocol annotation. The default is http.
	// +kubebuilder:validation:Enum=http;https
	DefaultProtocol string `json:"defaultProtocol,omitempty"`
	// URL is an expression for where the object is served: a string or a
	// list of strings, each an address with its scheme or a bare host
	// name. One tile is made for each.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	URL string `json:"url"`
	// TileName, TileGroup, Icon and Info are expressions for what the tile
	// shows when the object has no annotation for it. Without them the
	// name is the object's name and the group its namespace.
	TileName  string `json:"tileName,omitempty"`
	TileGroup string `json:"tileGroup,omitempty"`
	Icon      string `json:"icon,omitempty"`
	Info      string `json:"info,omitempty"`
}

// Source turns a source on or off.
type Source struct {
	Enabled bool `json:"enabled"`
}

// Annotated is a source whose objects are published with annotations.
type Annotated struct {
	Enabled bool `json:"enabled"`
	// OnlyAnnotated limits the source to objects annotated with
	// startpunkt.ullberg.us/enable: "true".
	OnlyAnnotated bool `json:"onlyAnnotated"`
}

// IngressSource configures the Ingress source.
type IngressSource struct {
	Annotated `json:",inline"`
	// ClassNames limits the source to these ingress classes; empty means
	// all. In the environment the list is comma-separated.
	ClassNames []string `json:"classNames"`
	// IncludeUnclassified keeps Ingresses without a class when ClassNames
	// is set.
	IncludeUnclassified bool `json:"includeUnclassified"`
}

// RoutedSource is a source whose objects do not say whether they are served
// over TLS.
type RoutedSource struct {
	Annotated `json:",inline"`
	// DefaultProtocol is http or https. It is used when an object does not
	// set the protocol annotation.
	DefaultProtocol string `json:"defaultProtocol"`
}

// Duration is a time.Duration written as a string such as "60s" or "5m".
// +kubebuilder:validation:Type=string
type Duration time.Duration

// UnmarshalJSON implements json.Unmarshaler. The YAML file is decoded as
// JSON, so this covers it too.
func (d *Duration) UnmarshalJSON(data []byte) error {
	var text string
	if err := json.Unmarshal(data, &text); err != nil {
		return fmt.Errorf("a duration must be a string such as \"60s\": %w", err)
	}
	parsed, err := time.ParseDuration(text)
	if err != nil {
		return err
	}
	*d = Duration(parsed)
	return nil
}

// MarshalJSON implements json.Marshaler.
func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

// Availability configures the probing of the local cluster's tiles. The
// environment variable of a setting is STARTPUNKT_AVAILABILITY_<SETTING> in
// upper case.
type Availability struct {
	// Enabled turns probing on. When it is off, tiles carry no
	// availability at all.
	Enabled bool `json:"enabled"`
	// Interval is the time between probes of a URL that answers.
	Interval Duration `json:"interval"`
	// Timeout bounds a single probe.
	Timeout Duration `json:"timeout"`
	// InitialBackoff is the wait after a first failure. It doubles with
	// each further failure up to MaxBackoff.
	InitialBackoff Duration `json:"initialBackoff"`
	MaxBackoff     Duration `json:"maxBackoff"`
	// Concurrency is the number of probes that may run at once.
	Concurrency int `json:"concurrency"`
	// InsecureSkipVerify accepts any TLS certificate. Use it when the
	// applications use certificates the controller cannot verify.
	InsecureSkipVerify bool `json:"insecureSkipVerify"`
}

// StatusSettings configures what is written back to the cluster.
type StatusSettings struct {
	// Enabled writes the resolved URL, the availability and conditions to
	// the status of Application resources.
	// Environment: STARTPUNKT_STATUS_ENABLED.
	Enabled bool `json:"enabled"`
}

// Icons configures where icons come from.
type Icons struct {
	// Source is the base URL of the Iconify API that icons are fetched
	// from, once each. The default is the public one. Point it at an
	// Iconify API of your own to depend on nothing outside the cluster.
	// Environment: STARTPUNKT_ICONS_SOURCE.
	Source string `json:"source"`
}

// Selector describes a set of tiles. A tile is in the set when every field
// that is given matches it.
type Selector struct {
	// Names and Groups are patterns, where "*" stands for any text and "?"
	// for one character. Case is ignored.
	Names  []string `json:"names,omitempty"`
	Groups []string `json:"groups,omitempty"`
	// Tags match a tile that carries at least one of them.
	Tags []string `json:"tags,omitempty"`
	// Kinds are "application" and "bookmark".
	Kinds []string `json:"kinds,omitempty"`
}

// Cluster describes the cluster this instance runs in.
type Cluster struct {
	// Name identifies this instance's tiles. It is part of every tile id.
	// Environment: STARTPUNKT_CLUSTER_NAME.
	Name string `json:"name"`
}

// Web holds settings passed on to the frontend. The environment variable of
// a setting is STARTPUNKT_WEB_<SETTING> in upper case, and
// STARTPUNKT_WEB_THEME_<LIGHT|DARK>_<COLOR> for the palettes.
type Web struct {
	// Title of the page.
	Title string `json:"title"`
	// DefaultLanguage is used for a visitor who has not chosen a language
	// and whose browser asks for none that is available, for example en-US.
	DefaultLanguage string `json:"defaultLanguage"`
	// SearchEngine is the URL a web search from the search box is sent to,
	// with the query appended.
	SearchEngine string `json:"searchEngine"`
	// CheckForUpdates asks GitHub now and then whether a newer release of
	// Startpunkt exists, and tells visitors in the corner of the page when one does.
	CheckForUpdates bool `json:"checkForUpdates"`
	// GitHubLink shows the footer of the page, which names the running
	// version and links to the project on GitHub and to its author.
	GitHubLink bool `json:"githubLink"`
	// ShowAllClusters makes a visitor who has not chosen see the tiles of
	// every cluster. Without it they see this cluster's only, and switch
	// others on themselves.
	ShowAllClusters bool `json:"showAllClusters"`
	// Theme holds the colours of the light and the dark appearance.
	Theme Theme `json:"theme"`
	// DefaultPreferences are the settings of the page for a browser that
	// has none of its own yet, and what "Reset to defaults" goes back to.
	// They have the form the page keeps them in, for example
	// {"theme": "dark", "layout": {"columns": 4, "showTags": true},
	// "background": {"type": "gradient"}}. The page checks every value and
	// uses its own default for one that does not fit or is left out.
	// Environment: STARTPUNKT_WEB_DEFAULTPREFERENCES, as JSON.
	// +optional
	// +kubebuilder:validation:Schemaless
	// +kubebuilder:validation:Type=object
	// +kubebuilder:pruning:PreserveUnknownFields
	DefaultPreferences json.RawMessage `json:"defaultPreferences,omitempty"`
}

// Theme is the pair of palettes the page switches between.
type Theme struct {
	Light Palette `json:"light"`
	Dark  Palette `json:"dark"`
}

// Palette has the colour names of 4.x, so an existing theme carries over.
type Palette struct {
	// BodyBgColor is the page background.
	BodyBgColor string `json:"bodyBgColor"`
	// BodyColor is group headings, icons without a colour of their own, and
	// other secondary text.
	BodyColor string `json:"bodyColor"`
	// EmphasisColor is headings and other prominent text.
	EmphasisColor string `json:"emphasisColor"`
	// TextPrimaryColor is tile names.
	TextPrimaryColor string `json:"textPrimaryColor"`
	// TextAccentColor is descriptions, focus rings and highlights.
	TextAccentColor string `json:"textAccentColor"`
}
