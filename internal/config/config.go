// Package config loads the process configuration: built-in defaults, then an
// optional YAML file, then environment variables. Every setting can be given
// through the environment alone.
package config

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net"
	"net/url"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"sigs.k8s.io/yaml"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/tile"
)

var (
	languageTag = regexp.MustCompile(`^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$`)
	hexColor    = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)
)

// The settings themselves are defined with the custom resources, in api/v1,
// so that the configuration file, the environment and the Startpunkt
// resource share one definition.
type (
	NamespaceSelector = apiv1.NamespaceSelector
	Sources           = apiv1.Sources
	Source            = apiv1.Source
	Annotated         = apiv1.Annotated
	IngressSource     = apiv1.IngressSource
	RoutedSource      = apiv1.RoutedSource
	Duration          = apiv1.Duration
	Availability      = apiv1.Availability
	Status            = apiv1.StatusSettings
	Icons             = apiv1.Icons
	Selector          = apiv1.Selector
	Cluster           = apiv1.Cluster
	Web               = apiv1.Web
	Theme             = apiv1.Theme
	Palette           = apiv1.Palette
	Workloads         = apiv1.Workloads
	LeaderElection    = apiv1.LeaderElection
)

// EnvPrefix starts the name of every environment variable read by Load.
const EnvPrefix = "STARTPUNKT_"

// Config is the full configuration.
type Config struct {
	Workloads         Workloads         `json:"workloads"`
	LeaderElection    LeaderElection    `json:"leaderElection"`
	Cluster           Cluster           `json:"cluster"`
	NamespaceSelector NamespaceSelector `json:"namespaceSelector"`
	Sources           Sources           `json:"sources"`
	Availability      Availability      `json:"availability"`
	Federation        Federation        `json:"federation"`
	Resources         Resources         `json:"resources"`
	Icons             Icons             `json:"icons"`
	Status            Status            `json:"status"`
	Server            Server            `json:"server"`
	Upstream          Upstream          `json:"upstream"`
	Web               Web               `json:"web"`
	Editing           Editing           `json:"editing"`
	Log               Log               `json:"log"`
}

// Editing configures changing Applications and Bookmarks from the page. It
// belongs to the process: the key is a secret and is never read from a
// resource.
type Editing struct {
	// Key is the edit key. Without one, editing is off. It comes from the
	// environment only, as STARTPUNKT_EDITING_KEY or, for a mounted Secret,
	// as the path of a file in STARTPUNKT_EDITING_KEYFILE. It is not read
	// from the configuration file and is left out wherever the
	// configuration is written.
	Key string `json:"-"`
	// Namespace is where the page creates resources. Empty means the
	// namespace the process runs in. Environment:
	// STARTPUNKT_EDITING_NAMESPACE.
	Namespace string `json:"namespace"`
}

// MinEditKeyLength is the shortest edit key that is accepted.
const MinEditKeyLength = 16

// Resources says which Startpunkt resource holds this instance's settings.
// It belongs to the process, like the listen address: it cannot itself come
// from that resource.
type Resources struct {
	// Name of the Startpunkt resource to read. Empty means settings come
	// from the environment and the file only.
	// Environment: STARTPUNKT_RESOURCES_NAME.
	Name string `json:"name"`
	// Namespace of that resource and of the Remote resources. Empty means
	// the namespace the process runs in.
	// Environment: STARTPUNKT_RESOURCES_NAMESPACE.
	Namespace string `json:"namespace"`
}

// Federation lists the other Startpunkt instances whose tiles this one
// shows next to its own. This instance subscribes to each of them; they need
// no configuration and do not know they are being read.
type Federation struct {
	// Remotes are the instances to subscribe to. In the environment the
	// list is JSON: STARTPUNKT_FEDERATION_REMOTES='[{"name":"prod","url":"https://start.prod.example.com"}]'.
	Remotes []Remote `json:"remotes"`
}

// maxDefaultPreferences bounds web.defaultPreferences, which is part of the
// document every browser is sent.
const maxDefaultPreferences = 32 << 10

