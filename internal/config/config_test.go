package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(k string) string { return values[k] }
}

func TestDefaults(t *testing.T) {
	cfg, err := Load("", false, env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if cfg != Default() {
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
