// Package config loads the process configuration: built-in defaults, then an
// optional YAML file, then environment variables. Every setting can be given
// through the environment alone.
package config

import (
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"strings"

	"sigs.k8s.io/yaml"
)

// EnvPrefix starts the name of every environment variable read by Load.
const EnvPrefix = "STARTPUNKT_"

// Config is the full configuration.
type Config struct {
	Cluster  Cluster  `json:"cluster"`
	Server   Server   `json:"server"`
	Upstream Upstream `json:"upstream"`
	Web      Web      `json:"web"`
	Log      Log      `json:"log"`
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
		Cluster: Cluster{Name: "local"},
		Server:  Server{Address: ":8080"},
		Web:     Web{Title: "Startpunkt"},
		Log:     Log{Level: "info", Format: "json"},
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
	for name, target := range map[string]*string{
		"CLUSTER_NAME":   &cfg.Cluster.Name,
		"SERVER_ADDRESS": &cfg.Server.Address,
		"UPSTREAM_URL":   &cfg.Upstream.URL,
		"WEB_TITLE":      &cfg.Web.Title,
		"LOG_LEVEL":      &cfg.Log.Level,
		"LOG_FORMAT":     &cfg.Log.Format,
	} {
		if v := getenv(EnvPrefix + name); v != "" {
			*target = v
		}
	}
	return cfg, cfg.validate()
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