// Remote is one other instance.
type Remote struct {
	// Name is the cluster name its tiles get here, whatever the remote
	// calls itself. It is part of their ids, so it must be unique and must
	// not change.
	Name string `json:"name"`
	// URL is the base URL of the remote, as a browser would open it.
	URL string `json:"url"`
	// Headers are sent with the request, for a remote behind an
	// authenticating proxy.
	Headers map[string]string `json:"headers,omitempty"`
	// InsecureSkipVerify accepts any TLS certificate from the remote, for
	// one whose certificate cannot be verified here.
	InsecureSkipVerify bool `json:"insecureSkipVerify,omitempty"`
	// Include, when set, limits what is taken from the remote to the tiles
	// it describes. Exclude leaves tiles out, also among the included.
	Include Selector `json:"include,omitempty"`
	Exclude Selector `json:"exclude,omitempty"`
}

// Upstream is where the api role reads its state from when the controller
// runs as a separate process.
type Upstream struct {
	// URL is the base URL of the controller, for example
	// http://startpunkt-controller:8080. Environment: STARTPUNKT_UPSTREAM_URL.
	URL string `json:"url"`
}

// Server configures the HTTP listener.
type Server struct {
	// Address to listen on. Environment: STARTPUNKT_SERVER_ADDRESS.
	Address string `json:"address"`
}

// Log configures logging.
type Log struct {
	// Level is debug, info, warn or error. Environment: STARTPUNKT_LOG_LEVEL.
	Level string `json:"level"`
	// Format is json or text. Environment: STARTPUNKT_LOG_FORMAT.
	Format string `json:"format"`
}

// Default returns the configuration used when nothing is set.
func Default() Config {
	return Config{
		Cluster:           Cluster{Name: "local"},
		NamespaceSelector: NamespaceSelector{Any: true},
		Sources: Sources{
			Application:    Source{Enabled: true},
			Bookmark:       Source{Enabled: true},
			Route:          Annotated{Enabled: true, OnlyAnnotated: true},
			Ingress:        IngressSource{Annotated: Annotated{Enabled: true, OnlyAnnotated: true}, IncludeUnclassified: true},
			HTTPRoute:      RoutedSource{Annotated: Annotated{Enabled: true, OnlyAnnotated: true}, DefaultProtocol: "http"},
			VirtualService: RoutedSource{Annotated: Annotated{Enabled: true, OnlyAnnotated: true}, DefaultProtocol: "http"},
		},
		Availability: Availability{
			Enabled:        true,
			Interval:       Duration(60 * time.Second),
			Timeout:        Duration(5 * time.Second),
			InitialBackoff: Duration(5 * time.Second),
			MaxBackoff:     Duration(5 * time.Minute),
			Concurrency:    8,
		},
		Status: Status{Enabled: true},
		Icons:  Icons{Source: "https://api.iconify.design"},
		Server: Server{Address: ":8080"},
		Web: Web{
			Title:           "Startpunkt",
			DefaultLanguage: "en-US",
			SearchEngine:    "https://www.google.com/search?q=",
			CheckForUpdates: true,
			GitHubLink:      true,
			Theme: Theme{
				Light: Palette{
					BodyBgColor: "#F8F6F1", BodyColor: "#696969", EmphasisColor: "#000000",
					TextPrimaryColor: "#4C432E", TextAccentColor: "#AA9A73",
				},
				Dark: Palette{
					BodyBgColor: "#232530", BodyColor: "#696969", EmphasisColor: "#FAB795",
					TextPrimaryColor: "#FAB795", TextAccentColor: "#E95678",
				},
			},
		},
		Log: Log{Level: "info", Format: "json"},
	}
}

// Load builds the configuration. An empty path means no file. A path that
// does not exist is an error only when required is true. getenv is
// os.Getenv outside of tests.
func Load(path string, required bool, getenv func(string) string) (Config, error) {
	cfg := Default()
	if path != "" {
		data, err := os.ReadFile(path)
		switch {
		case err == nil:
			if err := yaml.UnmarshalStrict(data, &cfg); err != nil {
				return cfg, fmt.Errorf("parsing %s: %w", path, err)
			}
		case errors.Is(err, fs.ErrNotExist) && !required:
		default:
			return cfg, fmt.Errorf("reading config: %w", err)
		}
	}
	if err := cfg.applyEnvironment(getenv); err != nil {
		return cfg, err
	}
	return cfg, cfg.Validate()
}

