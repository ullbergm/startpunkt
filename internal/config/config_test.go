package config

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func env(values map[string]string) func(string) string {
	return func(k string) string { return values[k] }
}

func TestDefaults(t *testing.T) {
	cfg, err := Load("", false, env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(cfg, Default()) {
		t.Errorf("got %+v", cfg)
	}
}

func TestFileThenEnvironment(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	if err := os.WriteFile(path, []byte("cluster:\n  name: prod\nweb:\n  title: From file\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path, true, env(map[string]string{
		"STARTPUNKT_WEB_TITLE":    "From env",
		"STARTPUNKT_UPSTREAM_URL": "http://controller:8080",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Cluster.Name != "prod" || cfg.Web.Title != "From env" ||
		cfg.Upstream.URL != "http://controller:8080" || cfg.Server.Address != ":8080" {
		t.Errorf("got %+v", cfg)
	}
}

func TestMissingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "absent.yaml")
	if _, err := Load(path, false, env(nil)); err != nil {
		t.Errorf("an optional file may be absent: %v", err)
	}
	if _, err := Load(path, true, env(nil)); err == nil {
		t.Error("a required file must exist")
	}
}

func TestRejects(t *testing.T) {
	cases := map[string]map[string]string{
		"cluster.name": {"STARTPUNKT_CLUSTER_NAME": "a/b"},
		"log.level":    {"STARTPUNKT_LOG_LEVEL": "loud"},
		"log.format":   {"STARTPUNKT_LOG_FORMAT": "xml"},
		"upstream.url": {"STARTPUNKT_UPSTREAM_URL": "controller:8080"},
	}
	for want, values := range cases {
		if _, err := Load("", false, env(values)); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}

func TestUnknownKeyIsAnError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	if err := os.WriteFile(path, []byte("clutser:\n  name: prod\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(path, true, env(nil)); err == nil {
		t.Error("a misspelled key must be reported")
	}
}

func TestSourcesFromFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	data := `
namespaceSelector:
  any: false
  matchNames: [media, tools]
sources:
  bookmark: {enabled: false}
  route: {onlyAnnotated: false}
  ingress:
    onlyAnnotated: false
    classNames: [nginx]
    includeUnclassified: false
  httpRoute: {defaultProtocol: https}
`
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path, true, env(nil))
	if err != nil {
		t.Fatal(err)
	}
	src := cfg.Sources
	if src.Bookmark.Enabled || !src.Application.Enabled || src.Route.OnlyAnnotated || !src.Route.Enabled ||
		src.Ingress.OnlyAnnotated || !src.Ingress.Enabled || src.Ingress.IncludeUnclassified ||
		!reflect.DeepEqual(src.Ingress.ClassNames, []string{"nginx"}) ||
		src.HTTPRoute.DefaultProtocol != "https" || !src.HTTPRoute.OnlyAnnotated ||
		src.VirtualService.DefaultProtocol != "http" {
		t.Errorf("sources = %+v", src)
	}
	if got := cfg.NamespaceSelector.Namespaces(); !reflect.DeepEqual(got, []string{"media", "tools"}) {
		t.Errorf("namespaces = %v", got)
	}
}

func TestSourcesFromEnvironment(t *testing.T) {
	cfg, err := Load("", false, env(map[string]string{
		"STARTPUNKT_NAMESPACESELECTOR_ANY":             "false",
		"STARTPUNKT_NAMESPACESELECTOR_MATCHNAMES":      "media, tools,",
		"STARTPUNKT_SOURCES_ROUTE_ONLYANNOTATED":       "false",
		"STARTPUNKT_SOURCES_VIRTUALSERVICE_ENABLED":    "false",
		"STARTPUNKT_SOURCES_INGRESS_CLASSNAMES":        "nginx,traefik",
		"STARTPUNKT_SOURCES_HTTPROUTE_DEFAULTPROTOCOL": "https",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Sources.Route.OnlyAnnotated || cfg.Sources.VirtualService.Enabled ||
		!reflect.DeepEqual(cfg.Sources.Ingress.ClassNames, []string{"nginx", "traefik"}) ||
		cfg.Sources.HTTPRoute.DefaultProtocol != "https" ||
		!reflect.DeepEqual(cfg.NamespaceSelector.Namespaces(), []string{"media", "tools"}) {
		t.Errorf("got %+v", cfg)
	}
	if cfg.NamespaceSelector.Namespaces() == nil || Default().NamespaceSelector.Namespaces() != nil {
		t.Error("the default must select every namespace")
	}
}

func TestRejectsSourceSettings(t *testing.T) {
	cases := map[string]map[string]string{
		"matchNames":        {"STARTPUNKT_NAMESPACESELECTOR_ANY": "false"},
		"not true or false": {"STARTPUNKT_SOURCES_ROUTE_ENABLED": "yes please"},
		"defaultProtocol":   {"STARTPUNKT_SOURCES_HTTPROUTE_DEFAULTPROTOCOL": "gopher"},
	}
	for want, values := range cases {
		if _, err := Load("", false, env(values)); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}

func TestAvailability(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	data := "availability:\n  interval: 30s\n  insecureSkipVerify: true\nstatus:\n  enabled: false\n"
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path, true, env(map[string]string{
		"STARTPUNKT_AVAILABILITY_TIMEOUT":     "2s",
		"STARTPUNKT_AVAILABILITY_CONCURRENCY": "4",
	}))
	if err != nil {
		t.Fatal(err)
	}
	a := cfg.Availability
	if !a.Enabled || time.Duration(a.Interval) != 30*time.Second || time.Duration(a.Timeout) != 2*time.Second ||
		time.Duration(a.MaxBackoff) != 5*time.Minute || a.Concurrency != 4 || !a.InsecureSkipVerify ||
		cfg.Status.Enabled {
		t.Errorf("got %+v, status %+v", a, cfg.Status)
	}
	for want, values := range map[string]map[string]string{
		"not a duration":   {"STARTPUNKT_AVAILABILITY_INTERVAL": "60"},
		"must be positive": {"STARTPUNKT_AVAILABILITY_TIMEOUT": "0s"},
		"maxBackoff":       {"STARTPUNKT_AVAILABILITY_MAXBACKOFF": "1s"},
		"concurrency":      {"STARTPUNKT_AVAILABILITY_CONCURRENCY": "0"},
	} {
		if _, err := Load("", false, env(values)); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}
