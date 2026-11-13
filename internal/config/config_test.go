package config

import (
	"encoding/json"
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

func TestWebSettings(t *testing.T) {
	cfg, err := Load("", false, env(map[string]string{
		"STARTPUNKT_WEB_DEFAULTLANGUAGE":            "sv-SE",
		"STARTPUNKT_WEB_SEARCHENGINE":               "https://duckduckgo.com/?q=",
		"STARTPUNKT_WEB_THEME_DARK_TEXTACCENTCOLOR": "#abcdef",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Web.DefaultLanguage != "sv-SE" || cfg.Web.SearchEngine != "https://duckduckgo.com/?q=" ||
		cfg.Web.Theme.Dark.TextAccentColor != "#abcdef" || cfg.Web.Theme.Light.BodyBgColor != "#F8F6F1" {
		t.Errorf("got %+v", cfg.Web)
	}
	for want, values := range map[string]map[string]string{
		"defaultLanguage": {"STARTPUNKT_WEB_DEFAULTLANGUAGE": "Swedish!"},
		"searchEngine":    {"STARTPUNKT_WEB_SEARCHENGINE": "javascript:alert(1)//"},
		"bodyBgColor":     {"STARTPUNKT_WEB_THEME_LIGHT_BODYBGCOLOR": "red; background: url(x)"},
	} {
		if _, err := Load("", false, env(values)); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}

func TestFederationRemotes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	data := "federation:\n  remotes:\n    - name: prod\n      url: https://start.prod.example.com\n      headers: {X-Token: abc}\n      insecureSkipVerify: true\n"
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path, true, env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if r := cfg.Federation.Remotes; len(r) != 1 || r[0].Name != "prod" || r[0].URL != "https://start.prod.example.com" || r[0].Headers["X-Token"] != "abc" || !r[0].InsecureSkipVerify {
		t.Errorf("from file: %+v", r)
	}

	cfg, err = Load("", false, env(map[string]string{
		"STARTPUNKT_FEDERATION_REMOTES": `[{"name":"a","url":"http://a"},{"name":"b","url":"https://b"}]`,
	}))
	if err != nil || len(cfg.Federation.Remotes) != 2 || cfg.Federation.Remotes[1].Name != "b" {
		t.Errorf("from the environment: %+v, %v", cfg.Federation.Remotes, err)
	}

	for want, value := range map[string]string{
		"not a JSON list":  `{"name":"a"}`,
		"must be set":      `[{"url":"http://a"}]`,
		"slashes":          `[{"name":"a/b","url":"http://a"}]`,
		"already the name": `[{"name":"a","url":"http://a"},{"name":"a","url":"http://b"}]`,
		"of this cluster":  `[{"name":"local","url":"http://a"}]`,
		"http or https":    `[{"name":"a","url":"ftp://a"}]`,
	} {
		_, err := Load("", false, env(map[string]string{"STARTPUNKT_FEDERATION_REMOTES": value}))
		if err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}

func TestFederationFilters(t *testing.T) {
	cfg, err := Load("", false, env(map[string]string{
		"STARTPUNKT_FEDERATION_REMOTES": `[{"name":"a","url":"http://a","include":{"kinds":["application"],"groups":["media","home*"]},"exclude":{"tags":["private"],"names":["plex"]}}]`,
	}))
	if err != nil {
		t.Fatal(err)
	}
	r := cfg.Federation.Remotes[0]
	if len(r.Include.Groups) != 2 || r.Include.Kinds[0] != "application" || r.Exclude.Tags[0] != "private" || r.Exclude.Names[0] != "plex" {
		t.Errorf("remote = %+v", r)
	}
	for want, value := range map[string]string{
		"cannot be read":  `[{"name":"a","url":"http://a","include":{"names":["[a"]}}]`,
		"not application": `[{"name":"a","url":"http://a","exclude":{"kinds":["widget"]}}]`,
	} {
		if _, err := Load("", false, env(map[string]string{"STARTPUNKT_FEDERATION_REMOTES": value})); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
	}
}

func TestWithResources(t *testing.T) {
	base := Default()
	base.Web.Title = "From env"
	base.Server.Address = ":9999"
	base.Federation.Remotes = []Remote{{Name: "prod", URL: "http://old", Headers: map[string]string{"X-Token": "abc"}}}

	cfg, err := base.WithResources([]byte(`{
		"web": {"title": "From resource", "theme": {"dark": {"textAccentColor": "#abcdef"}}},
		"sources": {"ingress": {"onlyAnnotated": false}},
		"availability": {"interval": "30s"},
		"server": {"address": ":1"}
	}`), []Remote{{Name: "prod", URL: "https://new"}, {Name: "dev", URL: "https://dev"}})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Web.Title != "From resource" || cfg.Web.Theme.Dark.TextAccentColor != "#abcdef" {
		t.Errorf("web = %+v", cfg.Web)
	}
	// What a section leaves out keeps its value.
	if cfg.Web.SearchEngine != base.Web.SearchEngine || cfg.Web.Theme.Dark.BodyBgColor != base.Web.Theme.Dark.BodyBgColor ||
		cfg.Web.Theme.Light != base.Web.Theme.Light || !cfg.Sources.Ingress.Enabled || cfg.Sources.Ingress.OnlyAnnotated ||
		!cfg.Sources.Route.OnlyAnnotated || time.Duration(cfg.Availability.Interval) != 30*time.Second ||
		cfg.Availability.Timeout != base.Availability.Timeout {
		t.Errorf("defaults were lost: %+v", cfg)
	}
	// Settings of the process itself cannot come from the resource.
	if cfg.Server.Address != ":9999" {
		t.Errorf("server.address = %q", cfg.Server.Address)
	}
	// Remotes come from the list, and keep the headers configured by name.
	r := cfg.Federation.Remotes
	if len(r) != 2 || r[0].URL != "https://new" || r[0].Headers["X-Token"] != "abc" || r[1].Headers != nil {
		t.Errorf("remotes = %+v", r)
	}
	if base.Web.Title != "From env" || base.Federation.Remotes[0].URL != "http://old" {
		t.Error("the configuration it is applied to must not change")
	}

	// A resource that spells out the defaults changes nothing.
	spelled, err := Default().WithResources([]byte(`{"namespaceSelector":{"any":true,"matchNames":[]},"sources":{"ingress":{"classNames":[]}}}`), nil)
	if err != nil || !reflect.DeepEqual(spelled, Default()) {
		t.Errorf("defaults spelled out: %v", err)
	}

	// No resource and no remotes given: unchanged.
	same, err := base.WithResources(nil, nil)
	if err != nil || !reflect.DeepEqual(same, base) {
		t.Errorf("nothing applied: %+v, %v", same, err)
	}
	// An empty list of remotes removes them.
	none, _ := base.WithResources(nil, []Remote{})
	if len(none.Federation.Remotes) != 0 {
		t.Errorf("remotes = %+v", none.Federation.Remotes)
	}

	for want, spec := range map[string]string{
		"textAccentColor": `{"web": {"theme": {"dark": {"textAccentColor": "red"}}}}`,
		"availability":    `{"availability": {"timeout": "0s"}}`,
		"reading":         `{"availability": {"interval": 60}}`,
	} {
		got, err := base.WithResources([]byte(spec), nil)
		if err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: got error %v", want, err)
		}
		if !reflect.DeepEqual(got, base) {
			t.Errorf("%s: an invalid resource must leave the configuration as it was", want)
		}
	}
	if _, err := base.WithResources(nil, []Remote{{Name: "local", URL: "http://x"}}); err == nil {
		t.Error("a remote named like this cluster must be refused")
	}
}

func TestEditKey(t *testing.T) {
	cfg, err := Load("", false, env(nil))
	if err != nil || cfg.Editing.Key != "" {
		t.Fatalf("without a key editing is off: %q, %v", cfg.Editing.Key, err)
	}
	cfg, err = Load("", false, env(map[string]string{"STARTPUNKT_EDITING_KEY": "a key that is long enough", "STARTPUNKT_EDITING_NAMESPACE": "tiles"}))
	if err != nil || cfg.Editing.Key != "a key that is long enough" || cfg.Editing.Namespace != "tiles" {
		t.Errorf("from the environment: %+v, %v", cfg.Editing, err)
	}

	// From a file, as a mounted Secret gives it, without the line break.
	path := filepath.Join(t.TempDir(), "key")
	if err := os.WriteFile(path, []byte("a key from a mounted secret\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err = Load("", false, env(map[string]string{"STARTPUNKT_EDITING_KEYFILE": path}))
	if err != nil || cfg.Editing.Key != "a key from a mounted secret" {
		t.Errorf("from a file: %q, %v", cfg.Editing.Key, err)
	}
	if _, err := Load("", false, env(map[string]string{"STARTPUNKT_EDITING_KEYFILE": path + ".missing"})); err == nil {
		t.Error("a key file that is not there must be an error, not editing without a key")
	}

	// A short key is refused, and the message does not repeat it.
	_, err = Load("", false, env(map[string]string{"STARTPUNKT_EDITING_KEY": "hunter2"}))
	if err == nil || strings.Contains(err.Error(), "hunter2") {
		t.Errorf("short key: %v", err)
	}

	// The key never leaves with the configuration, and settings from a
	// resource cannot set or clear it.
	cfg, _ = Load("", false, env(map[string]string{"STARTPUNKT_EDITING_KEY": "a key that is long enough"}))
	if data, _ := json.Marshal(cfg); strings.Contains(string(data), "long enough") {
		t.Errorf("the key is in the written configuration: %s", data)
	}
	with, err := cfg.WithResources([]byte(`{"web":{"title":"x"}}`), nil)
	if err != nil || with.Editing.Key != cfg.Editing.Key {
		t.Errorf("after applying a resource: %q, %v", with.Editing.Key, err)
	}
}

func TestDefaultPreferences(t *testing.T) {
	// From the environment, as JSON.
	cfg, err := Load("", false, env(map[string]string{
		"STARTPUNKT_WEB_DEFAULTPREFERENCES": `{"theme":"dark","layout":{"columns":4}}`,
	}))
	if err != nil || string(cfg.Web.DefaultPreferences) != `{"theme":"dark","layout":{"columns":4}}` {
		t.Fatalf("from the environment: %s, %v", cfg.Web.DefaultPreferences, err)
	}
	// From the file, whatever fields the page knows.
	path := filepath.Join(t.TempDir(), "config.yaml")
	data := "web:\n  defaultPreferences:\n    theme: light\n    background: {type: gradient, color: \"#112233\"}\n    somethingNew: true\n"
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg, err = Load(path, true, env(nil))
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(cfg.Web.DefaultPreferences, &got); err != nil || got["theme"] != "light" || got["somethingNew"] != true {
		t.Errorf("from the file: %s, %v", cfg.Web.DefaultPreferences, err)
	}
	// The resource replaces them as a whole.
	merged, err := cfg.WithResources([]byte(`{"web": {"defaultPreferences": {"theme": "dark"}}}`), nil)
	if err != nil || string(merged.Web.DefaultPreferences) != `{"theme": "dark"}` {
		t.Errorf("from the resource: %s, %v", merged.Web.DefaultPreferences, err)
	}
	kept, err := cfg.WithResources([]byte(`{"web": {"title": "Other"}}`), nil)
	if err != nil || string(kept.Web.DefaultPreferences) != string(cfg.Web.DefaultPreferences) {
		t.Errorf("a resource without them: %s, %v", kept.Web.DefaultPreferences, err)
	}
	// Only an object, and not a large one.
	for name, value := range map[string]string{
		"a list":    `["dark"]`,
		"text":      `"dark"`,
		"not JSON":  `{theme: dark`,
		"too large": `{"x":"` + strings.Repeat("a", 40<<10) + `"}`,
	} {
		if _, err := Load("", false, env(map[string]string{"STARTPUNKT_WEB_DEFAULTPREFERENCES": value})); err == nil ||
			!strings.Contains(err.Error(), "defaultPreferences") {
			t.Errorf("%s: got error %v", name, err)
		}
	}
}
