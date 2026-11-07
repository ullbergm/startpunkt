// Package config loads the process configuration: built-in defaults, then an
// optional YAML file, then environment variables. Every setting can be given
// through the environment alone.
package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"sigs.k8s.io/yaml"
)

// EnvPrefix starts the name of every environment variable read by Load.
const EnvPrefix = "STARTPUNKT_"

// Config is the full configuration.
type Config struct {
	Cluster           Cluster           `json:"cluster"`
	NamespaceSelector NamespaceSelector `json:"namespaceSelector"`
	Sources           Sources           `json:"sources"`
	Availability      Availability      `json:"availability"`
	Status            Status            `json:"status"`
	Server            Server            `json:"server"`
	Upstream          Upstream          `json:"upstream"`
	Web               Web               `json:"web"`
	Log               Log               `json:"log"`
}

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
	Application    Source        `json:"application"`
	Bookmark       Source        `json:"bookmark"`
	Route          Annotated     `json:"route"`
	Ingress        IngressSource `json:"ingress"`
	HTTPRoute      RoutedSource  `json:"httpRoute"`
	VirtualService RoutedSource  `json:"virtualService"`
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

// Status configures what is written back to the cluster.
type Status struct {
	// Enabled writes the resolved URL, the availability and conditions to
	// the status of Application resources.
	// Environment: STARTPUNKT_STATUS_ENABLED.
	Enabled bool `json:"enabled"`
}

// Upstream is where the api role reads its state from when the controller
// runs as a separate process.
type Upstream struct {
	// URL is the base URL of the controller, for example
	// http://startpunkt-controller:8080. Environment: STARTPUNKT_UPSTREAM_URL.
	URL string `json:"url"`
}

// Cluster describes the cluster this instance runs in.
type Cluster struct {
	// Name identifies this instance's tiles. It is part of every tile id.
	// Environment: STARTPUNKT_CLUSTER_NAME.
	Name string `json:"name"`
}

// Server configures the HTTP listener.
type Server struct {
	// Address to listen on. Environment: STARTPUNKT_SERVER_ADDRESS.
	Address string `json:"address"`
}

// Web holds settings passed on to the frontend.
type Web struct {
	// Title of the page. Environment: STARTPUNKT_WEB_TITLE.
	Title string `json:"title"`
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
		Server: Server{Address: ":8080"},
		Web:    Web{Title: "Startpunkt"},
		Log:    Log{Level: "info", Format: "json"},
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
	return cfg, cfg.validate()
}

// applyEnvironment overrides settings with the environment variables that
// are set.
func (c *Config) applyEnvironment(getenv func(string) string) error {
	text := map[string]*string{
		"CLUSTER_NAME":                           &c.Cluster.Name,
		"SERVER_ADDRESS":                         &c.Server.Address,
		"UPSTREAM_URL":                           &c.Upstream.URL,
		"WEB_TITLE":                              &c.Web.Title,
		"LOG_LEVEL":                              &c.Log.Level,
		"LOG_FORMAT":                             &c.Log.Format,
		"SOURCES_HTTPROUTE_DEFAULTPROTOCOL":      &c.Sources.HTTPRoute.DefaultProtocol,
		"SOURCES_VIRTUALSERVICE_DEFAULTPROTOCOL": &c.Sources.VirtualService.DefaultProtocol,
	}
	flags := map[string]*bool{
		"NAMESPACESELECTOR_ANY":                &c.NamespaceSelector.Any,
		"AVAILABILITY_ENABLED":                 &c.Availability.Enabled,
		"AVAILABILITY_INSECURESKIPVERIFY":      &c.Availability.InsecureSkipVerify,
		"STATUS_ENABLED":                       &c.Status.Enabled,
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
	lists := map[string]*[]string{
		"NAMESPACESELECTOR_MATCHNAMES": &c.NamespaceSelector.MatchNames,
		"SOURCES_INGRESS_CLASSNAMES":   &c.Sources.Ingress.ClassNames,
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
	return nil
}

func (c Config) validate() error {
	name := c.Cluster.Name
	if name == "" {
		return errors.New("cluster.name must not be empty")
	}
	if strings.ContainsAny(name, "/ \t\n") {
		// The name is one segment of the slash-separated tile id.
		return fmt.Errorf("cluster.name %q must not contain slashes or whitespace", name)
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