// applyEnvironment overrides settings with the environment variables that
// are set.
func (c *Config) applyEnvironment(getenv func(string) string) error {
	text := map[string]*string{
		"WORKLOADS_CONSOLEURL":                   &c.Workloads.ConsoleURL,
		"LEADERELECTION_LEASENAME":               &c.LeaderElection.LeaseName,
		"LEADERELECTION_NAMESPACE":               &c.LeaderElection.Namespace,
		"LEADERELECTION_IDENTITY":                &c.LeaderElection.Identity,
		"LEADERELECTION_ADVERTISEURL":            &c.LeaderElection.AdvertiseURL,
		"CLUSTER_NAME":                           &c.Cluster.Name,
		"SERVER_ADDRESS":                         &c.Server.Address,
		"UPSTREAM_URL":                           &c.Upstream.URL,
		"RESOURCES_NAME":                         &c.Resources.Name,
		"RESOURCES_NAMESPACE":                    &c.Resources.Namespace,
		"EDITING_NAMESPACE":                      &c.Editing.Namespace,
		"ICONS_SOURCE":                           &c.Icons.Source,
		"WEB_TITLE":                              &c.Web.Title,
		"WEB_DEFAULTLANGUAGE":                    &c.Web.DefaultLanguage,
		"WEB_SEARCHENGINE":                       &c.Web.SearchEngine,
		"LOG_LEVEL":                              &c.Log.Level,
		"LOG_FORMAT":                             &c.Log.Format,
		"SOURCES_HTTPROUTE_DEFAULTPROTOCOL":      &c.Sources.HTTPRoute.DefaultProtocol,
		"SOURCES_VIRTUALSERVICE_DEFAULTPROTOCOL": &c.Sources.VirtualService.DefaultProtocol,
	}
	flags := map[string]*bool{
		"WORKLOADS_ENABLED":                    &c.Workloads.Enabled,
		"LEADERELECTION_ENABLED":               &c.LeaderElection.Enabled,
		"NAMESPACESELECTOR_ANY":                &c.NamespaceSelector.Any,
		"AVAILABILITY_ENABLED":                 &c.Availability.Enabled,
		"AVAILABILITY_INSECURESKIPVERIFY":      &c.Availability.InsecureSkipVerify,
		"STATUS_ENABLED":                       &c.Status.Enabled,
		"WEB_CHECKFORUPDATES":                  &c.Web.CheckForUpdates,
		"WEB_GITHUBLINK":                       &c.Web.GitHubLink,
		"WEB_SHOWALLCLUSTERS":                  &c.Web.ShowAllClusters,
		"SOURCES_APPLICATION_ENABLED":          &c.Sources.Application.Enabled,
		"SOURCES_BOOKMARK_ENABLED":             &c.Sources.Bookmark.Enabled,
		"SOURCES_ROUTE_ENABLED":                &c.Sources.Route.Enabled,
		"SOURCES_ROUTE_ONLYANNOTATED":          &c.Sources.Route.OnlyAnnotated,
		"SOURCES_INGRESS_ENABLED":              &c.Sources.Ingress.Enabled,
		"SOURCES_INGRESS_ONLYANNOTATED":        &c.Sources.Ingress.OnlyAnnotated,
		"SOURCES_INGRESS_INCLUDEUNCLASSIFIED":  &c.Sources.Ingress.IncludeUnclassified,
		"SOURCES_HTTPROUTE_ENABLED":            &c.Sources.HTTPRoute.Enabled,
		"SOURCES_HTTPROUTE_ONLYANNOTATED":      &c.Sources.HTTPRoute.OnlyAnnotated,
		"SOURCES_VIRTUALSERVICE_ENABLED":       &c.Sources.VirtualService.Enabled,
		"SOURCES_VIRTUALSERVICE_ONLYANNOTATED": &c.Sources.VirtualService.OnlyAnnotated,
	}
	durations := map[string]*Duration{
		"AVAILABILITY_INTERVAL":       &c.Availability.Interval,
		"AVAILABILITY_TIMEOUT":        &c.Availability.Timeout,
		"AVAILABILITY_INITIALBACKOFF": &c.Availability.InitialBackoff,
		"AVAILABILITY_MAXBACKOFF":     &c.Availability.MaxBackoff,
	}
	for name, target := range durations {
		v := getenv(EnvPrefix + name)
		if v == "" {
			continue
		}
		parsed, err := time.ParseDuration(v)
		if err != nil {
			return fmt.Errorf("%s%s: %q is not a duration such as 60s", EnvPrefix, name, v)
		}
		*target = Duration(parsed)
	}
	if v := getenv(EnvPrefix + "AVAILABILITY_CONCURRENCY"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return fmt.Errorf("%sAVAILABILITY_CONCURRENCY: %q is not a number", EnvPrefix, v)
		}
		c.Availability.Concurrency = parsed
	}
	if v := getenv(EnvPrefix + "SOURCES_CUSTOM"); v != "" {
		var custom []apiv1.CustomSource
		if err := json.Unmarshal([]byte(v), &custom); err != nil {
			return fmt.Errorf("%sSOURCES_CUSTOM is not a JSON list of custom sources: %w", EnvPrefix, err)
		}
		c.Sources.Custom = custom
	}
	if v := getenv(EnvPrefix + "EDITING_KEY"); v != "" {
		c.Editing.Key = v
	} else if path := getenv(EnvPrefix + "EDITING_KEYFILE"); path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("%sEDITING_KEYFILE: %w", EnvPrefix, err)
		}
		// A file usually ends with a line break that is not part of the key.
		c.Editing.Key = strings.TrimSpace(string(data))
	}
	if v := getenv(EnvPrefix + "WEB_DEFAULTPREFERENCES"); v != "" {
		c.Web.DefaultPreferences = json.RawMessage(v)
	}
	if v := getenv(EnvPrefix + "FEDERATION_REMOTES"); v != "" {
		var remotes []Remote
		if err := json.Unmarshal([]byte(v), &remotes); err != nil {
			return fmt.Errorf("%sFEDERATION_REMOTES is not a JSON list of remotes: %w", EnvPrefix, err)
		}
		c.Federation.Remotes = remotes
	}
	lists := map[string]*[]string{
		"NAMESPACESELECTOR_MATCHNAMES": &c.NamespaceSelector.MatchNames,
		"SOURCES_INGRESS_CLASSNAMES":   &c.Sources.Ingress.ClassNames,
		"SOURCES_PRESETS":              &c.Sources.Presets,
	}
	for mode, palette := range map[string]*Palette{"LIGHT": &c.Web.Theme.Light, "DARK": &c.Web.Theme.Dark} {
		text["WEB_THEME_"+mode+"_BODYBGCOLOR"] = &palette.BodyBgColor
		text["WEB_THEME_"+mode+"_BODYCOLOR"] = &palette.BodyColor
		text["WEB_THEME_"+mode+"_EMPHASISCOLOR"] = &palette.EmphasisColor
		text["WEB_THEME_"+mode+"_TEXTPRIMARYCOLOR"] = &palette.TextPrimaryColor
		text["WEB_THEME_"+mode+"_TEXTACCENTCOLOR"] = &palette.TextAccentColor
	}
	for name, target := range text {
		if v := getenv(EnvPrefix + name); v != "" {
			*target = v
		}
	}
	for name, target := range flags {
		v := getenv(EnvPrefix + name)
		if v == "" {
			continue
		}
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			return fmt.Errorf("%s%s: %q is not true or false", EnvPrefix, name, v)
		}
		*target = parsed
	}
	for name, target := range lists {
		v := getenv(EnvPrefix + name)
		if v == "" {
			continue
		}
		*target = nil
		for _, item := range strings.Split(v, ",") {
			if item = strings.TrimSpace(item); item != "" {
				*target = append(*target, item)
			}
		}
	}
	if c.LeaderElection.Enabled && c.LeaderElection.AdvertiseURL == "" {
		if rawIP := getenv(EnvPrefix + "LEADERELECTION_PODIP"); rawIP != "" {
			ip := net.ParseIP(rawIP)
			if ip == nil {
				return errors.New("leader election pod address is not an IP address")
			}
			_, port, err := net.SplitHostPort(c.Server.Address)
			if err != nil {
				return fmt.Errorf("leader election needs a server address with a port: %w", err)
			}
			c.LeaderElection.AdvertiseURL = "http://" + net.JoinHostPort(ip.String(), port)
		}
	}
	return nil
}

// Validate reports the first setting that cannot be used.
func (c Config) Validate() error {
	if c.Workloads.ConsoleURL != "" {
		u, err := url.Parse(c.Workloads.ConsoleURL)
		if err != nil || !tile.ValidURL(c.Workloads.ConsoleURL) || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return errors.New("workloads.consoleURL must be an http or https base URL without credentials, query or fragment")
		}
	}
	if c.LeaderElection.Enabled {
		l := c.LeaderElection
		if l.LeaseName == "" || len(l.LeaseName) > 253 || !regexp.MustCompile(`^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$`).MatchString(l.LeaseName) {
			return errors.New("leaderElection.leaseName must be a Kubernetes resource name")
		}
		if l.Namespace != "" && (len(l.Namespace) > 63 || !regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`).MatchString(l.Namespace)) {
			return errors.New("leaderElection.namespace must be a Kubernetes namespace name")
		}
		u, err := url.Parse(l.AdvertiseURL)
		if err != nil || !tile.ValidURL(l.AdvertiseURL) || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return errors.New("leaderElection.advertiseURL must be a reachable http or https base URL without credentials, query or fragment")
		}
	}

	if p := c.Web.DefaultPreferences; len(p) > 0 {
		// What is in it is the page's to check. Here it only has to be
		// something the page can read, and of a size worth sending to
		// every browser.
		var object map[string]json.RawMessage
		if err := json.Unmarshal(p, &object); err != nil {
			return fmt.Errorf("web.defaultPreferences must be an object: %w", err)
		}
		if len(p) > maxDefaultPreferences {
			return fmt.Errorf("web.defaultPreferences is %d bytes; at most %d are allowed", len(p), maxDefaultPreferences)
		}
	}
	name := c.Cluster.Name
	if name == "" {
		return errors.New("cluster.name must not be empty")
	}
	if strings.ContainsAny(name, "/ \t\n") {
		// The name is one segment of the slash-separated tile id.
		return fmt.Errorf("cluster.name %q must not contain slashes or whitespace", name)
	}
	if key := c.Editing.Key; key != "" && len(key) < MinEditKeyLength {
		// The message must not repeat the key.
		return fmt.Errorf("the edit key must be at least %d characters long", MinEditKeyLength)
	}
	// Compiling them is the check: an expression that cannot be used is
	// found here, not when the first object arrives.
	if _, err := source.Configured(source.DefaultOptions(), c.Sources.Custom, c.Sources.Presets); err != nil {
		return err
	}
	if !c.NamespaceSelector.Any && len(c.NamespaceSelector.MatchNames) == 0 {
		return errors.New("namespaceSelector.matchNames must list a namespace when namespaceSelector.any is false")
	}
	for name, protocol := range map[string]string{
		"sources.httpRoute.defaultProtocol":      c.Sources.HTTPRoute.DefaultProtocol,
		"sources.virtualService.defaultProtocol": c.Sources.VirtualService.DefaultProtocol,
	} {
		if protocol != "http" && protocol != "https" {
			return fmt.Errorf("%s %q is not http or https", name, protocol)
		}
	}
	if !languageTag.MatchString(c.Web.DefaultLanguage) {
		return fmt.Errorf("web.defaultLanguage %q is not a language tag such as en-US", c.Web.DefaultLanguage)
	}
	if u, err := url.Parse(c.Web.SearchEngine); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return fmt.Errorf("web.searchEngine %q is not an http or https URL", c.Web.SearchEngine)
	}
	for mode, palette := range map[string]Palette{"light": c.Web.Theme.Light, "dark": c.Web.Theme.Dark} {
		for name, value := range map[string]string{
			"bodyBgColor": palette.BodyBgColor, "bodyColor": palette.BodyColor,
			"emphasisColor": palette.EmphasisColor, "textPrimaryColor": palette.TextPrimaryColor,
			"textAccentColor": palette.TextAccentColor,
		} {
			if !hexColor.MatchString(value) {
				return fmt.Errorf("web.theme.%s.%s %q is not a hex colour such as #1a2b3c", mode, name, value)
			}
		}
	}
	seen := map[string]bool{c.Cluster.Name: true}
	for i, r := range c.Federation.Remotes {
		if r.Name == "" || strings.ContainsAny(r.Name, "/ \t\n") {
			return fmt.Errorf("federation.remotes[%d].name %q must be set and must not contain slashes or whitespace", i, r.Name)
		}
		if seen[r.Name] {
			return fmt.Errorf("federation.remotes[%d].name %q is already the name of this cluster or of another remote", i, r.Name)
		}
		seen[r.Name] = true
		for which, selector := range map[string]Selector{"include": r.Include, "exclude": r.Exclude} {
			for _, pattern := range append(append([]string{}, selector.Names...), selector.Groups...) {
				if _, err := path.Match(strings.ToLower(pattern), ""); err != nil {
					return fmt.Errorf("federation.remotes[%d].%s: pattern %q cannot be read", i, which, pattern)
				}
			}
			for _, kind := range selector.Kinds {
				if kind != "application" && kind != "bookmark" {
					return fmt.Errorf("federation.remotes[%d].%s: kind %q is not application or bookmark", i, which, kind)
				}
			}
		}
		if u, err := url.Parse(r.URL); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return fmt.Errorf("federation.remotes[%d].url %q is not an http or https URL", i, r.URL)
		}
	}
	if u, err := url.Parse(c.Icons.Source); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return fmt.Errorf("icons.source %q is not an http or https URL", c.Icons.Source)
	}
	a := c.Availability
	if a.Interval <= 0 || a.Timeout <= 0 || a.InitialBackoff <= 0 || a.MaxBackoff < a.InitialBackoff {
		return errors.New("availability: interval, timeout and initialBackoff must be positive, " +
			"and maxBackoff at least initialBackoff")
	}
	if a.Concurrency < 1 {
		return errors.New("availability.concurrency must be at least 1")
	}
	if c.Upstream.URL != "" {
		u, err := url.Parse(c.Upstream.URL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return fmt.Errorf("upstream.url %q is not an http or https URL", c.Upstream.URL)
		}
	}
	if c.Server.Address == "" {
		return errors.New("server.address must not be empty")
	}
	switch c.Log.Level {
	case "debug", "info", "warn", "error":
	default:
		return fmt.Errorf("log.level %q is not one of debug, info, warn, error", c.Log.Level)
	}
	switch c.Log.Format {
	case "json", "text":
	default:
		return fmt.Errorf("log.format %q is not one of json, text", c.Log.Format)
	}
	return nil
}

// WithResources returns the configuration with the settings of a Startpunkt
// resource and the given remotes applied on top of it. spec is the JSON of
// the resource's spec; a setting it leaves out keeps the value it has here.
// A remote keeps the headers configured for its name, because resources do
// not carry secrets.
//
// The result is validated. On an error the receiver is still the
// configuration to use.
func (c Config) WithResources(spec []byte, remotes []Remote) (Config, error) {
	out := c
	// The sections are value types, but lists inside them are shared with
	// the receiver until they are replaced, which decoding does.
	if len(spec) > 0 {
		var settings apiv1.StartpunktSpec
		if err := json.Unmarshal(spec, &settings); err != nil {
			return c, fmt.Errorf("reading the settings: %w", err)
		}
		// Decode a second time onto the current values, so that a field
		// left out of a section that is present keeps its value too.
		// The default preferences are raw JSON, which decoding writes
		// into the memory it finds. Give it memory of its own, or the
		// receiver's would be written over.
		out.Web.DefaultPreferences = bytes.Clone(c.Web.DefaultPreferences)
		out.Sources.Presets = append([]string(nil), c.Sources.Presets...)
		if err := json.Unmarshal(spec, &out); err != nil {
			return c, fmt.Errorf("reading the settings: %w", err)
		}
		// Only the sections of the resource may come from it.
		out.Server, out.Upstream, out.Log, out.Federation, out.Resources, out.Editing = c.Server, c.Upstream, c.Log, c.Federation, c.Resources, c.Editing
		out.LeaderElection = c.LeaderElection
	}
	if remotes != nil {
		headers := map[string]map[string]string{}
		for _, r := range c.Federation.Remotes {
			headers[r.Name] = r.Headers
		}
		merged := make([]Remote, len(remotes))
		for i, r := range remotes {
			r.Headers = headers[r.Name]
			merged[i] = r
		}
		out.Federation.Remotes = merged
	}
	// An empty list in a resource means the same as none. Without this, a
	// resource that spells out the defaults would count as a change.
	if len(out.NamespaceSelector.MatchNames) == 0 {
		out.NamespaceSelector.MatchNames = c.NamespaceSelector.MatchNames
	}
	if len(out.Sources.Ingress.ClassNames) == 0 {
		out.Sources.Ingress.ClassNames = c.Sources.Ingress.ClassNames
	}
	if err := out.Validate(); err != nil {
		return c, err
	}
	return out, nil
}
